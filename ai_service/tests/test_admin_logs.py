from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, insert

from core.database import ai_log, run_with_fallback
from main import app

client = TestClient(app)
ADMIN = {"X-User-Id": "1", "X-User-Role": "ADMIN"}

# (created_at, model, action, status, error)
ROWS = [
    (datetime(2026, 10, 1, 9, 0), "deepseek-chat", "CHAT_GUEST", "SUCCESS", None),
    (datetime(2026, 10, 1, 9, 5), "deepseek-chat", "CHAT_USER_5", "SUCCESS", None),
    (datetime(2026, 10, 2, 10, 0), "deepseek-chat", "CHAT_ERROR", "ERROR", "timeout from provider"),
    (datetime(2026, 10, 2, 23, 59), "deepseek-chat", "MEAL_PLANNER_USER_5", "SUCCESS", None),
    (datetime(2026, 10, 3, 8, 0), "deepseek-chat", "MEAL_PLANNER_ERROR", "ERROR", "invalid api key"),
    (datetime(2026, 10, 3, 8, 30), "other-model", "CHAT_STREAM_GUEST", "SUCCESS", None),
]


@pytest.fixture(autouse=True)
def seeded_logs():
    def seed(conn):
        conn.execute(delete(ai_log))
        conn.execute(
            insert(ai_log),
            [
                dict(created_at=at, model_name=model, action=action, status=status, error_feedback=error)
                for at, model, action, status, error in ROWS
            ],
        )

    run_with_fallback(seed)
    yield
    run_with_fallback(lambda conn: conn.execute(delete(ai_log)))


def get(path, headers=ADMIN, **params):
    return client.get(f"/api/admin/ai-logs{path}", params=params, headers=headers)


def test_only_admins_can_read_logs():
    assert get("", headers={}).status_code == 401
    assert get("", headers={"X-Guest-Id": "g1"}).status_code == 401
    forbidden = get("", headers={"X-User-Id": "7", "X-User-Role": "USER"})
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "FORBIDDEN"
    assert get("/stats", headers={"X-User-Id": "7", "X-User-Role": "USER"}).status_code == 403
    for role in ("1", "admin", "Administrator"):
        assert get("", headers={"X-User-Id": "2", "X-User-Role": role}).status_code == 200


def test_list_is_newest_first_with_pagination_and_envelope():
    res = get("", page_size=4)
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True and body["meta"]["requestId"].startswith("req_")
    data = body["data"]
    assert (data["total"], data["page"], data["page_size"], data["total_pages"]) == (6, 1, 4, 2)
    assert [item["action"] for item in data["items"]] == [
        "CHAT_STREAM_GUEST", "MEAL_PLANNER_ERROR", "MEAL_PLANNER_USER_5", "CHAT_ERROR",
    ]
    assert set(data["items"][0]) == {"log_id", "model_name", "action", "status", "error_feedback", "created_at"}

    page2 = get("", page_size=4, page=2).json()["data"]
    assert [item["action"] for item in page2["items"]] == ["CHAT_USER_5", "CHAT_GUEST"]
    assert get("", page=99).json()["data"]["items"] == []


def test_filter_by_date_range_is_inclusive_of_the_whole_end_day():
    res = get("", date_from="2026-10-02", date_to="2026-10-02").json()["data"]
    assert res["total"] == 2  # có cả bản ghi 23:59
    assert get("", date_from="2026-10-03").json()["data"]["total"] == 2
    assert get("", date_to="2026-10-01").json()["data"]["total"] == 2
    assert get("", date_from="2026-11-01").json()["data"]["total"] == 0


def test_filter_by_status_feature_model_and_search():
    assert get("", status="ERROR").json()["data"]["total"] == 2
    assert get("", feature="meal_planner").json()["data"]["total"] == 2
    assert get("", feature="chatbot").json()["data"]["total"] == 4
    assert get("", model_name="other-model").json()["data"]["total"] == 1
    found = get("", search="api key").json()["data"]
    assert [item["action"] for item in found["items"]] == ["MEAL_PLANNER_ERROR"]
    both = get("", status="ERROR", feature="chatbot").json()["data"]
    assert [item["action"] for item in both["items"]] == ["CHAT_ERROR"]


def test_invalid_filters_return_400_or_422():
    res = get("", date_from="2026-10-05", date_to="2026-10-01")
    assert res.status_code == 400 and res.json()["error"]["code"] == "INVALID_INPUT"
    assert get("", status="MAYBE").status_code == 422
    assert get("", page_size=1000).status_code == 422
    assert get("", date_from="not-a-date").status_code == 422
    assert get("/stats", date_from="2026-10-05", date_to="2026-10-01").status_code == 400


def test_stats_report_success_rate_overall_and_per_group():
    data = get("/stats").json()["data"]
    assert (data["total"], data["success"], data["error"], data["success_rate"]) == (6, 4, 2, 66.7)

    features = {f["feature"]: f for f in data["by_feature"]}
    assert (features["chatbot"]["total"], features["chatbot"]["error"], features["chatbot"]["success_rate"]) == (4, 1, 75.0)
    assert (features["meal_planner"]["total"], features["meal_planner"]["success_rate"]) == (2, 50.0)

    models = {m["model_name"]: m for m in data["by_model"]}
    assert models["deepseek-chat"]["total"] == 5 and models["other-model"]["success_rate"] == 100.0

    assert [(d["date"], d["total"], d["error"]) for d in data["by_day"]] == [
        ("2026-10-01", 2, 0), ("2026-10-02", 2, 1), ("2026-10-03", 2, 1),
    ]


def test_stats_respect_the_date_range_and_handle_empty_data():
    ranged = get("/stats", date_from="2026-10-02", date_to="2026-10-02").json()["data"]
    assert (ranged["total"], ranged["error"], ranged["success_rate"]) == (2, 1, 50.0)
    assert ranged["date_from"] == "2026-10-02"

    empty = get("/stats", date_from="2027-01-01").json()["data"]
    assert (empty["total"], empty["success_rate"], empty["by_day"], empty["by_feature"]) == (0, None, [], [])


def test_queries_run_on_the_primary_database_without_silent_fallback():
    from core import database

    get("")
    get("/stats")
    get("", status="ERROR", feature="chatbot", search="timeout", date_from="2026-10-01")
    # Nếu truy vấn lỗi trên PostgreSQL, run_with_fallback sẽ tạm chuyển sang SQLite và đặt mốc này
    assert database._primary_disabled_until == 0.0
