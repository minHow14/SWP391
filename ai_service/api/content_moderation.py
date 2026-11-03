# D:/SWP391/SWP391/ai_service/api/content_moderation.py
from fastapi import APIRouter, Depends, Request

from core.security import verify_internal_api_key
from schemas.content_moderation import (
    ContentModerationRequest,
    ContentModerationResponse,
)
from services.content_moderation import moderate_content

router = APIRouter(
    prefix="/v1/content-moderations",
    tags=["Content Moderation"],
    dependencies=[Depends(verify_internal_api_key)],
)


@router.post("", response_model=ContentModerationResponse)
async def create_content_moderation(
    body: ContentModerationRequest, request: Request
) -> ContentModerationResponse:
    """Return an internal text verdict; the backend alone decides visibility and persistence."""
    return ContentModerationResponse(
        data=await moderate_content(body), meta={"requestId": request.state.request_id}
    )
