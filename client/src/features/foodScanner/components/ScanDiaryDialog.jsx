// D:/SWP391/SWP391/client/src/features/foodScanner/components/ScanDiaryDialog.jsx
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { workspaceService } from '../../../services/workspaceService.js';

const NUTRIENTS = { calories: ['Năng lượng (kcal)', 10000], protein: ['Chất đạm (g)', 1000],
  carbs: ['Đường bột (g)', 1000], fat: ['Chất béo (g)', 1000], fiber: ['Chất xơ (g)', 1000] };
const requiredText = (max) => z.string().trim().min(1, 'Vui lòng điền thông tin.').max(max);
const schema = z.object({
  name: requiredText(255), serving: requiredText(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'Ngày không hợp lệ.'),
  group: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'], { error: 'Vui lòng chọn bữa ăn.' }),
  ...Object.fromEntries(Object.entries(NUTRIENTS).map(([key, [, max]]) => [key, z.number({ error: 'Vui lòng nhập số hợp lệ.' }).min(0).max(max)])),
});

function localDate() {
  const today = new Date();
  return new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function ScanDiaryDialog({ result, userId, onClose, onSaved }) {
  const [error, setError] = useState('');
  const active = useRef(true);
  const saving = useRef(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: {
    name: result.dishName, date: localDate(), serving: '', group: '',
    ...Object.fromEntries(Object.keys(NUTRIENTS).map((key) => [key, result.nutritionEstimate?.[key] ?? ''])),
  } });
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  async function save(entry) {
    if (!userId || saving.current) return;
    saving.current = true; setError('');
    try {
      await workspaceService.addDiaryEntry(entry);
      if (active.current) onSaved();
    } catch (failure) {
      if (active.current) setError(failure.message);
    } finally { saving.current = false; }
  }

  return <Modal show onHide={isSubmitting ? undefined : onClose} backdrop={isSubmitting ? 'static' : true} keyboard={!isSubmitting} aria-labelledby="scan-diary-title">
    <Modal.Header closeButton={!isSubmitting}><Modal.Title id="scan-diary-title">Lưu món ăn vào nhật ký</Modal.Title></Modal.Header>
    {!userId ? <Modal.Body><Alert variant="info">Vui lòng đăng nhập để lưu nhật ký.</Alert><Button as={Link} to="/dang-nhap">Đăng nhập</Button></Modal.Body> : <Form noValidate onSubmit={(event) => handleSubmit(save)(event)}>
      <Modal.Body>
        <p className="small text-muted">Kiểm tra số liệu theo khẩu phần bạn đã ăn. Dữ liệu chưa biết được để trống; không tự quy đổi thành 0.</p>
        {error && <Alert variant="danger">{error}</Alert>}
        <fieldset disabled={isSubmitting}>
          <Form.Group controlId="diary-name" className="mb-3"><Form.Label>Tên món</Form.Label>
            <Form.Control {...register('name')} isInvalid={Boolean(errors.name)} /><Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group controlId="diary-serving" className="mb-3"><Form.Label>Khẩu phần</Form.Label>
            <Form.Control {...register('serving')} isInvalid={Boolean(errors.serving)} /><Form.Control.Feedback type="invalid">{errors.serving?.message}</Form.Control.Feedback>
          </Form.Group>
          <Row className="g-3 mb-3">
            <Col sm={6}><Form.Group controlId="diary-date"><Form.Label>Ngày ăn</Form.Label><Form.Control type="date" {...register('date')} isInvalid={Boolean(errors.date)} />
              <Form.Control.Feedback type="invalid">{errors.date?.message}</Form.Control.Feedback></Form.Group></Col>
            <Col sm={6}><Form.Group controlId="diary-group"><Form.Label>Bữa ăn</Form.Label><Form.Select {...register('group')} isInvalid={Boolean(errors.group)}>
              <option value="">Chọn bữa ăn</option><option value="BREAKFAST">Bữa sáng</option><option value="LUNCH">Bữa trưa</option><option value="DINNER">Bữa tối</option><option value="SNACK">Bữa phụ</option>
            </Form.Select><Form.Control.Feedback type="invalid">{errors.group?.message}</Form.Control.Feedback></Form.Group></Col>
          </Row>
          <Row className="g-3">{Object.entries(NUTRIENTS).map(([key, [label, max]]) => <Col xs={6} key={key}>
            <Form.Group controlId={`diary-${key}`}><Form.Label>{label}</Form.Label>
              <Form.Control type="number" min={0} max={max} step="any" {...register(key, { valueAsNumber: true })} isInvalid={Boolean(errors[key])} />
              <Form.Control.Feedback type="invalid">{errors[key]?.message}</Form.Control.Feedback>
            </Form.Group>
          </Col>)}</Row>
        </fieldset>
      </Modal.Body>
      <Modal.Footer><Button variant="secondary" disabled={isSubmitting} onClick={onClose}>Hủy</Button>
        <Button variant="success" type="submit" disabled={isSubmitting}>{isSubmitting ? <><Spinner size="sm" animation="border" /> Đang lưu…</> : 'Xác nhận lưu'}</Button></Modal.Footer>
    </Form>}
  </Modal>;
}
