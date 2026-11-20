# D:/SWP391/SWP391/ai_service/agents/vision_agent.py
# Agent thị giác máy tính: nhận diện nguyên liệu và đánh giá độ tươi từ ảnh bằng LLM có đầu ra cấu trúc.
import base64
import logging
from langchain_core.messages import HumanMessage, SystemMessage

from core.llm import get_structured_llm
from schemas.vision import (
    RecognizedItemSchema,
    VisionRecognitionResponseData,
)

logger = logging.getLogger(__name__)

# System prompt mô tả nhiệm vụ nhận diện và thang đánh giá độ tươi cho model.
VISION_SYSTEM_PROMPT = """Bạn là Chuyên gia Thị giác Máy tính & Dinh dưỡng Chay (Computer Vision AI) của nền tảng Chay Xanh.
Nhiệm vụ của bạn là quan sát kỹ lưỡng ảnh chụp các loại nguyên liệu hoặc ảnh chụp bên trong tủ lạnh để:
1. Nhận diện chính xác tên từng nguyên liệu thực vật/chay (rau củ, hoa quả, nấm, đậu hũ, ngũ cốc, gia vị...).
2. Đánh giá độ tươi (freshnessStatus) theo các mức:
   - "FRESH": Tươi mới, màu sắc tươi sáng, cuống/lá căng mọng, bề mặt nguyên vẹn.
   - "GOOD": Bình thường, đảm bảo an toàn vệ sinh thực phẩm.
   - "EXPIRING_SOON": Bắt đầu xuống cấp (vỏ nhăn, lá héo nhẹ, mềm nhũn, cần chế biến gấp trong 1-2 ngày).
   - "SPOILED": Đã hư hỏng (mốc, chảy nước, thâm đen diện rộng, hỏng nát), khuyến cáo bỏ.
3. Chấm điểm độ tươi (freshnessScore) từ 0 đến 100.
4. Dự đoán số ngày bảo quản còn lại (estimatedShelfLifeDays).
5. Liệt kê các dấu hiệu hư hỏng quan sát được (spoilageSigns).
6. Đưa ra lời khuyên bảo quản phù hợp nhất (storageAdvice).
7. Tóm tắt tổng quan hiện trạng thực phẩm trong ảnh (summary).
LƯU Ý: Phải sử dụng tiếng Việt chuẩn mực, tên món và nguyên liệu thân thiện với người Việt. Tuyệt đối không tự suy diễn nếu ảnh quá mờ."""


class VisionAgent:
    """Agent phân tích thị giác máy tính cho nguyên liệu và tủ lạnh."""

    # Model được khởi tạo lười để không gọi cấu hình LLM khi import module.
    def __init__(self):
        self._llm = None

    # Lấy (hoặc tạo lần đầu) LLM có đầu ra cấu trúc theo VisionRecognitionResponseData; timeout dài vì xử lý ảnh chậm.
    def _get_model(self):
        if self._llm is None:
            self._llm = get_structured_llm(VisionRecognitionResponseData, timeout=120.0)
        return self._llm

    # Mã hóa ảnh thành data URI base64 rồi gửi kèm hướng dẫn cho model.
    async def analyze_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        file_name: str = "upload.jpg",
    ) -> VisionRecognitionResponseData:
        """Phân tích ảnh nguyên liệu / tủ lạnh và trả về cấu trúc Pydantic v2."""
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        data_uri = f"data:{mime_type};base64,{base64_image}"

        messages = [
            SystemMessage(content=VISION_SYSTEM_PROMPT),
            HumanMessage(
                content=[
                    {
                        "type": "text",
                        "text": "Hãy quan sát bức ảnh thực phẩm/tủ lạnh này và trích xuất danh sách nguyên liệu, đánh giá độ tươi, hạn dùng và tóm tắt theo cấu trúc yêu cầu.",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": data_uri},
                    },
                ]
            ),
        ]

        model = self._get_model()
        logger.info("Calling Vision Model for file=%s size=%d bytes", file_name, len(image_bytes))
        result = await model.ainvoke(messages)
        return result


# Thể hiện agent dùng chung toàn service.
vision_agent = VisionAgent()
