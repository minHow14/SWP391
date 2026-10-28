// client/src/features/foodScanner/components/FoodScannerImageTab.jsx
import { useRef, useState } from 'react';

const Icon = ({ name }) => <i className={`bi bi-${name}`} aria-hidden="true" />;

export default function FoodScannerImageTab({
  scanType,
  setScanType,
  photo,
  setPhoto,
  loading,
  error,
  setError,
  onSubmit,
  onFileSelected,
  onUseDemo,
}) {
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);

  return (
    <form onSubmit={onSubmit} className="mb-4">
      <div className="mb-3">
        <label className="form-label fw-semibold">
          <Icon name="sliders" /> Loại hình ảnh quét:
        </label>
        <div className="d-flex gap-3">
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="scanType"
              id="scanAuto"
              checked={scanType === 'AUTO'}
              onChange={() => setScanType('AUTO')}
            />
            <label className="form-check-label" htmlFor="scanAuto">
              Tự động nhận diện
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="scanType"
              id="scanLabel"
              checked={scanType === 'LABEL'}
              onChange={() => setScanType('LABEL')}
            />
            <label className="form-check-label" htmlFor="scanLabel">
              Bao bì / Nhãn thành phần
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="scanType"
              id="scanDish"
              checked={scanType === 'DISH'}
              onChange={() => setScanType('DISH')}
            />
            <label className="form-check-label" htmlFor="scanDish">
              Đĩa món ăn thực tế
            </label>
          </div>
        </div>
      </div>

      <div
        className={`cx-scan-upload border rounded p-4 text-center mb-3 ${
          dragging ? 'bg-light border-success' : 'border-dashed'
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          onFileSelected(event.dataTransfer.files[0]);
        }}
      >
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
          <div className="text-start">
            <span className="fs-3 text-success me-2">
              <Icon name="camera-fill" />
            </span>
            <strong>Tải ảnh chụp sản phẩm hoặc món ăn</strong>
            <p className="text-muted small mb-0">Hỗ trợ JPG, PNG, WebP • Tối đa 10 MB</p>
          </div>
          <div className="mt-2 mt-sm-0 d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" type="button" onClick={onUseDemo}>
              <Icon name="magic" /> Thử ảnh mẫu
            </button>
            <button
              className="btn btn-success btn-sm"
              type="button"
              onClick={() => fileInput.current?.click()}
            >
              <Icon name="upload" /> Chọn từ máy
            </button>
          </div>
        </div>

        <input
          className="visually-hidden"
          type="file"
          ref={fileInput}
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            onFileSelected(event.target.files[0]);
            event.target.value = '';
          }}
        />

        {photo ? (
          <figure className="cx-scan-preview my-3 text-center">
            <img
              src={photo.url}
              alt={photo.demo ? 'Ảnh món ăn mẫu' : 'Ảnh đã tải lên'}
              className="img-fluid rounded shadow-sm"
              style={{ maxHeight: '280px', objectFit: 'contain' }}
              onError={() => {
                setPhoto(null);
                setError('Không thể đọc ảnh này. Vui lòng chọn một ảnh khác.');
              }}
            />
            <figcaption className="mt-2 small text-muted d-flex justify-content-center align-items-center gap-3">
              <span>
                <Icon name="image" /> {photo.name}
              </span>
              <button
                type="button"
                className="btn btn-link btn-sm text-danger p-0"
                onClick={() => setPhoto(null)}
              >
                Xóa ảnh
              </button>
            </figcaption>
          </figure>
        ) : (
          <div
            className="py-4 cursor-pointer"
            onClick={() => fileInput.current?.click()}
            style={{ cursor: 'pointer' }}
          >
            <Icon name="cloud-arrow-up fs-1 text-muted" />
            <p className="text-muted mt-2 mb-0">
              Nhấp vào đây hoặc kéo thả ảnh vào khung này để tải lên
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-danger py-2 small" role="alert">
          {error}
        </div>
      )}

      <button
        className="btn btn-success btn-lg w-100 fw-bold"
        type="submit"
        disabled={loading || !photo}
      >
        {loading ? (
          <span>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
            Đang phân tích hình ảnh & đối chiếu quy tắc...
          </span>
        ) : (
          <span>
            <Icon name="robot" /> Phân tích bằng AI Vision
          </span>
        )}
      </button>
    </form>
  );
}
