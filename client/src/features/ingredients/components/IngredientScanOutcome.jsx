// D:/SWP391/SWP391/client/src/features/ingredients/components/IngredientScanOutcome.jsx
const MAX_SUGGESTED_NAMES = 3;

export default function IngredientScanOutcome({ scanner, onSelect, onSearch }) {
  if (scanner.matches.length) {
    return (
      <div role="status">
        <p>AI nhận ra trong từ điển:</p>
        <div className="cx-ingredient-scan-choices">
          {scanner.matches.map((item) => (
            <button type="button" key={item.id} onClick={() => onSelect(item)}>{item.name}</button>
          ))}
        </div>
      </div>
    );
  }
  const names = scanner.names.slice(0, MAX_SUGGESTED_NAMES);
  return (
    <div role="status">
      <p>
        {names.length
          ? `AI nhận ra ${names.join(', ')} nhưng chưa có trong từ điển.`
          : 'AI chưa nhận ra nguyên liệu nào trong ảnh.'}
      </p>
      <div className="cx-ingredient-scan-choices">
        {names.map((name) => (
          <button type="button" key={name} onClick={() => onSearch(name)}>Tìm “{name}”</button>
        ))}
      </div>
    </div>
  );
}
