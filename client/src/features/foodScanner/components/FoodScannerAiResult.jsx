// client/src/features/foodScanner/components/FoodScannerAiResult.jsx
import { useNavigate } from 'react-router';

const Icon = ({ name }) => <i className={`bi bi-${name}`} aria-hidden="true" />;

export default function FoodScannerAiResult({
  aiResult,
  dishName,
  selectedDiet,
}) {
  const navigate = useNavigate();

  if (!aiResult) return null;

  return (
    <section
      className={`alert ${
        aiResult.status === 'clear'
          ? 'alert-success border-success'
          : aiResult.status === 'warning'
          ? 'alert-danger border-danger'
          : 'alert-warning border-warning'
      } mt-4 p-4 rounded-3 shadow-sm`}
      aria-label="Kết quả phân tích hình ảnh AI"
    >
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="fs-3">
          <Icon
            name={
              aiResult.status === 'clear'
                ? 'check-circle-fill text-success'
                : aiResult.status === 'warning'
                ? 'x-circle-fill text-danger'
                : 'exclamation-triangle-fill text-warning'
            }
          />
        </span>
        <h2 className="h4 mb-0 fw-bold">
          {aiResult.status === 'clear'
            ? 'PHÙ HỢP VỚI CHẾ ĐỘ ĂN CHAY'
            : aiResult.status === 'warning'
            ? 'KHÔNG PHÙ HỢP — PHÁT HIỆN THÀNH PHẦN VI PHẠM'
            : 'CẦN THẬN TRỌNG — CÓ NGUY CƠ GIA VỊ ẨN'}
        </h2>
      </div>

      <p className="mb-2">
        Món <strong>“{aiResult.dishName || dishName || 'Món đã quét'}”</strong> (
        {aiResult.detectedScanType === 'LABEL' ? 'Bao bì nhãn thành phần' : 'Đĩa món ăn chế biến'}) đã
        được thẩm định theo chế độ <strong>{selectedDiet?.name || 'Ăn chay'}</strong>.
      </p>

      <p className="fw-semibold text-secondary mb-3">{aiResult.summary}</p>

      {/* Thành phần vi phạm hoặc cảnh báo */}
      {aiResult.findings?.length > 0 && (
        <div className="card mb-3 border-0 bg-white shadow-sm p-3">
          <h3 className="h6 text-danger fw-bold mb-2">
            <Icon name="exclamation-octagon-fill" /> Các thành phần phát hiện vi phạm / cần lưu ý:
          </h3>
          <ul className="list-group list-group-flush small">
            {aiResult.findings.map((finding, idx) => (
              <li
                key={idx}
                className="list-group-item d-flex justify-content-between align-items-start px-0"
              >
                <div>
                  <strong>{finding.ingredient}</strong>: {finding.reason}
                </div>
                <span
                  className={`badge ${
                    finding.severity === 'violation' ? 'bg-danger' : 'bg-warning text-dark'
                  }`}
                >
                  Lớp {finding.layer}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nguyên liệu chay an toàn */}
      {aiResult.identifiedIngredients?.length > 0 && (
        <div className="mb-3">
          <span className="fw-semibold small text-muted">Nguyên liệu thực vật an toàn đã phát hiện: </span>
          <div className="d-flex flex-wrap gap-1 mt-1">
            {aiResult.identifiedIngredients.map((item, idx) => (
              <span
                key={idx}
                className="badge bg-success-subtle text-success border border-success-subtle"
              >
                ✓ {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Checklist hỏi quán ăn ngoài */}
      {aiResult.restaurantChecklist?.length > 0 && (
        <div className="card mb-3 border-0 bg-white shadow-sm p-3">
          <h3 className="h6 text-primary fw-bold mb-2">
            <Icon name="chat-square-quote-fill" /> Câu hỏi nhanh khi dùng bữa ngoài quán:
          </h3>
          <ul className="mb-0 small text-secondary">
            {aiResult.restaurantChecklist.map((question, idx) => (
              <li key={idx} className="mb-1">
                {question}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ước tính dinh dưỡng */}
      {aiResult.nutritionEstimate?.calories > 0 && (
        <div className="row g-2 mb-3 text-center">
          <div className="col-3">
            <div className="bg-white rounded p-2 shadow-sm">
              <div className="small text-muted">Năng lượng</div>
              <strong className="text-success">{aiResult.nutritionEstimate.calories} kcal</strong>
            </div>
          </div>
          <div className="col-3">
            <div className="bg-white rounded p-2 shadow-sm">
              <div className="small text-muted">Chất đạm</div>
              <strong className="text-primary">{aiResult.nutritionEstimate.protein}g</strong>
            </div>
          </div>
          <div className="col-3">
            <div className="bg-white rounded p-2 shadow-sm">
              <div className="small text-muted">Đường bột</div>
              <strong className="text-warning">{aiResult.nutritionEstimate.carbs}g</strong>
            </div>
          </div>
          <div className="col-3">
            <div className="bg-white rounded p-2 shadow-sm">
              <div className="small text-muted">Chất béo</div>
              <strong className="text-danger">{aiResult.nutritionEstimate.fat}g</strong>
            </div>
          </div>
        </div>
      )}

      {/* Hành động liên kết thông minh */}
      <div className="d-flex flex-wrap gap-2 pt-2 border-top">
        {aiResult.status === 'warning' && (
          <button
            type="button"
            className="btn btn-warning btn-sm fw-bold"
            onClick={() => navigate('/doi-mon-chay')}
          >
            <Icon name="arrow-repeat" /> Tìm món chay thay thế (Đổi món)
          </button>
        )}
        {aiResult.status === 'clear' && (
          <button
            type="button"
            className="btn btn-success btn-sm fw-bold"
            onClick={() => navigate('/nhat-ky')}
          >
            <Icon name="journal-bookmark-fill" /> Lưu vào Nhật ký ăn uống
          </button>
        )}
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => navigate('/quan-chay')}
        >
          <Icon name="geo-alt-fill" /> Tìm quán chay lân cận
        </button>
      </div>
    </section>
  );
}
