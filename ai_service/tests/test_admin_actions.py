from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from agents.chatbot_agent import ChatbotAgent, chatbot_agent
from core.database import ai_log, run_with_fallback
from core.security import reset_guest_usage_for_tests
from main import app

client = TestClient(app)
ADMIN = {"X-User-Id": "9", "X-User-Role": "ADMIN"}
USER = {"X-User-Id": "7", "X-User-Role": "USER"}


@pytest.fixture(autouse=True)
def clean():
    reset_guest_usage_for_tests()
    chatbot_agent.clear_cache()
    run_with_fallback(lambda conn: conn.execute(delete(ai_log)))
    yield
    reset_guest_usage_for_tests()
    chatbot_agent.clear_cache()
    run_with_fallback(lambda conn: conn.execute(delete(ai_log)))


def audit_actions() -> list[str]:
    rows = run_with_fallback(lambda conn: conn.execute(select(ai_log.c.action)).all())
    return [row.action for row in rows]


def use_up_quota(guest: str):
    with patch("api.chat.chatbot_agent.answer", new_callable=AsyncMock) as answer:
        answer.return_value = "ok"
        for i in range(3):
            assert client.post("/api/chat", json={"message": f"Q{i}"}, headers={"X-Guest-Id": guest}).status_code == 200
        assert client.post("/api/chat", json={"message": "Q4"}, headers={"X-Guest-Id": guest}).status_code == 429


def test_all_actions_are_admin_only():
    calls = [
        ("GET", "/api/admin/guest-quota/g1", None),
        ("POST", "/api/admin/guest-quota/reset", {"guest_id": "g1"}),
        ("POST", "/api/admin/chatbot-cache/clear", None),
    ]
    for method, path, body in calls:
        assert client.request(method, path, json=body).status_code == 401, path
        assert client.request(method, path, json=body, headers=USER).status_code == 403, path


def test_admin_can_view_a_guest_quota():
    use_up_quota("viewed-guest")
    res = client.get("/api/admin/guest-quota/viewed-guest", headers=ADMIN)
    assert res.status_code == 200
    data = res.json()["data"]
    assert (data["guest_id"], data["daily_limit"], data["used"], data["remaining"]) == ("viewed-guest", 3, 3, 0)
    assert data["resets_at"].endswith("+07:00")
    assert res.json()["meta"]["requestId"].startswith("req_")


def test_reset_gives_a_blocked_guest_a_fresh_quota():
    use_up_quota("blocked-guest")
    res = client.post("/api/admin/guest-quota/reset", json={"guest_id": "blocked-guest"}, headers=ADMIN)
    assert res.status_code == 200
    data = res.json()["data"]
    assert (data["used_before"], data["used"], data["remaining"]) == (3, 0, 3)

    with patch("api.chat.chatbot_agent.answer", new_callable=AsyncMock) as answer:
        answer.return_value = "ok"
        again = client.post("/api/chat", json={"message": "lại"}, headers={"X-Guest-Id": "blocked-guest"})
    assert again.status_code == 200 and again.json()["data"]["remaining_questions"] == 2


def test_reset_only_affects_the_chosen_guest_and_unknown_guest_is_harmless():
    use_up_quota("guest-a")
    use_up_quota("guest-b")
    client.post("/api/admin/guest-quota/reset", json={"guest_id": "guest-a"}, headers=ADMIN)
    assert client.get("/api/admin/guest-quota/guest-b", headers=ADMIN).json()["data"]["used"] == 3
    unknown = client.post("/api/admin/guest-quota/reset", json={"guest_id": "never-seen"}, headers=ADMIN)
    assert unknown.status_code == 200 and unknown.json()["data"]["used_before"] == 0


def test_reset_validates_guest_id():
    for body in ({}, {"guest_id": ""}, {"guest_id": "g" * 101}):
        assert client.post("/api/admin/guest-quota/reset", json=body, headers=ADMIN).status_code == 422


@pytest.mark.asyncio
async def test_clearing_the_cache_forces_a_fresh_llm_answer():
    from unittest.mock import patch as patch_

    agent = ChatbotAgent()
    with patch_("agents.chatbot_agent.get_llm_text") as get_llm:
        llm = AsyncMock()
        llm.ainvoke.return_value.content = "câu trả lời"
        get_llm.return_value = llm
        await agent.answer("Đậu gà có gì?")
        await agent.answer("Đậu gà có gì?")
        assert llm.ainvoke.call_count == 1  # lần hai lấy từ cache
        assert agent.clear_cache() == 1
        await agent.answer("Đậu gà có gì?")
        assert llm.ainvoke.call_count == 2


def test_clear_cache_endpoint_reports_how_many_answers_were_removed():
    chatbot_agent._cache[("câu hỏi 1", "")] = "a"
    chatbot_agent._cache[("câu hỏi 2", "")] = "b"
    res = client.post("/api/admin/chatbot-cache/clear", headers=ADMIN)
    assert res.status_code == 200 and res.json()["data"]["cleared"] == 2
    assert len(chatbot_agent._cache) == 0


def test_interventions_are_recorded_in_the_ai_log_with_the_admin_id():
    use_up_quota("audited-guest")
    run_with_fallback(lambda conn: conn.execute(delete(ai_log)))
    client.post("/api/admin/guest-quota/reset", json={"guest_id": "audited-guest"}, headers=ADMIN)
    client.post("/api/admin/chatbot-cache/clear", headers=ADMIN)
    assert audit_actions() == [
        "ADMIN_RESET_GUEST_QUOTA_audited-guest_BY_9",
        "ADMIN_CLEAR_CHATBOT_CACHE_BY_9",
    ]
    models = run_with_fallback(lambda conn: conn.execute(select(ai_log.c.model_name)).all())
    assert {row.model_name for row in models} == {"admin"}


def test_audit_of_a_long_guest_id_is_still_recorded_within_100_characters():
    long_id = "g" * 100
    client.post("/api/admin/guest-quota/reset", json={"guest_id": long_id}, headers=ADMIN)
    actions = audit_actions()
    assert len(actions) == 1 and len(actions[0]) == 100 and actions[0].startswith("ADMIN_RESET_GUEST_QUOTA_")
