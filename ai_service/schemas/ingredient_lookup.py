# D:/SWP391/SWP391/ai_service/schemas/ingredient_lookup.py
# Schema request/response cho tính năng tra cứu thông tin nguyên liệu bằng LLM,
# kèm kiểm tra tính hợp lý vật lý của bảng dinh dưỡng trên 100 g.
import re
import unicodedata
from typing import Annotated, Literal

from pydantic import (
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from schemas.base import CamelModel

# Các kiểu chuỗi đã cắt khoảng trắng, giới hạn độ dài cho tên, nguồn gốc và mô tả chi tiết.
IngredientName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)
]
OriginText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
]
DetailText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2_000)
]
# Chất béo nguyên chất khoảng 900 kcal/100 g, là mức năng lượng đậm đặc nhất mà một nguyên liệu có thể đạt.
MAX_CALORIES_PER_100G = 900.0
MAX_GRAMS_PER_100G = 100.0
# Hệ số Atwater; chất xơ và việc làm tròn khiến bảng thực tế lệch nên dung sai được để rộng.
ATWATER_KCAL_PER_GRAM = {"protein": 4.0, "carbs": 4.0, "fat": 9.0}
ENERGY_TOLERANCE_RATIO = 0.35
ENERGY_TOLERANCE_KCAL = 25.0
Grams = Annotated[float, Field(ge=0, le=MAX_GRAMS_PER_100G, allow_inf_nan=False)]


# Bảng dinh dưỡng trên 100 g; strict và tắt populate_by_name để chỉ nhận đúng tên trường camelCase.
class NutritionPer100g(CamelModel):
    model_config = ConfigDict(populate_by_name=False, strict=True)
    calories: float = Field(ge=0, le=MAX_CALORIES_PER_100G, allow_inf_nan=False)
    protein: Grams
    fat: Grams
    carbs: Grams

    # Từ chối bảng dinh dưỡng bất khả thi về vật lý hoặc tự mâu thuẫn trên 100 g.
    @model_validator(mode="after")
    def validate_profile(self) -> "NutritionPer100g":
        """Reject physically impossible or self-contradicting per-100 g profiles."""
        if self.protein + self.fat + self.carbs > MAX_GRAMS_PER_100G:
            raise ValueError("Macronutrients cannot exceed 100 g per 100 g.")
        estimated = sum(
            getattr(self, nutrient) * factor
            for nutrient, factor in ATWATER_KCAL_PER_GRAM.items()
        )
        allowed = max(
            ENERGY_TOLERANCE_KCAL,
            ENERGY_TOLERANCE_RATIO * max(self.calories, estimated),
        )
        if abs(self.calories - estimated) > allowed:
            raise ValueError("Energy does not match the macronutrients.")
        return self


# Yêu cầu tra cứu nguyên liệu theo tên.
class IngredientLookupRequest(CamelModel):
    model_config = ConfigDict(populate_by_name=False, strict=True)
    ingredient_name: IngredientName

    # Chuẩn hóa tên giống Backend (NFKC, gộp khoảng trắng) trước khi áp dụng giới hạn độ dài,
    # đồng thời chặn ký tự điều khiển.
    @field_validator("ingredient_name", mode="before")
    @classmethod
    def normalize_ingredient_name(cls, value: object) -> str:
        """Match backend normalization before applying the normalized length limit."""
        if not isinstance(value, str) or len(value.strip()) > 150:
            raise ValueError(
                "Ingredient name must be a string of at most 150 characters."
            )
        normalized = unicodedata.normalize("NFKC", value).strip()
        if any(
            unicodedata.category(character) in {"Cc", "Cs"} and not character.isspace()
            for character in normalized
        ):
            raise ValueError("Ingredient name contains invalid control characters.")
        return re.sub(r"\s+", " ", normalized)


# Thông tin nguyên liệu do LLM sinh: nhóm, nguồn gốc, có phải thực vật, mô tả, cách chế biến, tên gọi khác.
class GeneratedIngredient(CamelModel):
    model_config = ConfigDict(populate_by_name=False, strict=True)
    category: Literal["protein", "mushroom", "vegetable", "additive", "other"]
    origin: OriginText
    plant: bool | None
    description: DetailText
    cooking: DetailText
    aliases: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1_000)]
    # Bắt buộc nhưng cho phép null để model phải quyết định rõ ràng thay vì âm thầm bỏ qua.
    # Alias tường minh: to_camel sẽ sinh "nutritionPer100G", tên mà hợp đồng phía Backend không dùng.
    nutrition_per_100g: NutritionPer100g | None = Field(alias="nutritionPer100g")


# Kết quả tra cứu: có phải nguyên liệu hay không, kèm chi tiết khi là nguyên liệu.
class IngredientLookupResult(CamelModel):
    model_config = ConfigDict(populate_by_name=False, strict=True)
    is_ingredient: bool = Field(strict=True)
    ingredient: GeneratedIngredient | None

    @model_validator(mode="after")
    # Chặn kết quả dương tính thiếu chi tiết và kết quả âm tính lại kèm chi tiết.
    def validate_ingredient_verdict(self) -> "IngredientLookupResult":
        """Prevent incomplete positive results and details on negative verdicts."""
        if self.is_ingredient != (self.ingredient is not None):
            raise ValueError("Ingredient details must match the ingredient verdict.")
        return self


# Response thành công theo API Contract.
class IngredientLookupResponse(CamelModel):
    success: Literal[True] = True
    message: str = "Đã tra cứu thông tin nguyên liệu."
    data: IngredientLookupResult
