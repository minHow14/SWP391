// D:/SWP391/SWP391/client/src/components/common/RecipeInstructions.jsx
// Hiển thị hướng dẫn nấu ăn dạng danh sách các bước từ chuỗi văn bản.
// Component tách chuỗi hướng dẫn thành từng bước, bỏ số thứ tự có sẵn ở đầu mỗi dòng.
export default function RecipeInstructions({ instructions }) {
  // Một số bản ghi catalog cũ chứa ký tự xuống dòng dạng chuỗi thoát (\n) từ dữ liệu SQL nên phải tách cả hai dạng.
  const steps = typeof instructions === 'string' ? instructions
    .split(/\\r\\n|\\n|\\r|\r\n?|\n/)
    .map((step) => step.trim().replace(/^\d+[.)]\s+/, ''))
    .filter(Boolean) : [];

  if (!steps.length) return <p className="text-secondary mb-0">Chưa cập nhật hướng dẫn.</p>;

  return (
    <ol className="cx-recipe-steps ps-4 mb-0" aria-label="Các bước nấu ăn">
      {steps.map((step, index) => <li key={index}>{step}</li>)}
    </ol>
  );
}
