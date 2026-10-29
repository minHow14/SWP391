// client/src/features/restaurants/components/RestaurantProposalForm.jsx
import { useState } from 'react';
import { Alert, Button, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { restaurantTypes } from '../../../constants/restaurantLabels.js';
import { restaurantDirections } from '../../../utils/restaurantDirections.js';

const requiredText = (maxLength) => z.string().trim().min(1, 'Vui lòng điền thông tin này.').max(maxLength, `Tối đa ${maxLength} ký tự.`);
const fullAddress = ({ streetAddress, ward, city }) => [streetAddress, ward, city].filter(Boolean).join(', ');
const proposalSchema = z.object({
  name: requiredText(120),
  city: requiredText(100),
  ward: requiredText(100),
  streetAddress: requiredText(220),
  type: z.enum(restaurantTypes.map((item) => item.id)),
}).refine((values) => fullAddress(values).length <= 255, {
  path: ['streetAddress'], message: 'Địa chỉ đầy đủ gồm số nhà, phường/xã và tỉnh/thành phố không được quá 255 ký tự.',
});

export default function RestaurantProposalForm({ onSubmit }) {
  const [error, setError] = useState('');
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(proposalSchema),
    defaultValues: { name: '', city: '', ward: '', streetAddress: '', type: restaurantTypes[0].id },
  });
  const values = useWatch({ control });
  const address = fullAddress({ streetAddress: values.streetAddress.trim(), ward: values.ward.trim(), city: values.city.trim() });
  const addressComplete = [values.streetAddress, values.ward, values.city].every((value) => value.trim());

  async function submit(proposal) {
    setError('');
    try {
      await onSubmit({
        name: proposal.name, address: fullAddress(proposal), city: proposal.city,
        diet_type_id: proposal.type === 'buddhist' ? 5 : proposal.type === 'separate' ? 4 : 1,
        // The existing API requires nullable coordinates; address entry does not supply them.
        latitude: null, longitude: null,
      });
    } catch (failure) {
      setError(failure.message || 'Chưa thể gửi đề xuất. Vui lòng thử lại.');
    }
  }

  return (
    <Form onSubmit={handleSubmit(submit)} noValidate>
      <p className="text-secondary small">Chia sẻ quán chay bạn yêu thích bằng địa chỉ đầy đủ.</p>
      {error && <Alert variant="danger">{error}</Alert>}
      <fieldset disabled={isSubmitting}>
        <Form.Group controlId="proposal-name" className="mb-3">
          <Form.Label>Tên quán</Form.Label>
          <Form.Control {...register('name')} required maxLength={120} isInvalid={!!errors.name} />
          <Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
        </Form.Group>
        <Row>
          <Col xs={12} sm={6}>
            <Form.Group controlId="proposal-city" className="mb-3">
              <Form.Label>Tỉnh/Thành phố</Form.Label>
              <Form.Control {...register('city')} required maxLength={100} autoComplete="address-level1" isInvalid={!!errors.city} />
              <Form.Control.Feedback type="invalid">{errors.city?.message}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col xs={12} sm={6}>
            <Form.Group controlId="proposal-ward" className="mb-3">
              <Form.Label>Phường/Xã</Form.Label>
              <Form.Control {...register('ward')} required maxLength={100} isInvalid={!!errors.ward} />
              <Form.Control.Feedback type="invalid">{errors.ward?.message}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
        <Form.Group controlId="proposal-street" className="mb-3">
          <Form.Label>Số nhà, tên đường, tòa nhà</Form.Label>
          <Form.Control {...register('streetAddress')} required maxLength={220} autoComplete="street-address" isInvalid={!!errors.streetAddress} />
          <Form.Control.Feedback type="invalid">{errors.streetAddress?.message}</Form.Control.Feedback>
        </Form.Group>
        {addressComplete && <div className="rounded-3 border p-3 mb-3">
          <p className="small mb-2"><strong>Địa chỉ quán:</strong> {address}</p>
          <a href={restaurantDirections({ name: values.name.trim(), address })} target="_blank" rel="noreferrer">
            <i className="bi bi-geo-alt me-1" aria-hidden="true" />Kiểm tra địa chỉ trên bản đồ
          </a>
        </div>}
        <Form.Group controlId="proposal-type" className="mb-3">
          <Form.Label>Phân loại</Form.Label>
          <Form.Select {...register('type')} isInvalid={!!errors.type}>
            {restaurantTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Form.Select>
          <Form.Control.Feedback type="invalid">{errors.type?.message}</Form.Control.Feedback>
        </Form.Group>
        <Button type="submit" variant="success" className="w-100" disabled={isSubmitting}>
          {isSubmitting && <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />}
          {isSubmitting ? 'Đang lưu quán chay…' : 'Lưu Quán Chay'}
        </Button>
      </fieldset>
    </Form>
  );
}
