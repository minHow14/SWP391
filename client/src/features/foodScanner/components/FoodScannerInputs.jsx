// D:/SWP391/SWP391/client/src/features/foodScanner/components/FoodScannerInputs.jsx
import { useRef, useState } from 'react';
import { Alert, Button, Form, Image, Spinner } from 'react-bootstrap';

const SCAN_TYPES = { AUTO: 'Tự động nhận diện', LABEL: 'Bao bì / Nhãn thành phần', DISH: 'Đĩa món ăn thực tế' };

export default function FoodScannerInputs({ scanner, dietOptions, diet }) {
  const input = useRef(null);
  const [tab, setTab] = useState('image');
  const [dragging, setDragging] = useState(false);
  return <>
    <div className="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Phương thức kiểm tra">
      <Button variant={tab === 'image' ? 'success' : 'outline-success'} onClick={() => setTab('image')}>Quét bằng hình ảnh (AI Vision)</Button>
      <Button variant={tab === 'text' ? 'success' : 'outline-success'} onClick={() => setTab('text')}>Nhập danh sách chữ</Button>
    </div>
    <Form.Group controlId="scan-diet" className="mb-3">
      <Form.Label>Chế độ ăn chay áp dụng</Form.Label>
      <Form.Select value={diet.id} onChange={(event) => diet.onChange(Number(event.target.value))} disabled={scanner.loading}>
        {dietOptions.map((item) => <option key={item.diet_type_id} value={item.diet_type_id}>{item.emoji} {item.name}</option>)}
      </Form.Select>
    </Form.Group>
    <Form.Group controlId="scan-name" className="mb-3">
      <Form.Label>Tên món ăn / Sản phẩm (Tùy chọn)</Form.Label>
      <Form.Control value={scanner.name} maxLength={150} onChange={(event) => scanner.setName(event.target.value)} disabled={scanner.loading} />
    </Form.Group>
    {tab === 'image' ? <Form onSubmit={scanner.analyze}>
      <fieldset disabled={scanner.loading}>
        <legend className="h6">Loại hình ảnh quét</legend>
        <div className="d-flex flex-wrap gap-3 mb-3">
          {Object.entries(SCAN_TYPES).map(([value, label]) => <Form.Check key={value} id={`scan-${value}`} type="radio"
            label={label} name="scanType" checked={scanner.scanType === value} onChange={() => scanner.setScanType(value)} />)}
        </div>
        <div className={`cx-scan-upload border rounded p-4 text-center mb-3 ${dragging ? 'bg-light border-success' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); if (!scanner.loading) scanner.selectFile(event.dataTransfer.files[0]); }}>
          <p className="fw-semibold mb-1">Tải ảnh chụp sản phẩm hoặc món ăn</p>
          <p className="text-muted small">Hỗ trợ JPG, PNG, WebP • Tối đa 10 MB</p>
          <Form.Label htmlFor="scan-photo" className="visually-hidden">Ảnh món ăn hoặc bao bì</Form.Label>
          <Form.Control ref={input} id="scan-photo" type="file" className="visually-hidden" accept="image/jpeg,image/png,image/webp"
            onChange={(event) => { scanner.selectFile(event.target.files[0]); event.target.value = ''; }} />
          <Button variant="success" onClick={() => input.current?.click()}>Chọn từ máy</Button>
          <p className="small text-muted mt-2">Hoặc kéo thả ảnh vào khung này.</p>
          {scanner.photo && <figure className="cx-scan-preview mt-3 mb-0">
            <Image src={scanner.photo.dataUrl} alt="Ảnh đã tải lên" fluid rounded style={{ maxHeight: 280 }} />
            <figcaption className="small text-muted text-break mt-2">{scanner.photo.name}</figcaption>
            <Button variant="link" className="text-danger" onClick={scanner.removePhoto}>Xóa ảnh</Button>
          </figure>}
        </div>
      </fieldset>
      <Button variant="success" size="lg" className="w-100" type="submit" disabled={scanner.loading || !scanner.photo?.base64}>
        {scanner.loading ? <><Spinner size="sm" animation="border" /> Đang phân tích hình ảnh…</> : 'Phân tích bằng AI Vision'}
      </Button>
    </Form> : <Form onSubmit={scanner.analyzeText}>
      <Form.Group controlId="scan-ingredients" className="mb-3">
        <Form.Label>Danh sách thành phần in trên bao bì</Form.Label>
        <Form.Control as="textarea" rows={4} maxLength={10000} value={scanner.ingredients} onChange={(event) => scanner.setIngredients(event.target.value)} />
      </Form.Group>
      <Button variant="success" size="lg" className="w-100" type="submit">Kiểm tra danh sách thành phần</Button>
    </Form>}
    {scanner.error && <Alert variant="danger" className="mt-3">{scanner.error}</Alert>}
  </>;
}
