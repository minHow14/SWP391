# D:/SWP391/SWP391/ai_service/schemas/content_moderation.py
# Schema request/response cho tính năng kiểm duyệt nội dung văn bản (bài viết, bình luận) bằng LLM.
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, StringConstraints, model_validator

from schemas.base import CamelModel

# Các nhóm vi phạm mà LLM được phép gắn cho nội dung.
ModerationCategory = Literal[
    "SPAM",
    "SCAM",
    "HARASSMENT",
    "ANIMAL_MEAT_PROMOTION",
    "INGREDIENT_MISREPRESENTATION",
]
# Nội dung văn bản cần kiểm duyệt, giới hạn 50.000 ký tự để kiểm soát chi phí và ngữ cảnh LLM.
ContentText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50_000)
]


# Yêu cầu kiểm duyệt do Backend gửi; content_version giúp Backend bỏ qua kết quả của phiên bản cũ.
class ContentModerationRequest(CamelModel):
    job_id: UUID
    content_type: Literal["POST", "COMMENT"]
    content_version: int = Field(ge=1, strict=True)
    title: str | None = Field(default=None, max_length=255)
    content: ContentText


# Kết luận của LLM: ALLOW (cho phép) hoặc REVIEW (cần người duyệt), kèm lý do và bằng chứng trích dẫn.
class ContentModerationVerdict(CamelModel):
    decision: Literal["ALLOW", "REVIEW"]
    reason: str = Field(min_length=1, max_length=2_000)
    categories: list[ModerationCategory] = Field(max_length=10)
    evidence: list[Annotated[str, Field(min_length=1, max_length=1_000)]] = Field(
        max_length=5
    )

    # Đảm bảo kết luận nhất quán: REVIEW phải có nhóm vi phạm và bằng chứng; ALLOW thì không được có.
    @model_validator(mode="after")
    def validate_decision(self) -> "ContentModerationVerdict":
        if not self.reason.strip():
            raise ValueError("A moderation reason must not be blank.")
        if self.decision == "REVIEW" and (not self.categories or not self.evidence):
            raise ValueError("A review requires a category and verbatim evidence.")
        if self.decision == "ALLOW" and (self.categories or self.evidence):
            raise ValueError("An allowed item cannot carry violation findings.")
        return self


# Kết quả trả về Backend: kết luận kèm tên model và phiên bản chính sách kiểm duyệt đã dùng.
class ContentModerationResult(ContentModerationVerdict):
    model_name: str = Field(min_length=1, max_length=100)
    policy_version: str = Field(min_length=1, max_length=100)


# Response thành công theo API Contract.
class ContentModerationResponse(CamelModel):
    success: Literal[True] = True
    message: str = "Đã kiểm tra nội dung."
    data: ContentModerationResult
    meta: dict[str, str]
