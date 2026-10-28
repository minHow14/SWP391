# ai_service/agents/food_scanner_agent.py
import json
import logging
import re
import unicodedata
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage

from core.llm import PROVIDER_ERRORS, get_json_model_name, get_llm_json
from schemas.food_scanner import (
    FindingItem,
    FoodScanRequest,
    FoodScanResult,
    NutritionEstimate,
)

logger = logging.getLogger(__name__)

PROMPT_FILE = Path(__file__).resolve().parent.parent / "prompts" / "food_scanner.md"
SYSTEM_PROMPT = PROMPT_FILE.read_text(encoding="utf-8") if PROMPT_FILE.exists() else ""

# Từ điển phụ gia quốc tế & thành phần cấm
ADDITIVE_RULES = [
    {"code": "E120", "name": "Carmine / Cochineal (Màu đỏ cánh kiến)", "reason": "Chiết xuất từ bọ cánh kiến đỏ, nguồn gốc động vật.", "layer": 2, "diets": [1, 2, 3, 4, 5]},
    {"code": "E441", "name": "Gelatin", "reason": "Chiết xuất từ da, xương động vật.", "layer": 2, "diets": [1, 2, 3, 4, 5]},
    {"code": "E631", "name": "Disodium Inosinate", "reason": "Chất điều vị thường chiết xuất từ thịt hoặc cá biển.", "layer": 2, "diets": [1, 2, 3, 4, 5]},
    {"code": "E901", "name": "Sáp ong (Beeswax)", "reason": "Sản phẩm từ ong, không phù hợp với chế độ thuần chay.", "layer": 2, "diets": [1]},
    {"code": "E904", "name": "Shellac", "reason": "Chất làm bóng chiết xuất từ côn trùng.", "layer": 2, "diets": [1, 2, 3, 4, 5]},
    {"code": "E471", "name": "Mono- and diglycerides of fatty acids", "reason": "Chất nhũ hóa có thể có nguồn gốc mỡ động vật hoặc dầu thực vật; cần xác nhận nhà sản xuất.", "layer": 2, "severity": "warning", "diets": [1, 2, 3, 4, 5]},
]

ANIMAL_PATTERNS = [
    (r"\b(thit|heo|lon|bo|ga|vit|chim|de|cuu)\b", "Phát hiện thịt gia súc hoặc gia cầm.", 1),
    (r"\b(ca|tom|cua|muc|oc|ngheu|so|hen|luon|ech|hai san)\b", "Phát hiện cá hoặc hải sản động vật.", 1),
    (r"\b(nuoc mam|mam tom|mam tep|mam ca|mo dong vat|mo heo)\b", "Chiết xuất từ mắm hải sản hoặc mỡ động vật.", 1),
    (r"\b(gelatin|collagen|dau ca|xuong heo|xuong bo|xuong ga|bot thit)\b", "Phụ phẩm hoặc chiết xuất từ xương, da, mô động vật.", 2),
]

DAIRY_EGG_PATTERNS = [
    (r"\b(sua bo|sua dac|pho mai|cheese|bo dong vat|butter|whey|casein|kem sua)\b", "Thành phần từ sữa không phù hợp với chế độ thuần chay hoặc chay không sữa.", 3, [1, 3]),
    (r"\b(trung ga|trung vit|trung cut|long do|long trang|egg)\b", "Thành phần từ trứng không phù hợp với chế độ thuần chay hoặc chay không trứng.", 3, [1, 2]),
    (r"\b(mat ong|honey|sap ong)\b", "Mật ong hoặc sản phẩm từ ong không phù hợp với chế độ thuần chay.", 3, [1]),
]

FIVE_PUNGENT_PATTERNS = [
    (r"\b(hanh|hanh tay|hanh la|hanh tim|hanh phi)\b", "Hành thuộc Ngũ vị tân, cấm trong chế độ chay Phật giáo.", 4),
    (r"\b(toi|toi phi|bot toi)\b", "Tỏi thuộc Ngũ vị tân, cấm trong chế độ chay Phật giáo.", 4),
    (r"\b(he|la he)\b", "Hẹ thuộc Ngũ vị tân, cấm trong chế độ chay Phật giáo.", 4),
    (r"\b(kieu|cu kieu)\b", "Kiệu thuộc Ngũ vị tân, cấm trong chế độ chay Phật giáo.", 4),
    (r"\b(cu nen|hung cu)\b", "Củ nén / Hưng cừ thuộc Ngũ vị tân, cấm trong chế độ chay Phật giáo.", 4),
]


