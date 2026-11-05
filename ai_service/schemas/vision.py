# D:/SWP391/SWP391/ai_service/schemas/vision.py
from pydantic import Field
from schemas.base import CamelModel


class BoundingBox(CamelModel):
    """Tọa độ khung nhận diện vật thể chuẩn hóa (0.0 đến 1.0)."""

    ymin: float = Field(ge=0.0, le=1.0)
    xmin: float = Field(ge=0.0, le=1.0)
    ymax: float = Field(ge=0.0, le=1.0)
    xmax: float = Field(ge=0.0, le=1.0)


class RecognizedItemSchema(CamelModel):
    """Thông tin từng nguyên liệu nhận diện qua Computer Vision."""

    detected_name: str = Field(min_length=1, max_length=150)
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    quantity_estimate: str | None = Field(default=None, max_length=100)
    freshness_status: str = Field(default="GOOD", max_length=20)
    freshness_score: int = Field(default=80, ge=0, le=100)
    estimated_shelf_life_days: int | None = Field(default=None, ge=0, le=365)
    spoilage_signs: list[str] = Field(default_factory=list)
    storage_advice: str | None = Field(default=None, max_length=500)
    bounding_box: BoundingBox | None = None


class VisionRecognitionResponseData(CamelModel):
    """Dữ liệu trả về chi tiết của phiên nhận diện ảnh."""

    summary: str = Field(min_length=1, max_length=1000)
    items: list[RecognizedItemSchema] = Field(default_factory=list)


class VisionRecognitionResponse(CamelModel):
    """Phản hồi API chuẩn theo API Contract toàn dự án."""

    success: bool = True
    message: str = "Nhận diện nguyên liệu và đánh giá độ tươi thành công."
    data: VisionRecognitionResponseData
