# D:/SWP391/SWP391/ai_service/core/meal_chat.py
"""Định dạng thực đơn cho khung chat của frontend: bubble { title, text, items[], footer }."""

from pydantic import Field

from agents.meal_planner_agent import DailyMealPlan, GeneratedMealPlan
from schemas.base import CamelModel

DISCLAIMER = "Thực đơn mang tính tham khảo, không thay thế tư vấn của bác sĩ hoặc chuyên gia dinh dưỡng."


class ChatBubble(CamelModel):
    """Cùng cấu trúc với tin nhắn trợ lý trong ChatBox.jsx."""
    title: str
    text: str
    items: list[str] = Field(default_factory=list)
    footer: str | None = None


def _day_line(day: DailyMealPlan) -> str:
    meals = [day.breakfast, day.lunch, day.dinner] + ([day.snacks] if day.snacks else [])
    kcal = sum(m.estimated_calories for m in meals)
    return f"{day.day}: {day.breakfast.name} · {day.lunch.name} · {day.dinner.name} (~{kcal} kcal)"


def plan_to_chat_bubble(plan: GeneratedMealPlan) -> ChatBubble:
    """Thực đơn gọn cho một bubble chat: mỗi ngày một dòng, chi tiết đầy đủ nằm ở phần dữ liệu."""
    profile = plan.profile_summary
    tips = plan.nutritionist_tips[:1]
    return ChatBubble(
        title=plan.title,
        text=(
            f"Mục tiêu khoảng {profile.target_daily_calories} kcal/ngày "
            f"(BMI {profile.bmi}, {profile.bmi_category}). {plan.summary}"
        ),
        items=[_day_line(day) for day in plan.weekly_plan],
        footer=" ".join([*tips, DISCLAIMER]),
    )
