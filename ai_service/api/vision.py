# D:/SWP391/SWP391/ai_service/api/vision.py
import logging
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from agents.vision_agent import vision_agent
from core.security import verify_internal_api_key
from schemas.vision import VisionRecognitionResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Vision"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post(
    "/vision/recognize-ingredients",
    response_model=VisionRecognitionResponse,
    dependencies=[Depends(verify_internal_api_key)],
    summary="Nhận diện nguyên liệu & đánh giá độ tươi qua ảnh chụp (Computer Vision)",
)
async def recognize_ingredients(
    image: UploadFile = File(...),
):
    """
    Endpoint nhận diện nguyên liệu và kiểm tra tủ lạnh bằng Computer Vision:
    - Nhận file ảnh đa phương tiện (JPG, PNG, WebP) tối đa 10 MB.
    - Trích xuất danh sách nguyên liệu, độ tin cậy, độ tươi và gợi ý bảo quản.
    - Yêu cầu xác thực khóa bảo mật nội bộ X-Internal-Api-Key từ Backend Express.
    """
    if image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_IMAGE_FORMAT",
                "message": "Định dạng tệp không được hỗ trợ. Vui lòng tải lên ảnh JPG, PNG hoặc WebP.",
            },
        )

    image_bytes = await image.read()
    if not image_bytes or len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "EMPTY_IMAGE_FILE",
                "message": "Tệp ảnh tải lên rỗng hoặc không có dữ liệu.",
            },
        )

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "code": "IMAGE_TOO_LARGE",
                "message": "Dung lượng ảnh vượt quá giới hạn 10 MB cho phép.",
            },
        )

    try:
        data = await vision_agent.analyze_image(
            image_bytes=image_bytes,
            mime_type=image.content_type,
            file_name=image.filename or "uploaded.jpg",
        )
        return VisionRecognitionResponse(
            success=True,
            message="Nhận diện nguyên liệu và đánh giá độ tươi thành công.",
            data=data,
        )
    except Exception as exc:
        logger.error("Error recognizing ingredients from image filename=%s: %s", image.filename, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AI_VISION_PROCESSING_ERROR",
                "message": "Mô hình thị giác máy tính tạm thời không thể xử lý ảnh này. Vui lòng thử lại sau.",
            },
        ) from exc
