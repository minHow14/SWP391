const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const rules = [
  { pattern: /\bnuoc mam ca com\b/, reason: 'Chiết xuất từ cá biển.', layer: 1 },
  { pattern: /\bsa te tom\b/, reason: 'Chứa thành phần hoặc chiết xuất từ tôm biển.', layer: 1 },
  { pattern: /\bxuong (heo|lon|bo|ga)\b/, reason: 'Chiết xuất từ thịt và xương động vật.', layer: 2 },
  { pattern: /\bnuoc mam\b/, reason: 'Có thể chứa cá; cần kiểm tra nguồn gốc nước mắm.', layer: 1 },
  { pattern: /\b(tom|ca com|ca hoi|ca ngu|cua|muc|thit|heo|lon|bo|ga|vit)\b/, reason: 'Phát hiện từ khóa thịt hoặc hải sản.', layer: 1 },
  { pattern: /\b(gelatin|collagen|mo dong vat|dau ca|xuong)\b/, reason: 'Có thể chứa chiết xuất hoặc phụ phẩm động vật.', layer: 2 },
  { pattern: /\b(sua|whey|casein|pho mai|cheese|butter|cream)\b/, reason: 'Thành phần từ sữa không phù hợp với chế độ đã chọn.', layer: 3, allowed: [2, 4, 5] },
  { pattern: /\b(trung|egg)\b/, reason: 'Thành phần trứng không phù hợp với chế độ đã chọn.', layer: 3, allowed: [3, 4] },
  { pattern: /\b(mat ong|honey)\b/, reason: 'Mật ong không phù hợp với chế độ thuần chay.', layer: 3, allowed: [2, 3, 4, 5] },
  { pattern: /\b(hanh|toi|he|kieu|hung cu)\b/, reason: 'Ngũ vị tân cần được loại bỏ trong chế độ chay Phật giáo.', layer: 4, only: 5 },
];

// A bounded text demo, not OCR or a certified ingredient database.
export function analyzeIngredients(ingredients, dietId) {
  if (![1, 2, 3, 4, 5].includes(dietId)) return { status: 'unknown', findings: [] };
  const findings = ingredients.split(/[,;\n]+/).flatMap((ingredient) => {
    const label = ingredient.trim();
    const text = normalize(label)
      .replace(/\btrung (ga|vit|cut)\b/g, 'trung')
      .replace(/\b(sua (dau nanh|hat|dua|hanh nhan|yen mach)|bo (thuc vat|dau phong)|nuoc mam chay|thit chay|cha chay)\b/g, '')
      .replace(/\b(nam (dui ga|bao ngu)|dau ga|hat (dieu|bo)|rau (ngot|ca)|ca (chua|rot|tim))\b/g, '');
    const rule = rules.find((item) => (!item.only || item.only === dietId) && !item.allowed?.includes(dietId) && item.pattern.test(text));
    return rule ? [{ ingredient: label, reason: rule.reason, layer: rule.layer }] : [];
  });
  return { status: findings.length ? 'warning' : 'clear', findings };
}
