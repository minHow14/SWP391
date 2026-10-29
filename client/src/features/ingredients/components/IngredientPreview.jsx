// D:/SWP391/SWP391/client/src/features/ingredients/components/IngredientPreview.jsx
import { useRef } from 'react';
import { useIngredientPhotoScan } from '../hooks/useIngredientPhotoScan.js';
import ScanOutcome from './IngredientScanOutcome.jsx';

export default function IngredientPreview({ ingredients, dietId, onSelect, onSearch }) {
  const upload = useRef(null);
  const scanner = useIngredientPhotoScan({ ingredients, dietId });
  const analyzing = scanner.status === 'analyzing';

  async function pickFile(file) {
    const matches = await scanner.scan(file);
    if (matches.length === 1) onSelect(matches[0]);
  }

  return (
    <section className="cx-ingredient-camera" aria-label="Tra cứu nguyên liệu">
      <div className="cx-camera-toolbar">
        <div className="cx-camera-heading">
          <span className="cx-camera-icon">
            <i className="bi bi-camera-fill" aria-hidden="true" />
          </span>
          <div>
            <h2>
              Khám phá nguyên liệu <span>Thông tin nguyên liệu</span>
            </h2>
            <p>Tìm hiểu nguồn gốc, dinh dưỡng và cách sử dụng nguyên liệu.</p>
          </div>
        </div>
        <div className="cx-camera-actions">
          <button className="cx-camera-upload" type="button" disabled={analyzing} onClick={() => upload.current?.click()}>
            <i className="bi bi-upload" aria-hidden="true" /> Tải Ảnh Nguyên Liệu
          </button>
        </div>
      </div>
      <input
        ref={upload}
        type="file"
        className="visually-hidden"
        aria-label="Chọn ảnh nguyên liệu"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          pickFile(event.target.files[0]);
          event.target.value = '';
        }}
      />
      <p className="cx-camera-note">
        Tải ảnh để AI nhận diện nguyên liệu và mở thông tin, hoặc tìm theo tên ở bên dưới.
      </p>
      {scanner.error && <p className="cx-camera-error" role="alert">{scanner.error}</p>}
      {scanner.photo && (
        <div className="cx-ingredient-upload-preview">
          <img src={scanner.photo.url} alt="Ảnh nguyên liệu đã chọn" />
          <div>
            <strong>{scanner.photo.name}</strong>
            {analyzing && <p role="status">AI đang nhận diện nguyên liệu…</p>}
            {scanner.status === 'done' && <ScanOutcome scanner={scanner} onSelect={onSelect} onSearch={onSearch} />}
            <button type="button" onClick={scanner.clear}>Xóa ảnh</button>
          </div>
        </div>
      )}
    </section>
  );
}
