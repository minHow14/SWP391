// D:/SWP391/SWP391/client/src/features/diet/components/WelcomeModal.jsx
// Hộp thoại bắt buộc chọn kiểu ăn chay trước khi vào ứng dụng (không thể đóng khi chưa xác nhận).
import { useEffect, useRef, useState } from 'react';
import { Alert, Spinner } from 'react-bootstrap';

// Icon Bootstrap tương ứng với từng ID chế độ ăn.
const icons = {
  1: 'leaf',
  2: 'cup-straw',
  3: 'egg',
  4: 'egg-fried',
  5: 'flower1',
  6: 'compass',
  7: 'heart-pulse',
};

// Component chọn chế độ ăn; onConfirm lưu lựa chọn và có thể ném lỗi để hiển thị cho người dùng.
export default function WelcomeModal({ onConfirm, options: dietOptions, initialDietId = '' }) {
  const [selectedDiet, setSelectedDiet] = useState(initialDietId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Khóa đồng bộ chặn gửi trùng khi người dùng bấm xác nhận liên tục (state cập nhật không kịp).
  const saveLock = useRef(false);
  const dialog = useRef(null);

  // Mở dialog dạng modal khi mount, khóa cuộn trang và trả lại focus/overflow khi unmount.
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    // Lắng nghe trực tiếp: thao tác hủy gốc của dialog (phím Esc) không bao giờ được đóng cổng chọn này.
    const preventCancel = (event) => event.preventDefault();
    element.addEventListener('cancel', preventCancel);
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      element.removeEventListener('cancel', preventCancel);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  // Xác nhận lựa chọn: tìm chế độ ăn đã chọn rồi gọi onConfirm, hiển thị lỗi nếu lưu thất bại.
  async function handleConfirm(event) {
    event.preventDefault();
    if (saveLock.current) return;
    const diet = dietOptions.find((item) => item.diet_type_id === selectedDiet);
    if (!diet) return;
    saveLock.current = true;
    setSaving(true);
    setError('');
    try {
      await onConfirm(diet);
    } catch (failure) {
      setError(failure.message || 'Không thể lưu kiểu ăn chay. Vui lòng thử lại.');
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="diet-dialog"
      aria-labelledby="welcomeTitle"
      aria-describedby="welcomeDescription"
      closedby="none"
    >
      <div className="diet-dialog-heading">
        <span className="cx-icon-tile">
          <i className="bi bi-leaf" aria-hidden="true" />
        </span>
        <span className="badge bg-success-subtle text-success">
          Bắt buộc chọn
        </span>
      </div>
      <p className="cx-eyebrow mt-4">BỮA ĂN THEO CÁCH CỦA BẠN</p>
      <h2 id="welcomeTitle">Bạn chọn kiểu ăn chay nào?</h2>
      <p id="welcomeDescription" className="text-secondary">
        Vui lòng chọn loại ăn chay và xác nhận trước khi vào ChayXanh. Bạn có
        thể đổi lựa chọn sau khi vào trang chủ.
      </p>
      <form onSubmit={handleConfirm} aria-busy={saving}>
        <fieldset className="border-0 p-0" disabled={saving}>
          <legend className="visually-hidden">Chọn loại ăn chay</legend>
          <div className="row g-3 mt-1">
            {dietOptions.map((diet) => (
              <div className="col-12 col-sm-6" key={diet.diet_type_id}>
                <label
                  className={`diet-option ${selectedDiet === diet.diet_type_id ? 'is-selected' : ''}`}
                >
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <i
                      className={`bi bi-${icons[diet.diet_type_id] || 'leaf'} fs-4`}
                      aria-hidden="true"
                    />
                    <input
                      type="radio"
                      name="dietType"
                      value={diet.diet_type_id}
                      checked={selectedDiet === diet.diet_type_id}
                      onChange={() => setSelectedDiet(diet.diet_type_id)}
                      className="form-check-input"
                      required
                    />
                  </div>
                  <span className="d-block fw-bold mb-1">{diet.name}</span>
                  <span className="d-block small text-secondary">
                    {diet.description}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </fieldset>
        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
        <button
          type="submit"
          className="btn btn-success w-100 py-3 mt-4"
          disabled={!selectedDiet || saving}
        >
          {saving ? <><Spinner size="sm" animation="border" className="me-2" aria-hidden="true" />Đang lưu kiểu ăn chay…</> : <>Xác nhận & vào ChayXanh <i className="bi bi-arrow-right ms-2" aria-hidden="true" /></>}
        </button>
      </form>
    </dialog>
  );
}
