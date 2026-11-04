// D:/SWP391/SWP391/client/src/features/chat/components/ChatFoodScanMessage.jsx
import { Alert } from 'react-bootstrap';
import { Link } from 'react-router';

const NUTRIENTS = { calories: ['Năng lượng', 'kcal'], protein: ['Đạm', 'g'], carbs: ['Tinh bột', 'g'], fat: ['Chất béo', 'g'] };

export default function ChatFoodScanMessage({ result }) {
  return <Alert variant={result.status === 'warning' ? 'warning' : result.status === 'clear' ? 'success' : 'secondary'} className="mb-0" aria-label="Kết quả quét ảnh trong chat">
    <strong className="d-block">{result.dishName}</strong>
    {result.summary && <p>{result.summary}</p>}
    {result.identifiedIngredients?.length > 0 && <p>Nguyên liệu nhận diện: {result.identifiedIngredients.join(', ')}</p>}
    {result.findings?.length > 0 && <><strong>Thành phần cần lưu ý</strong><ul>{result.findings.map((finding, index) => <li key={index}>
      <strong>{finding.ingredient}: </strong><span>{finding.reason}</span>
    </li>)}</ul></>}
    {result.swapSuggestions?.length > 0 && <><strong>Gợi ý thay thế từ lần quét này</strong><ul>{result.swapSuggestions.map((suggestion, index) => <li key={index}>{suggestion}</li>)}</ul></>}
    {result.nutritionEstimate && <><strong>Dinh dưỡng ước tính — cần xác nhận theo khẩu phần thực tế</strong><ul>
      {Object.entries(NUTRIENTS).filter(([key]) => result.nutritionEstimate[key] != null).map(([key, [label, unit]]) => <li key={key}>{label}: {result.nutritionEstimate[key]} {unit}</li>)}
    </ul></>}
    <p className="small">Ảnh không thể xác nhận mọi thành phần hay gia vị ẩn.</p>
    <Link to="/kiem-tra-mon">Mở trang kiểm tra món</Link>
  </Alert>;
}
