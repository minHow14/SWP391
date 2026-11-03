// D:/SWP391/SWP391/client/src/features/ingredients/components/IngredientScanOutcome.jsx
import { Button, Spinner } from 'react-bootstrap';

const MAX_SUGGESTED_NAMES = 3;

export default function IngredientScanOutcome({ scanner, onSelect, lookup, onLookup }) {
  if (scanner.matches.length) {
    return (
      <div role="status">
        <p>AI nhận ra trong từ điển:</p>
        <div className="cx-ingredient-scan-choices">
          {scanner.matches.map((item) => (
            <Button type="button" key={item.id} disabled={lookup.busy} onClick={() => onSelect(item)}>{item.name}</Button>
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
          <Button type="button" key={name} disabled={lookup.busy} onClick={() => onLookup(name)}>
            {lookup.busy && lookup.name === name
              ? <><Spinner animation="border" size="sm" aria-hidden="true" /> Đang tạo “{name}”…</>
              : <>Tìm “{name}”</>}
          </Button>
        ))}
      </div>
    </div>
  );
}
