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
