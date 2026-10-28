// client/src/features/diet/components/WelcomeModal.jsx
import { useState } from 'react';
import { Modal, Button, Row, Col } from 'react-bootstrap';
import { saveDiet } from '../../../utils/dietSelection.js';

const icons = {
  1: 'leaf',
  2: 'cup-straw',
  3: 'egg',
  4: 'egg-fried',
  5: 'flower1',
  6: 'compass',
  7: 'heart-pulse',
};

export default function WelcomeModal({ onConfirm, options: dietOptions }) {
  const [selectedDiet, setSelectedDiet] = useState('');

  function handleConfirm(event) {
    event.preventDefault();
    const diet = dietOptions.find((item) => item.diet_type_id === selectedDiet);
    if (!diet) return;
    saveDiet(diet, dietOptions);
    onConfirm(diet);
  }

  return (
    <Modal
      show={true}
      backdrop="static"
      keyboard={false}
      centered
      size="lg"
      dialogClassName="diet-dialog"
      contentClassName="p-4 rounded-4 border-0 shadow-lg"
      aria-labelledby="welcomeTitle"
      aria-describedby="welcomeDescription"
    >
      <div className="diet-dialog-heading d-flex justify-content-between align-items-center">
        <span className="cx-icon-tile">
          <i className="bi bi-leaf" aria-hidden="true" />
        </span>
        <span className="badge bg-success-subtle text-success">
          Bắt buộc chọn
        </span>
      </div>
      <p className="cx-eyebrow mt-4 mb-1">BỮA ĂN THEO CÁCH CỦA BẠN</p>
      <h2 id="welcomeTitle" className="fw-bold mb-2">Bạn chọn kiểu ăn chay nào?</h2>
      <p id="welcomeDescription" className="text-secondary small mb-3">
        Vui lòng chọn loại ăn chay và xác nhận trước khi vào ChayXanh. Bạn có
        thể đổi lựa chọn sau khi vào trang chủ.
      </p>
      <form onSubmit={handleConfirm}>
        <fieldset className="border-0 p-0">
          <legend className="visually-hidden">Chọn loại ăn chay</legend>
          <Row className="g-3 mt-1">
            {dietOptions.map((diet) => (
              <Col xs={12} sm={6} key={diet.diet_type_id}>
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
              </Col>
            ))}
          </Row>
        </fieldset>
        <Button
          type="submit"
          variant="success"
          className="w-100 py-3 mt-4 fw-bold"
          disabled={!selectedDiet}
        >
          Xác nhận & vào ChayXanh{' '}
          <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
        </Button>
      </form>
    </Modal>
  );
}
