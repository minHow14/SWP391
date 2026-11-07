# D:/SWP391/SWP391/ai_service/schemas/image_moderation.py
import base64
import binascii
from typing import Annotated, Literal, Self
from uuid import UUID

from pydantic import Field, StringConstraints, field_validator, model_validator

from schemas.base import CamelModel
from schemas.content_moderation import ContentText, ModerationCategory
from schemas.food_scanner import MAX_BASE64_LENGTH, MAX_IMAGE_BYTES

# Six post attachments plus one uploaded video thumbnail, indexed from zero.
MAX_IMAGE_INDEX = 6
MAX_RESULT_OBSERVATIONS = 5
# The model sometimes lists more details than the contract keeps; extras are trimmed, not rejected.
MAX_MODEL_OBSERVATIONS = 10
ModerationImageMimeType = Literal["image/jpeg", "image/png", "image/webp", "image/gif"]
Observation = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
]

_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/gif": (b"GIF87a", b"GIF89a"),
}


def _has_signature(image: bytes, mime_type: str) -> bool:
    """Check the container header so the provider never receives a mislabelled file."""
    if mime_type == "image/webp":
        return len(image) >= 12 and image[:4] == b"RIFF" and image[8:12] == b"WEBP"
    return image.startswith(_SIGNATURES[mime_type])


class ImageModerationRequest(CamelModel):
    job_id: UUID
    content_type: Literal["POST"]
    content_version: int = Field(ge=1, strict=True)
    title: str | None = Field(default=None, max_length=255)
    content: ContentText
    image_index: int = Field(ge=0, le=MAX_IMAGE_INDEX, strict=True)
    mime_type: ModerationImageMimeType
    image_base64: str = Field(min_length=1, max_length=MAX_BASE64_LENGTH)

    @field_validator("image_base64", mode="before")
    @classmethod
    def strip_base64(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_image(self) -> Self:
        """Validate decoded size and format before any provider call."""
        try:
            image = base64.b64decode(self.image_base64, validate=True)
        except (ValueError, binascii.Error) as exc:
            raise ValueError("Dữ liệu ảnh base64 không hợp lệ.") from exc
        if not image or len(image) > MAX_IMAGE_BYTES:
            raise ValueError("Ảnh không được để trống hoặc vượt quá 10 MiB.")
        if not _has_signature(image, self.mime_type):
            raise ValueError("Định dạng ảnh không khớp mimeType.")
        return self


class ImageModerationVerdict(CamelModel):
    decision: Literal["ALLOW", "REVIEW"]
    reason: str = Field(min_length=1, max_length=2_000)
    categories: list[ModerationCategory] = Field(max_length=10)
    observations: list[Observation] = Field(max_length=MAX_MODEL_OBSERVATIONS)

    @model_validator(mode="after")
    def validate_decision(self) -> Self:
        if not self.reason.strip():
            raise ValueError("A moderation reason must not be blank.")
        if self.decision == "REVIEW" and (not self.categories or not self.observations):
            raise ValueError("A review requires a category and a visible observation.")
        if self.decision == "ALLOW" and self.categories:
            raise ValueError("An allowed image cannot carry violation categories.")
        return self


class ImageModerationResult(ImageModerationVerdict):
    observations: list[Observation] = Field(max_length=MAX_RESULT_OBSERVATIONS)
    model_name: str = Field(min_length=1, max_length=100)
    policy_version: str = Field(min_length=1, max_length=100)


class ImageModerationResponse(CamelModel):
    success: Literal[True] = True
    message: str = "Đã kiểm tra ảnh."
    data: ImageModerationResult
    meta: dict[str, str]
