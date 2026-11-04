# D:/SWP391/SWP391/ai_service/core/dietary.py
from typing import Literal

DietaryType = Literal[
    "vegan", "lacto", "ovo", "lacto_ovo", "buddhist", "keto", "eat_clean"
]
DIET_TYPE_BY_ID = {
    1: "vegan",
    2: "lacto",
    3: "ovo",
    4: "lacto_ovo",
    5: "buddhist",
    6: "keto",
    7: "eat_clean",
}
KETO_NET_CARBS_LIMIT_G = 50
DIETARY_RULES: dict[str, str] = {
    "vegan": "Thuần chay: thực vật, không trứng, sữa động vật, mật ong hay phụ phẩm động vật.",
    "lacto": "Chay có sữa: được dùng sữa, không dùng trứng.",
    "ovo": "Chay có trứng: được dùng trứng, không dùng sữa động vật.",
    "lacto_ovo": "Chay có trứng và sữa: được dùng trứng và sữa động vật.",
    "buddhist": "Chay Phật giáo: ăn thực vật; không trứng, sữa động vật, mật ong và ngũ vị tân (hành, tỏi, kiệu, hẹ, nén).",
    "keto": (
        f"Keto chay: carb thuần mỗi ngày phải dưới {KETO_NET_CARBS_LIMIT_G} g; "
        "ưu tiên đạm thực vật và chất béo tốt từ bơ, dầu olive, các loại hạt. "
        "Carb thuần = tổng carbsG trừ fiberG. Cần số lượng và chất xơ để tính; "
        "không khẳng định đã xác minh carb thuần nếu thiếu dữ liệu. "
        "Khi tạo thực đơn JSON, bắt buộc có fiberG cho từng bữa, kể cả bữa phụ."
    ),
    "eat_clean": (
        "Eat Clean chay: ưu tiên thực phẩm nguyên bản toàn phần, ngũ cốc nguyên cám, "
        "chế biến tối giản; tránh đường và dầu mỡ tinh luyện. Không tự đặt thêm ngưỡng macro."
    ),
}


def dietary_guidance(dietary_type: str) -> str:
    """Use the same persisted diet definition for chat and structured meal prompts."""
    return (
        "Mọi chế độ đều là chế độ chay, không thịt, cá, hải sản hay phụ phẩm giết mổ. "
        + DIETARY_RULES[dietary_type]
    )
