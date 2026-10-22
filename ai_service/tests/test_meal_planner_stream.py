# ai_service/tests/test_meal_planner_stream.py
import json
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

from core.config import settings
from main import app
from agents.meal_planner_agent import MealPlannerAgent
from tests.test_meal_planner_agent import make_plan, mock_llm
from tests.test_meal_planner import sample_meal_plan

client = TestClient(app)
INTERNAL_HEADERS = {"X-Internal-Api-Key": settings.INTERNAL_API_KEY}
PAYLOAD = {"height_cm": 165, "weight_kg": 55, "days": 1}


def parse_sse(text: str) -> list[tuple[str, dict]]:
    events, name = [], None
    for line in text.splitlines():
        if line.startswith("event:"):
            name = line.split(":", 1)[1].strip()
        elif line.startswith("data:") and name:
            events.append((name, json.loads(line.split(":", 1)[1])))
            name = None
    return events


def fake_generate(plan, stages=("calculating", "generating", "validating")):
    async def generate(*args, on_progress=None, **kwargs):
        for stage in stages:
            await on_progress({"stage": stage, "message": f"msg {stage}"})
        return plan

    return generate


@patch("api.meal_planner.meal_planner_agent.generate_plan")
def test_stream_sends_progress_then_done_with_the_full_plan(mock_generate):
    mock_generate.side_effect = fake_generate(sample_meal_plan())
    res = client.post("/api/meal-planner/generate/stream", json=PAYLOAD, headers=INTERNAL_HEADERS)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/event-stream")

    events = parse_sse(res.text)
    assert [name for name, _ in events] == ["progress", "progress", "progress", "done"]
    assert [body["data"]["stage"] for name, body in events if name == "progress"] == [
        "calculating", "generating", "validating",
    ]
    name, done = events[-1]
    assert done["success"] is True
    assert done["meta"]["requestId"].startswith("req_")
    assert done["data"]["weekly_plan"]


@patch("api.meal_planner.meal_planner_agent.generate_plan")
def test_stream_error_event_when_generation_fails(mock_generate):
    async def failing(*args, on_progress=None, **kwargs):
        await on_progress({"stage": "generating", "message": "Đang tạo thực đơn..."})
        raise RuntimeError("provider exploded")

    mock_generate.side_effect = failing
    res = client.post("/api/meal-planner/generate/stream", json=PAYLOAD, headers=INTERNAL_HEADERS)
    events = parse_sse(res.text)
    assert [name for name, _ in events] == ["progress", "error"]
    error = events[-1][1]
    assert error["success"] is False
    assert error["error"]["code"] == "AI_PROVIDER_ERROR"
    assert "provider exploded" not in res.text


def test_stream_validation_error_before_stream():
    invalid = client.post(
        "/api/meal-planner/generate/stream",
        json={"height_cm": 10, "weight_kg": 60},
        headers=INTERNAL_HEADERS,
    )
    assert invalid.status_code == 422


@pytest.mark.asyncio
async def test_agent_reports_each_stage_and_the_retry():
    events = []

    async def on_progress(event):
        events.append(event["stage"])

    bad = make_plan(1, lunch_name="Cơm chiên trứng", lunch_ingredients=["Trứng gà 1 quả"])
    patcher, structured = mock_llm([bad, make_plan(1)])
    with patcher:
        await MealPlannerAgent().generate_plan(
            height_cm=165, weight_kg=55, age=25, gender="female", goal="maintenance",
            activity_level="light", dietary_type="vegan", days=1, on_progress=on_progress,
        )
    assert events == [
        "calculating",
        "generating", "validating", "retrying",
        "generating", "validating",
    ]