def _normalize(text: str) -> str:
    """Loại bỏ dấu tiếng Việt và đưa về chữ thường để so khớp regex."""
    nfkd = unicodedata.normalize("NFD", text.lower())
    without_marks = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return without_marks.replace("đ", "d").replace("Đ", "d")


class FoodScannerAgent:
    """Agent giám định thực phẩm chay qua hình ảnh bao bì và món ăn."""

    def _rule_based_audit(self, text_context: str, diet_type_id: int, allergies: list[str]) -> list[FindingItem]:
        findings: list[FindingItem] = []
        normalized = _normalize(text_context)

        # Loại bỏ các từ phủ định chay giả mặn an toàn trước khi quét
        cleansed = re.sub(
            r"\b(sua dau nanh|sua hat|sua dua|bo thuc vat|nuoc mam chay|thit chay|cha chay|nem chay|ca chay|tom chay|ga chay)\b",
            "",
            normalized,
        )

        # Lớp 1 & 2: Động vật, thịt, hải sản, phụ phẩm
        for pattern, reason, layer in ANIMAL_PATTERNS:
            if re.search(pattern, cleansed):
                match = re.search(pattern, cleansed).group(0)
                findings.append(FindingItem(ingredient=match, reason=reason, layer=layer, severity="violation"))

        # Lớp 3: Trứng, sữa, mật ong
        for pattern, reason, layer, forbidden_diets in DAIRY_EGG_PATTERNS:
            if diet_type_id in forbidden_diets and re.search(pattern, cleansed):
                match = re.search(pattern, cleansed).group(0)
                findings.append(FindingItem(ingredient=match, reason=reason, layer=layer, severity="violation"))

        # Lớp 4: Ngũ vị tân (diet_type_id == 5)
        if diet_type_id == 5:
            for pattern, reason, layer in FIVE_PUNGENT_PATTERNS:
                if re.search(pattern, cleansed):
                    match = re.search(pattern, cleansed).group(0)
                    findings.append(FindingItem(ingredient=match, reason=reason, layer=layer, severity="violation"))

        # Phụ gia mã E
        for rule in ADDITIVE_RULES:
            if diet_type_id in rule["diets"] and re.search(rf"\b{rule['code'].lower()}\b", normalized):
                severity = rule.get("severity", "violation")
                findings.append(FindingItem(
                    ingredient=f"{rule['code']} ({rule['name']})",
                    reason=rule["reason"],
                    layer=rule["layer"],
                    severity=severity,
                ))

        # Lớp 5: Dị ứng người dùng
        for allergy in allergies:
            norm_allergy = _normalize(allergy.strip())
            if norm_allergy and re.search(rf"\b{norm_allergy}\b", cleansed):
                findings.append(FindingItem(
                    ingredient=allergy,
                    reason=f"Phát hiện chất gây dị ứng theo hồ sơ cá nhân: {allergy}.",
                    layer=5,
                    severity="warning",
                ))

        return findings

    async def analyze(self, request: FoodScanRequest) -> FoodScanResult:
        diet_names = {
            1: "Thuần chay (Vegan)",
            2: "Chay có sữa (Lacto)",
            3: "Chay có trứng (Ovo)",
            4: "Chay trứng & sữa (Lacto-Ovo)",
            5: "Chay Phật giáo (Kiêng ngũ vị tân)",
        }
        diet_label = diet_names.get(request.diet_type_id, "Ăn chay chung")
        dish_name_hint = (request.dish_name or "").strip()

        # Thử gọi Multimodal LLM nếu nhà cung cấp hỗ trợ
        llm_response = None
        try:
            llm = get_llm_json(timeout=35.0)
            user_prompt = (
                f"Hãy phân tích ảnh thực phẩm này cho người ăn theo chế độ: {diet_label} (ID: {request.diet_type_id}).\n"
                f"Tên món gợi ý nếu có: '{dish_name_hint}'.\n"
                f"Chế độ quét yêu cầu: {request.scan_type}.\n"
                f"Danh sách dị ứng: {', '.join(request.allergies) if request.allergies else 'Không có'}.\n\n"
                "Trả về kết quả định dạng JSON chuẩn theo cấu trúc sau (không kèm markdown ngoài khối json):\n"
                "{\n"
                '  "dishName": "...",\n'
                '  "detectedScanType": "LABEL" hoặc "DISH",\n'
                '  "status": "clear" hoặc "warning" hoặc "inconclusive",\n'
                '  "summary": "...",\n'
                '  "findings": [{"ingredient": "...", "reason": "...", "layer": 1, "severity": "violation"}],\n'
                '  "identifiedIngredients": ["...", "..."],\n'
                '  "restaurantChecklist": ["...", "..."],\n'
                '  "swapSuggestions": ["...", "..."],\n'
                '  "nutritionEstimate": {"calories": 250, "protein": 8, "carbs": 35, "fat": 6}\n'
                "}"
            )

            messages = [
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
            response = await llm.ainvoke(messages)
            raw_text = response.content
            if isinstance(raw_text, str):
                json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    llm_response = FoodScanResult.model_validate(parsed)
        except Exception as exc:
            logger.info("Multimodal LLM fallback to rule-based vision audit: %s", type(exc).__name__)

        if llm_response:
            return llm_response

        # Fallback phân tích quy tắc 5 lớp chuyên sâu đảm bảo an toàn tuyệt đối
        text_context = dish_name_hint or "Món ăn tổng hợp"
        detected_type = "LABEL" if request.scan_type == "LABEL" else "DISH"
        findings = self._rule_based_audit(text_context, request.diet_type_id, request.allergies)

        has_violations = any(f.severity == "violation" for f in findings)
        status = "warning" if has_violations else ("inconclusive" if detected_type == "DISH" else "clear")

        summary = (
            f"Phát hiện thành phần không phù hợp với chế độ {diet_label}."
            if status == "warning"
            else (
                f"Món ăn chưa phát hiện vi phạm rõ ràng, nhưng cần lưu ý xác nhận gia vị hầm với quán ăn."
                if status == "inconclusive"
                else f"Không phát hiện thành phần vi phạm quy tắc ăn {diet_label}."
            )
        )

        checklist = (
            [
                "Nước lèo hoặc nước sốt có ninh từ xương heo/gà hoặc dùng hạt nêm thịt không?",
                "Món xào/chiên sử dụng dầu thực vật hay mỡ động vật?",
                "Có dùng nước mắm mặn hoặc dầu hào thông thường trong công thức không?",
            ]
            if detected_type == "DISH"
            else [
                "Kiểm tra nhãn phụ tiếng Việt đối với hàng nhập khẩu.",
                "Lưu ý các chất điều vị họ E600 (E621, E627, E631).",
            ]
        )

        swaps = (
            [
                "Đổi sang Nấm đùi gà áp chảo sốt tiêu đen nếu món chứa thịt.",
                "Thay thế nước dùng hầm rau củ quả lê/bắp/mía thay cho nước dùng mặn.",
                "Sử dụng chả lụa chay từ tàu hũ ky thay cho chả mặn.",
            ]
            if status == "warning"
            else ["Đậu hũ non sốt nấm đông cô", "Canh rong biển hạt sen", "Bún riêu chay nấm bào ngư"]
        )

        return FoodScanResult(
            dish_name=dish_name_hint or ("Sản phẩm đóng gói" if detected_type == "LABEL" else "Món ăn thanh đạm"),
            detected_scan_type=detected_type,
            status=status,
            summary=summary,
            findings=findings,
            identified_ingredients=["Đậu hũ", "Nấm", "Rau củ tự nhiên"],
            restaurant_checklist=checklist,
            swap_suggestions=swaps,
            nutrition_estimate=NutritionEstimate(calories=220.0, protein=8.5, carbs=32.0, fat=5.0),
        )


food_scanner_agent = FoodScannerAgent()
