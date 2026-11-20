# D:/SWP391/SWP391/ai_service/api/image_moderation.py
# Router kiểm duyệt ảnh đính kèm bài viết cho Backend.
from fastapi import APIRouter, Depends, Request

from core.security import verify_internal_api_key
from schemas.image_moderation import ImageModerationRequest, ImageModerationResponse
from services.image_moderation import moderate_image

router = APIRouter(
    prefix="/v1/image-moderations",
    tags=["Content Moderation"],
    dependencies=[Depends(verify_internal_api_key)],
)


# POST /api/v1/image-moderations: trả kết luận nội bộ cho một ảnh; chỉ Backend quyết định hiển thị.
@router.post("", response_model=ImageModerationResponse)
async def create_image_moderation(
    body: ImageModerationRequest, request: Request
) -> ImageModerationResponse:
    """Return an internal verdict for one post image; the backend alone decides visibility."""
    return ImageModerationResponse(
        data=await moderate_image(body), meta={"requestId": request.state.request_id}
    )
