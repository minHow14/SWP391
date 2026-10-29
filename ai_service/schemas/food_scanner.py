# D:/SWP391/SWP391/ai_service/schemas/food_scanner.py
import base64
import binascii
from typing import Annotated, Literal, Self

from pydantic import Field, StringConstraints, field_validator, model_validator

from schemas.base import CamelModel

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_BASE64_LENGTH = ((MAX_IMAGE_BYTES + 2) // 3) * 4
MAX_DISH_NAME_LENGTH = 150
MAX_ALLERGIES_COUNT = 50
MAX_ALLERGY_LENGTH = 100
ScanText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
NutrientValue = Annotated[float, Field(strict=True, ge=0, allow_inf_nan=False)]
AllergyText = Annotated[ScanText, Field(max_length=MAX_ALLERGY_LENGTH)]


def _image_matches_mime(image: bytes, mime_type: str) -> bool:
    if mime_type == "image/png":
        return image.startswith(b"\x89PNG\r\n\x1a\n") and image[12:16] == b"IHDR"
    if mime_type == "image/jpeg":
        return image.startswith(b"\xff\xd8\xff") and image.endswith(b"\xff\xd9")
    return (
        len(image) >= 20
        and image[:4] == b"RIFF"
        and image[8:12] == b"WEBP"
        and image[12:16] in {b"VP8 ", b"VP8L", b"VP8X"}
        and int.from_bytes(image[4:8], "little") + 8 == len(image)
    )


class FindingItem(CamelModel):
    ingredient: ScanText
    reason: ScanText
    layer: int = Field(ge=1, le=5, strict=True)
    severity: Literal["violation", "warning", "info"]


class NutritionEstimate(CamelModel):
    calories: NutrientValue
    protein: NutrientValue
    carbs: NutrientValue
    fat: NutrientValue


class FoodScanRequest(CamelModel):
    image_base64: str = Field(min_length=1, max_length=MAX_BASE64_LENGTH)
    mime_type: Literal["image/jpeg", "image/png", "image/webp"] = "image/jpeg"
    diet_type_id: int = Field(gt=0, strict=True)
    scan_type: Literal["AUTO", "LABEL", "DISH"] = "AUTO"
    dish_name: str | None = Field(default="", max_length=MAX_DISH_NAME_LENGTH)
    allergies: list[AllergyText] = Field(
        default_factory=list, max_length=MAX_ALLERGIES_COUNT
    )

    @field_validator("image_base64", mode="before")
    @classmethod
    def strip_base64(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_image(self) -> Self:
        """Validate decoded size and image container before sending data upstream."""
        try:
            image = base64.b64decode(self.image_base64, validate=True)
        except (ValueError, binascii.Error) as exc:
            raise ValueError("Dữ liệu ảnh base64 không hợp lệ.") from exc
        if not image or len(image) > MAX_IMAGE_BYTES:
            raise ValueError("Ảnh không được để trống hoặc vượt quá 10 MiB.")
        if base64.b64encode(image).decode("ascii") != self.image_base64:
            raise ValueError("Dữ liệu ảnh base64 không hợp lệ.")
        if not _image_matches_mime(image, self.mime_type):
            raise ValueError(
                "Định dạng ảnh không khớp mimeType hoặc không được hỗ trợ."
            )
        return self


class FoodScanResult(CamelModel):
    dish_name: ScanText
    detected_scan_type: Literal["LABEL", "DISH"]
    status: Literal["clear", "warning", "inconclusive"]
    summary: ScanText
    findings: list[FindingItem]
    identified_ingredients: list[ScanText]
    restaurant_checklist: list[ScanText]
    swap_suggestions: list[ScanText]
    nutrition_estimate: NutritionEstimate | None = None

    @model_validator(mode="after")
    def validate_status(self) -> Self:
        if self.status == "clear" and any(
            item.severity == "violation" for item in self.findings
        ):
            raise ValueError("Kết quả phù hợp không được chứa thành phần vi phạm.")
        return self
