// D:/SWP391/SWP391/client/src/features/foodScanner/components/FoodScannerResults.jsx
import { Alert, Badge, Button, Card, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router';

const STATUS = {
  clear: { variant: 'success', title: 'PHÙ HỢP VỚI CHẾ ĐỘ ĂN CHAY' },
  warning: { variant: 'danger', title: 'KHÔNG PHÙ HỢP — PHÁT HIỆN THÀNH PHẦN VI PHẠM' },
  inconclusive: { variant: 'warning', title: 'CHƯA ĐỦ THÔNG TIN ĐỂ KẾT LUẬN' },
};
const NUTRIENTS = { calories: ['Năng lượng', 'kcal'], protein: ['Chất đạm', 'g'], carbs: ['Đường bột', 'g'], fat: ['Chất béo', 'g'] };

export default function FoodScannerResults({ result, textResult, onSave }) {
  const status = STATUS[result?.status] || STATUS.inconclusive;
  return <>
    {result && <Alert variant={status.variant} className="mt-4 p-4" aria-label="Kết quả phân tích hình ảnh AI">
      <h2 className="h4 fw-bold">{status.title}</h2>
      <p className="fw-semibold text-break">{result.dishName}</p>
      <p>{result.summary}</p>
      {result.findings?.length > 0 && <Card body className="mb-3">
        <h3 className="h6">Thành phần cần lưu ý</h3>
        <ul className="mb-0">{result.findings.map((item, index) => <li key={`${item.ingredient}-${index}`}>
          <strong>{item.ingredient}:</strong> {item.reason} <Badge bg={item.severity === 'violation' ? 'danger' : 'secondary'}>Lớp {item.layer}</Badge>
        </li>)}</ul>
      </Card>}
      {result.identifiedIngredients?.length > 0 && <p><strong>Nguyên liệu nhận diện được: </strong>{result.identifiedIngredients.join(', ')}</p>}
      {result.restaurantChecklist?.length > 0 && <Card body className="mb-3">
        <h3 className="h6">Câu hỏi nhanh khi dùng bữa ngoài quán</h3>
        <ul className="mb-0">{result.restaurantChecklist.map((question) => <li key={question}>{question}</li>)}</ul>
      </Card>}
      {result.nutritionEstimate ? <>
        <h3 className="h6">Dinh dưỡng ước tính — cần xác nhận theo khẩu phần thực tế</h3>
        <Row className="g-2 mb-3">{Object.entries(NUTRIENTS).map(([key, [label, unit]]) => <Col xs={6} md={3} key={key}>
          <Card body className="text-center"><small>{label}</small><strong className="d-block">{result.nutritionEstimate[key]} {unit}</strong></Card>
        </Col>)}</Row>
      </> : <p>AI chưa cung cấp được số liệu dinh dưỡng. Bạn có thể nhập thông tin đã biết khi lưu nhật ký.</p>}
      <div className="d-flex flex-wrap gap-2 border-top pt-3">
        {result.status === 'clear' && <Button variant="success" onClick={onSave}>Lưu vào Nhật ký ăn uống</Button>}
        {result.status === 'warning' && <Button as={Link} variant="warning" to="/doi-mon-chay">Tìm món chay thay thế</Button>}
        <Button as={Link} variant="outline-secondary" to="/quan-chay">Tìm quán chay lân cận</Button>
      </div>
    </Alert>}
    {textResult && <Alert variant="info" className="mt-4" aria-label="Kết quả kiểm tra văn bản">
      <h2 className="h5">Kết quả đối chiếu từ khóa</h2>
      {textResult.findings.length ? <ul>{textResult.findings.map((item, index) => <li key={`${item.ingredient}-${index}`}>
        <strong>{item.ingredient}:</strong> {item.reason} (Lớp {item.layer})
      </li>)}</ul> : <p className="mb-0">Chưa phát hiện từ khóa thành phần không phù hợp trong danh sách bạn nhập.</p>}
    </Alert>}
  </>;
}
