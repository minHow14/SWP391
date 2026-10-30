# D:/SWP391/SWP391/ai_service/agents/food_scanner_agent.py
import json
import logging
from pathlib import Path

from fastapi import HTTPException
from langchain_core.messages import HumanMessage, SystemMessage

from core.config import settings
from core.llm import get_llm_json
from schemas.food_scanner import FoodScanRequest, FoodScanResult

logger = logging.getLogger(__name__)
PROMPT_FILE = Path(__file__).resolve().parent.parent / "prompts" / "food_scanner.md"
SYSTEM_PROMPT = PROMPT_FILE.read_text(encoding="utf-8") if PROMPT_FILE.exists() else ""
SCAN_TIMEOUT_SECONDS = 35.0


def _unavailable_error() -> HTTPException:
    return HTTPException(
        status_code=503,
        detail={
            "code": "FOOD_SCAN_UNAVAILABLE",
            "message": "Dịch vụ phân tích ảnh hiện chưa khả dụng hoặc model chưa hỗ trợ ảnh. Vui lòng thử lại sau.",
        },
    )


def _scan_messages(request: FoodScanRequest) -> list[SystemMessage | HumanMessage]:
    context = request.model_dump(by_alias=True, exclude={"image_base64", "mime_type"})
    user_prompt = (
        "Phân tích ảnh theo thông tin người dùng dưới đây. Tên món chỉ là gợi ý, "
        "không phải bằng chứng về nguyên liệu. Không suy diễn thịt gà/cá từ tên "
        "thực vật như nấm đùi gà hoặc cà chua. Chỉ nêu nguyên liệu đọc/nhận diện được "
        "trong ảnh; nếu ảnh không đủ rõ, vẫn đưa ra kết luận clear hoặc warning dựa trên những gì thấy được và nêu rõ giới hạn trong summary. "
        "Không bịa dinh dưỡng. Nếu chưa xác định đủ cả bốn giá trị, trả nutritionEstimate=null. "
        "Trả duy nhất một JSON object đúng schema, không dùng markdown.\n"
        f"Thông tin: {json.dumps(context, ensure_ascii=False)}\n"
        f"Schema: {json.dumps(FoodScanResult.model_json_schema(by_alias=True), ensure_ascii=False)}"
    )
    return [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=[
                {"type": "text", "text": user_prompt},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{request.mime_type};base64,{request.image_base64}"
                    },
                },
            ]
        ),
    ]


BUDDHIST_DIET_TYPE_ID = 5
ALLIUM_LAYER = 4


def _apply_diet_rules(result: FoodScanResult, diet_type_id: int) -> FoodScanResult:
    """Drop findings the selected diet permits and keep the verdict consistent with what remains."""
    findings = [
        item
        for item in result.findings
        if item.layer != ALLIUM_LAYER or diet_type_id == BUDDHIST_DIET_TYPE_ID
    ]
    if len(findings) == len(result.findings):
        return result
    has_violation = any(item.severity == "violation" for item in findings)
    status = "warning" if has_violation else "clear"
    return result.model_copy(update={"findings": findings, "status": status})


class FoodScannerAgent:
    """Inspect images only through a model and validate its complete result."""

    async def analyze(self, request: FoodScanRequest) -> FoodScanResult:
        """Return validated image analysis or an explicit sanitized failure."""
        if not settings.DEEPSEEK_API_KEY.strip():
            raise _unavailable_error()
        try:
            model = get_llm_json(timeout=SCAN_TIMEOUT_SECONDS)
            response = await model.ainvoke(_scan_messages(request))
        except Exception as exc:  # noqa: BLE001 - Provider SDK failures must never produce fabricated scans.
            logger.warning(
                "Food scanner provider unavailable exceptionType=%s", type(exc).__name__
            )
            raise _unavailable_error() from None
        try:
            if not isinstance(response.content, str):
                raise TypeError("Expected JSON text")
            result = FoodScanResult.model_validate(json.loads(response.content))
            return _apply_diet_rules(result, request.diet_type_id)
        except (ValueError, TypeError, AttributeError) as exc:
            logger.warning(
                "Food scanner invalid output exceptionType=%s", type(exc).__name__
            )
            raise HTTPException(
                status_code=502,
                detail={
                    "code": "FOOD_SCAN_INVALID_OUTPUT",
                    "message": "Kết quả phân tích ảnh không hợp lệ. Vui lòng thử lại.",
                },
            ) from None


food_scanner_agent = FoodScannerAgent()
