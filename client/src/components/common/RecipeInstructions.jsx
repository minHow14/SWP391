// D:/SWP391/SWP391/client/src/components/common/RecipeInstructions.jsx
export default function RecipeInstructions({ instructions }) {
  // Existing catalog entries can contain literal newline escapes from SQL text.
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
