# ai_service/schemas/food_scanner.py
from typing import Literal
from pydantic import Field
from schemas.base import CamelModel


class FindingItem(CamelModel):
    ingredient: str = Field(..., description="Tên nguyên liệu hoặc phụ gia phát hiện")
    reason: str = Field(..., description="Lý do không phù hợp hoặc cần lưu ý")
    layer: int = Field(..., description="Lớp kiểm tra: 1 (Thịt/Hải sản), 2 (Phụ phẩm), 3 (Trứng/Sữa/Mật ong), 4 (Ngũ vị tân), 5 (Dị ứng)")
    severity: Literal["violation", "warning", "info"] = Field("violation", description="Mức độ nghiêm trọng")


class NutritionEstimate(CamelModel):
    calories: float = Field(0.0, description="Năng lượng ước tính (kcal)")
    protein: float = Field(0.0, description="Chất đạm (g)")
    carbs: float = Field(0.0, description="Đường bột (g)")
    fat: float = Field(0.0, description="Chất béo (g)")


class FoodScanRequest(CamelModel):
    image_base64: str = Field(..., description="Chuỗi base64 của ảnh món ăn hoặc bao bì")
    mime_type: Literal["image/jpeg", "image/png", "image/webp"] = Field("image/jpeg", description="MIME type của ảnh")
    diet_type_id: int = Field(..., description="ID chế độ ăn chay (1: Vegan, 2: Lacto, 3: Ovo, 4: Lacto-Ovo, 5: Chay Phật giáo)")
    scan_type: Literal["AUTO", "LABEL", "DISH"] = Field("AUTO", description="Chế độ quét: Tự động, Nhãn bao bì hoặc Món ăn")
    dish_name: str | None = Field("", description="Tên món ăn gợi ý nếu có")
    allergies: list[str] = Field(default_factory=list, description="Danh sách các thành phần gây dị ứng cần cảnh báo")


class FoodScanResult(CamelModel):
    dish_name: str = Field(..., description="Tên món ăn hoặc sản phẩm nhận diện được")
    detected_scan_type: Literal["LABEL", "DISH"] = Field(..., description="Loại ảnh phát hiện thực tế")
    status: Literal["clear", "warning", "inconclusive"] = Field(..., description="clear: Phù hợp, warning: Không phù hợp, inconclusive: Cần thận trọng")
    summary: str = Field(..., description="Tóm tắt nhận định tổng quan")
    findings: list[FindingItem] = Field(default_factory=list, description="Danh sách các thành phần vi phạm hoặc đáng chú ý")
    identified_ingredients: list[str] = Field(default_factory=list, description="Các nguyên liệu thực vật/chay được phát hiện")
    restaurant_checklist: list[str] = Field(default_factory=list, description="Các câu hỏi gợi ý khi ăn ngoài quán")
    swap_suggestions: list[str] = Field(default_factory=list, description="Gợi ý món chay hoặc nguyên liệu thay thế tương đương")
    nutrition_estimate: NutritionEstimate = Field(default_factory=NutritionEstimate, description="Ước tính dinh dưỡng sơ bộ")
