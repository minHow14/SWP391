# D:/SWP391/SWP391/ai_service/schemas/content_moderation.py
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, StringConstraints, model_validator

from schemas.base import CamelModel

ModerationCategory = Literal[
    "SPAM",
    "SCAM",
    "HARASSMENT",
    "ANIMAL_MEAT_PROMOTION",
    "INGREDIENT_MISREPRESENTATION",
]
ContentText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50_000)
]


class ContentModerationRequest(CamelModel):
    job_id: UUID
    content_type: Literal["POST", "COMMENT"]
    content_version: int = Field(ge=1, strict=True)
    title: str | None = Field(default=None, max_length=255)
    content: ContentText


class ContentModerationVerdict(CamelModel):
    decision: Literal["ALLOW", "REVIEW"]
    reason: str = Field(min_length=1, max_length=2_000)
    categories: list[ModerationCategory] = Field(max_length=10)
    evidence: list[Annotated[str, Field(min_length=1, max_length=1_000)]] = Field(
        max_length=5
    )

    @model_validator(mode="after")
    def validate_decision(self) -> "ContentModerationVerdict":
        if not self.reason.strip():
            raise ValueError("A moderation reason must not be blank.")
        if self.decision == "REVIEW" and (not self.categories or not self.evidence):
            raise ValueError("A review requires a category and verbatim evidence.")
        if self.decision == "ALLOW" and (self.categories or self.evidence):
            raise ValueError("An allowed item cannot carry violation findings.")
        return self


class ContentModerationResult(ContentModerationVerdict):
    model_name: str = Field(min_length=1, max_length=100)
    policy_version: str = Field(min_length=1, max_length=100)


class ContentModerationResponse(CamelModel):
    success: Literal[True] = True
    message: str = "Đã kiểm tra nội dung."
    data: ContentModerationResult
    meta: dict[str, str]
