// client/src/components/recognition/PhotoUploadZone.jsx
import { useRef, useState } from 'react';
import { Card, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export default function PhotoUploadZone({ onAnalyze, isLoading, diets = [] }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dietTypeId, setDietTypeId] = useState('');
  const [maxPrepTime, setMaxPrepTime] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const validateAndSetFile = (file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg('Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setErrorMsg('Kích thước ảnh vượt quá 10 MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    setErrorMsg('');
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Vui lòng chọn hoặc chụp ảnh nguyên liệu / tủ lạnh trước.');
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);
    if (dietTypeId) formData.append('dietTypeId', dietTypeId);
    if (maxPrepTime) formData.append('maxPrepTime', maxPrepTime);

    onAnalyze(formData);
  };

  return (
    <Card className="shadow-sm border-0 mb-4">
      <Card.Body className="p-4">
        {errorMsg && (
          <Alert variant="danger" dismissible onClose={() => setErrorMsg('')}>
            <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
            {errorMsg}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <div
            className={`p-4 text-center rounded border-2 ${
              dragActive ? 'border-success bg-light' : 'border-dashed'
            } mb-3`}
            style={{
              borderStyle: 'dashed',
              borderColor: dragActive ? '#198754' : '#ced4da',
              cursor: 'pointer',
              backgroundColor: '#f8f9fa',
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="d-none"
              onChange={(e) => validateAndSetFile(e.target.files?.[0])}
              aria-label="Chọn ảnh chụp nguyên liệu hoặc tủ lạnh"
            />

            {previewUrl ? (
              <div>
                <img
                  src={previewUrl}
                  alt="Ảnh nguyên liệu đã chọn"
                  className="img-fluid rounded mb-2 shadow-sm"
                  style={{ maxHeight: '240px', objectFit: 'contain' }}
                />
                <p className="text-muted small mb-0">
                  <i className="bi bi-check-circle-fill text-success me-1" aria-hidden="true" />
                  {selectedFile?.name} ({(selectedFile?.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="text-decoration-none mt-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Đổi ảnh khác
                </Button>
              </div>
            ) : (
              <div className="py-3">
                <i className="bi bi-camera-fill fs-1 text-success mb-2 d-block" aria-hidden="true" />
                <h6 className="fw-bold mb-1">Chụp hoặc Kéo thả ảnh tủ lạnh / nguyên liệu vào đây</h6>
                <p className="text-muted small mb-3">Hỗ trợ JPG, PNG, WebP • Tối đa 10 MB</p>
                <Button variant="outline-success" size="sm" type="button">
                  <i className="bi bi-upload me-1" aria-hidden="true" /> Chọn ảnh từ thiết bị
                </Button>
              </div>
            )}
          </div>

          <Row className="g-3 mb-3">
            <Col xs={12} md={6}>
              <Form.Group controlId="recognition-diet-type">
                <Form.Label className="small fw-semibold">
                  <i className="bi bi-funnel me-1" aria-hidden="true" /> Trường phái ăn chay lọc món
                </Form.Label>
                <Form.Select
                  value={dietTypeId}
                  onChange={(e) => setDietTypeId(e.target.value)}
                  disabled={isLoading}
                  size="sm"
                >
                  <option value="">Tất cả trường phái (Mặc định)</option>
                  {diets.map((d) => (
                    <option key={d.diet_type_id} value={d.diet_type_id}>
                      {d.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group controlId="recognition-prep-time">
                <Form.Label className="small fw-semibold">
                  <i className="bi bi-stopwatch me-1" aria-hidden="true" /> Thời gian nấu tối đa
                </Form.Label>
                <Form.Select
                  value={maxPrepTime}
                  onChange={(e) => setMaxPrepTime(e.target.value)}
                  disabled={isLoading}
                  size="sm"
                >
                  <option value="">Không giới hạn</option>
                  <option value="15">Dưới 15 phút (Nhanh gọn)</option>
                  <option value="30">Dưới 30 phút</option>
                  <option value="60">Dưới 1 tiếng</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Button
            type="submit"
            variant="success"
            className="w-100 py-2 fw-semibold"
            disabled={isLoading || !selectedFile}
          >
            {isLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" role="status" aria-hidden="true" />
                AI đang quét ảnh & phân tích độ tươi...
              </>
            ) : (
              <>
                <i className="bi bi-magic me-2" aria-hidden="true" />
                Nhận Diện Nguyên Liệu & Gợi Ý Món Ăn
              </>
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}
