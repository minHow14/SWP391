# D:/SWP391/SWP391/ai_service/core/meal_chat.py
"""Định dạng thực đơn cho khung chat của frontend: bubble { title, text, items[], footer }."""

# Chuyển thực đơn đã sinh thành một bubble chat gọn để hiển thị ở khung chat.
from pydantic import Field

from agents.meal_planner_agent import DailyMealPlan, GeneratedMealPlan
from schemas.base import CamelModel

# Lời miễn trừ trách nhiệm luôn hiển thị ở cuối bubble thực đơn.
DISCLAIMER = "Thực đơn mang tính tham khảo, không thay thế tư vấn của bác sĩ hoặc chuyên gia dinh dưỡng."


# Schema bubble chat trả về frontend.
class ChatBubble(CamelModel):
    """Cùng cấu trúc với tin nhắn trợ lý trong ChatBox.jsx."""
    title: str
    text: str
    items: list[str] = Field(default_factory=list)
    footer: str | None = None


# Tạo một dòng tóm tắt cho một ngày: tên ba bữa chính và tổng calo ước tính (gồm cả bữa phụ nếu có).
def _day_line(day: DailyMealPlan) -> str:
    meals = [day.breakfast, day.lunch, day.dinner] + ([day.snacks] if day.snacks else [])
    kcal = sum(m.estimated_calories for m in meals)
    return f"{day.day}: {day.breakfast.name} · {day.lunch.name} · {day.dinner.name} (~{kcal} kcal)"


# Chuyển GeneratedMealPlan thành ChatBubble hiển thị ở khung chat.
def plan_to_chat_bubble(plan: GeneratedMealPlan) -> ChatBubble:
    """Thực đơn gọn cho một bubble chat: mỗi ngày một dòng, chi tiết đầy đủ nằm ở phần dữ liệu."""
    profile = plan.profile_summary
    # Chỉ lấy một lời khuyên đầu tiên để bubble không quá dài.
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
