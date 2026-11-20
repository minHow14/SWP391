# D:/SWP391/SWP391/ai_service/schemas/video_recipe.py
# Schema request/response cho tính năng chép lời video YouTube và trích xuất công thức nấu ăn.
from typing import Annotated, Literal, Self
from uuid import UUID

from pydantic import Field, StringConstraints, model_validator

from core.video_recipe_config import MAX_VIDEO_DURATION_SECONDS
from schemas.base import CamelModel

# videoId YouTube gồm đúng 11 ký tự; thời điểm tính bằng giây trong giới hạn thời lượng video.
VideoId = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9_-]{11}$")]
Seconds = Annotated[
    float, Field(ge=0, le=MAX_VIDEO_DURATION_SECONDS, allow_inf_nan=False)
]
ShortText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)
]
# Chỉ số đoạn phụ đề làm nguồn; mỗi nguyên liệu/bước phải dẫn chứng ít nhất một đoạn để chống LLM bịa.
SourceIndex = Annotated[int, Field(strict=True, ge=0)]
SourceIndexes = Annotated[list[SourceIndex], Field(min_length=1, max_length=2000)]


# Yêu cầu chép lời một video YouTube tiếng Việt.
class VideoTranscriptionRequest(CamelModel):
    job_id: UUID
    video_id: VideoId
    video_url: str = Field(max_length=255)
    max_duration_seconds: Literal[660] = 660
    duration_seconds: Seconds = Field(gt=0)
    language: Literal["vi"] = "vi"

    # Chỉ chấp nhận URL YouTube dạng chuẩn khớp videoId, tránh bị lợi dụng để tải URL tùy ý.
    @model_validator(mode="after")
    def canonical_source(self) -> Self:
        if self.video_url != f"https://www.youtube.com/watch?v={self.video_id}":
            raise ValueError("Chỉ nhận URL YouTube chuẩn khớp với videoId.")
        return self


# Một đoạn lời nói với thời điểm bắt đầu/kết thúc.
class VideoSegment(CamelModel):
    start_seconds: Seconds
    end_seconds: Seconds
    text: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10_000)
    ]


# Bản chép lời đầy đủ của video.
class VideoTranscript(CamelModel):
    language: Literal["vi"] = "vi"
    duration_seconds: Seconds = Field(gt=0)
    segments: list[VideoSegment] = Field(min_length=1, max_length=2000)

    # Kiểm tra dòng thời gian: các đoạn không chồng lấn, nằm trong thời lượng và tổng độ dài văn bản có giới hạn.
    @model_validator(mode="after")
    def valid_timeline(self) -> Self:
        previous_end = 0.0
        for segment in self.segments:
            if (
                segment.start_seconds < previous_end
                or segment.end_seconds <= segment.start_seconds
            ):
                raise ValueError("Các đoạn lời nói phải đúng thứ tự.")
            if segment.end_seconds > self.duration_seconds:
                raise ValueError("Đoạn lời nói vượt thời lượng audio.")
            previous_end = segment.end_seconds
        if sum(len(segment.text) for segment in self.segments) > 100_000:
            raise ValueError("Bản chép lời vượt giới hạn.")
        return self


# Nguyên liệu trích xuất từ video; số lượng/đơn vị có thể null khi video không nói rõ.
class VideoIngredient(CamelModel):
    name: ShortText
    quantity: (
        Annotated[
            str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
        ]
        | None
    )
    unit: (
        Annotated[
            str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
        ]
        | None
    )
    source_segment_indexes: SourceIndexes


# Một bước nấu trích xuất từ video.
class VideoRecipeStep(CamelModel):
    instruction: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)
    ]
    source_segment_indexes: SourceIndexes


# Công thức nấu ăn hoàn chỉnh trích xuất được.
class VideoRecipe(CamelModel):
    title: ShortText | None
    ingredients: list[VideoIngredient] = Field(max_length=100)
    steps: list[VideoRecipeStep] = Field(min_length=1, max_length=100)


# Kết quả trích xuất: video có phải công thức nấu ăn không, kèm công thức nếu có.
class VideoRecipeExtraction(CamelModel):
    is_recipe: bool
    recipe: VideoRecipe | None


# Yêu cầu tóm tắt công thức từ bản chép lời đã có.
class VideoSummaryRequest(CamelModel):
    job_id: UUID
    video_id: VideoId
    language: Literal["vi"] = "vi"
    transcript: VideoTranscript
