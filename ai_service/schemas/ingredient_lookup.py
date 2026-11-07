# D:/SWP391/SWP391/ai_service/schemas/ingredient_lookup.py
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

IngredientName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)
]
OriginText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
]
DetailText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2_000)
]
# Pure fat is about 900 kcal per 100 g, the densest a food ingredient can be.
MAX_CALORIES_PER_100G = 900.0
MAX_GRAMS_PER_100G = 100.0
# Atwater factors; fibre and rounding make real tables drift, so the tolerance is generous.
ATWATER_KCAL_PER_GRAM = {"protein": 4.0, "carbs": 4.0, "fat": 9.0}
ENERGY_TOLERANCE_RATIO = 0.35
ENERGY_TOLERANCE_KCAL = 25.0
Grams = Annotated[float, Field(ge=0, le=MAX_GRAMS_PER_100G, allow_inf_nan=False)]


class NutritionPer100g(CamelModel):
    model_config = ConfigDict(populate_by_name=False, strict=True)
    calories: float = Field(ge=0, le=MAX_CALORIES_PER_100G, allow_inf_nan=False)
    protein: Grams
    fat: Grams
    carbs: Grams

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


class IngredientLookupRequest(CamelModel):
    model_config = ConfigDict(populate_by_name=False, strict=True)
    ingredient_name: IngredientName

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


class GeneratedIngredient(CamelModel):
    model_config = ConfigDict(populate_by_name=False, strict=True)
    category: Literal["protein", "mushroom", "vegetable", "additive", "other"]
    origin: OriginText
    plant: bool | None
    description: DetailText
    cooking: DetailText
    aliases: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1_000)]
    # Required but nullable so the model must decide explicitly instead of silently omitting it.
    # Explicit alias: to_camel would yield "nutritionPer100G", which the backend contract does not use.
    nutrition_per_100g: NutritionPer100g | None = Field(alias="nutritionPer100g")


class IngredientLookupResult(CamelModel):
    model_config = ConfigDict(populate_by_name=False, strict=True)
    is_ingredient: bool = Field(strict=True)
    ingredient: GeneratedIngredient | None

    @model_validator(mode="after")
    def validate_ingredient_verdict(self) -> "IngredientLookupResult":
        """Prevent incomplete positive results and details on negative verdicts."""
        if self.is_ingredient != (self.ingredient is not None):
            raise ValueError("Ingredient details must match the ingredient verdict.")
        return self


class IngredientLookupResponse(CamelModel):
    success: Literal[True] = True
    message: str = "Đã tra cứu thông tin nguyên liệu."
    data: IngredientLookupResult
