# ai_service/api/food_scanner.py
import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from agents.food_scanner_agent import food_scanner_agent
from core.llm import get_json_model_name
from core.ratelimit import limiter
from core.security import (
    RequestIdentity,
    resolve_identity,
    verify_internal_api_key,
)
from schemas.food_scanner import FoodScanRequest

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/food-scanner",
    tags=["Food Scanner"],
    dependencies=[Depends(verify_internal_api_key)],
)


@router.post("/analyze")
@limiter.limit("30/minute")
async def analyze_food(
    request: Request,
    payload: FoodScanRequest,
    identity: RequestIdentity = Depends(resolve_identity),
):
    """
    Phân tích hình ảnh bao bì sản phẩm hoặc đĩa món ăn thành phẩm
    theo trường phái ăn chay và hồ sơ dị ứng.
    """
    request_id = getattr(request.state, "request_id", None) or f"req_{uuid4().hex[:12]}"

    result = await food_scanner_agent.analyze(payload)

    return {
        "success": True,
        "message": "Phân tích hình ảnh thực phẩm thành công.",
        "data": result.model_dump(by_alias=True),
        "meta": {
            "requestId": request_id,
            "modelName": get_json_model_name(),
        },
    }
