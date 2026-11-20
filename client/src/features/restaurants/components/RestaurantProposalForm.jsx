// D:/SWP391/SWP391/client/src/features/restaurants/components/RestaurantProposalForm.jsx
// Form đề xuất quán chay mới: nhập địa chỉ chi tiết, lấy GPS tại quán, chọn loại quán và thông tin hoạt động.
import { useState } from 'react';
import { Alert, Button, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { restaurantTypes } from '../../../constants/restaurantLabels.js';
import { restaurantDirections } from '../../../utils/restaurantDirections.js';
import { getPosition, geocodeAddress } from '../utils/nearbyHelpers.js';
import '../styles/restaurantProposal.css';

// Danh sách tỉnh/thành phổ biến để gợi ý nhanh trong ô nhập (người dùng vẫn có thể gõ tỉnh khác).
const VIETNAM_POPULAR_CITIES = [
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Cần Thơ',
  'Huế',
  'Khánh Hòa',
  'Lâm Đồng',
  'Bình Dương',
  'Đồng Nai',
  'Hải Phòng',
  'Quảng Nam',
  'Bà Rịa - Vũng Tàu',
];

// Các mức giá tham khảo cho người dùng chọn.
const PRICE_RANGE_OPTIONS = [
  { value: '', label: '-- Chọn mức giá tham khảo --' },
  { value: 'Bình dân (20.000đ - 45.000đ)', label: 'Bình dân (20.000đ - 45.000đ)' },
  { value: 'Trung cấp (45.000đ - 90.000đ)', label: 'Trung cấp (45.000đ - 90.000đ)' },
  { value: 'Cao cấp / Buffet (> 90.000đ)', label: 'Cao cấp / Buffet (> 90.000đ)' },
];

// Tạo schema chuỗi bắt buộc với độ dài tối đa cho trước.
const requiredText = (maxLength) =>
  z
    .string()
    .trim()
    .min(1, 'Vui lòng điền thông tin này.')
    .max(maxLength, `Tối đa ${maxLength} ký tự.`);

// Tạo schema chuỗi tùy chọn (cho phép rỗng) với độ dài tối đa cho trước.
const optionalText = (maxLength) =>
  z
    .string()
    .trim()
    .max(maxLength, `Tối đa ${maxLength} ký tự.`)
    .optional()
    .or(z.literal(''));

// Ghép các phần địa chỉ thành chuỗi đầy đủ, bỏ qua phần trống.
const fullAddress = ({ streetAddress, ward, district, city }) =>
  [streetAddress, ward, district, city].filter(Boolean).join(', ');

// Schema đề xuất quán; địa chỉ ghép đầy đủ giới hạn 255 ký tự cho khớp độ dài cột trong DB.
const proposalSchema = z
  .object({
    name: requiredText(120),
    city: requiredText(100),
    district: optionalText(100),
    ward: requiredText(100),
    streetAddress: requiredText(220),
    type: z.enum(restaurantTypes.map((item) => item.id)),
    phone: optionalText(50),
    hours: optionalText(100),
    price_range: optionalText(100),
    separate_kitchen: z.boolean().default(false),
  })
  .refine((values) => fullAddress(values).length <= 255, {
    path: ['streetAddress'],
    message: 'Địa chỉ đầy đủ không được vượt quá 255 ký tự.',
  });

// Component form đề xuất; onSubmit gửi dữ liệu đã chuẩn hóa lên server.
export default function RestaurantProposalForm({ onSubmit }) {
  const [error, setError] = useState('');
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'locating' | 'success' | 'error'
  const [coords, setCoords] = useState(null);
  const [gpsMessage, setGpsMessage] = useState('');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      name: '',
      city: '',
      district: '',
      ward: '',
      streetAddress: '',
      type: restaurantTypes[0].id,
      phone: '',
      hours: '',
      price_range: '',
      separate_kitchen: false,
    },
  });

  // Theo dõi giá trị form theo thời gian thực để hiển thị địa chỉ hoàn chỉnh và link kiểm tra Google Maps.
  const values = useWatch({ control });
  const address = fullAddress({
    streetAddress: (values.streetAddress || '').trim(),
    ward: (values.ward || '').trim(),
    district: (values.district || '').trim(),
    city: (values.city || '').trim(),
  });
  const addressComplete = [values.streetAddress, values.ward, values.city].every(
    (value) => typeof value === 'string' && value.trim()
  );

  // Lấy tọa độ GPS hiện tại (bỏ qua cache) khi người dùng đang đứng tại quán.
  async function handleGetGps() {
    setGpsStatus('locating');
    setGpsMessage('Đang lấy tọa độ GPS từ thiết bị...');
    try {
      const pos = await getPosition(undefined, { forceRefresh: true });
      setCoords(pos);
      setGpsStatus('success');
      setGpsMessage(`Đã lấy vị trí thiết bị: ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
    } catch (err) {
      setGpsStatus('error');
      setGpsMessage(err.message || 'Không thể lấy vị trí GPS.');
    }
  }

  // Chuẩn hóa và gửi đề xuất quán lên server.
  async function submit(proposal) {
    setError('');
    const isIngredientShop = proposal.type === 'shop';
    try {
      let finalLat = coords ? coords.lat : null;
      let finalLng = coords ? coords.lng : null;

      // Nếu người dùng không lấy GPS từ thiết bị, tự động tìm toạ độ từ địa chỉ
      if (!finalLat || !finalLng) {
        const geo = await geocodeAddress(address);
        if (geo) {
          finalLat = geo.lat;
          finalLng = geo.lng;
        }
      }

      await onSubmit({
        name: proposal.name,
        address,
        city: proposal.city,
        isIngredientShop,
        // Ánh xạ loại quán sang diet_type_id: Phật giáo = 5, bếp riêng = 4, còn lại = 1 (thuần chay); cửa hàng nguyên liệu không có chế độ ăn.
        diet_type_id: isIngredientShop
          ? null
          : proposal.type === 'buddhist'
            ? 5
            : proposal.type === 'separate'
              ? 4
              : 1,
        latitude: finalLat,
        longitude: finalLng,
        phone: proposal.phone?.trim() || null,
        hours: proposal.hours?.trim() || null,
        price_range: proposal.price_range || null,
        separate_kitchen: isIngredientShop ? null : !!proposal.separate_kitchen,
      });
    } catch (failure) {
      setError(failure.message || 'Chưa thể gửi đề xuất. Vui lòng thử lại.');
    }
  }

  return (
    <Form onSubmit={handleSubmit(submit)} noValidate className="cx-proposal-form">
      <p className="text-secondary small mb-1">
        Chia sẻ quán chay bạn yêu thích bằng địa chỉ đầy đủ để cộng đồng cùng trải nghiệm.
      </p>
      {error && <Alert variant="danger">{error}</Alert>}

      <fieldset disabled={isSubmitting}>
        {/* Phần 1: Thông tin bắt buộc & Vị trí */}
        <div className="cx-proposal-section is-primary mb-3">
          <h6 className="cx-proposal-section-title">
            <i className="bi bi-geo-alt-fill" aria-hidden="true" />
            1. Thông tin cơ bản & Vị trí quán (Bắt buộc)
          </h6>

          <Form.Group controlId="proposal-name" className="mb-3">
            <Form.Label>Tên quán</Form.Label>
            <Form.Control
              {...register('name')}
              required
              maxLength={120}
              placeholder="Ví dụ: Quán Cơm Chay An Duyên"
              isInvalid={!!errors.name}
            />
            <Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
          </Form.Group>

          <Row>
            <Col xs={12} sm={6}>
              <Form.Group controlId="proposal-city" className="mb-3">
                <Form.Label>Tỉnh/Thành phố</Form.Label>
                <Form.Control
                  {...register('city')}
                  required
                  maxLength={100}
                  list="vietnam-cities-list"
                  autoComplete="address-level1"
                  placeholder="Chọn hoặc nhập tỉnh/thành"
                  isInvalid={!!errors.city}
                />
                <datalist id="vietnam-cities-list">
                  {VIETNAM_POPULAR_CITIES.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
                <Form.Control.Feedback type="invalid">{errors.city?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col xs={12} sm={6}>
              <Form.Group controlId="proposal-district" className="mb-3">
                <Form.Label>Quận/Huyện (Tùy chọn)</Form.Label>
                <Form.Control
                  {...register('district')}
                  maxLength={100}
                  placeholder="Ví dụ: Quận 1, Quận Cầu Giấy..."
                  isInvalid={!!errors.district}
                />
                <Form.Control.Feedback type="invalid">{errors.district?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col xs={12} sm={6}>
              <Form.Group controlId="proposal-ward" className="mb-3">
                <Form.Label>Phường/Xã</Form.Label>
                <Form.Control
                  {...register('ward')}
                  required
                  maxLength={100}
                  placeholder="Ví dụ: Phường Bến Nghé"
                  isInvalid={!!errors.ward}
                />
                <Form.Control.Feedback type="invalid">{errors.ward?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col xs={12} sm={6}>
              <Form.Group controlId="proposal-type" className="mb-3">
                <Form.Label>Phân loại</Form.Label>
                <Form.Select {...register('type')} isInvalid={!!errors.type}>
                  {restaurantTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.type?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group controlId="proposal-street" className="mb-3">
            <Form.Label>Số nhà, tên đường, tòa nhà</Form.Label>
            <Form.Control
              {...register('streetAddress')}
              required
              maxLength={220}
              autoComplete="street-address"
              placeholder="Ví dụ: 123 Nguyễn Thị Minh Khai"
              isInvalid={!!errors.streetAddress}
            />
            <Form.Control.Feedback type="invalid">
              {errors.streetAddress?.message}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Hộp GPS định vị */}
          <div className="cx-gps-box">
            <span
              className={`cx-gps-info ${gpsStatus === 'success' ? 'is-success' : ''}`}
              role="status"
            >
              <i
                className={`bi ${gpsStatus === 'success' ? 'bi-check-circle-fill' : 'bi-geo'}`}
                aria-hidden="true"
              />
              {gpsMessage || 'Chưa gắn tọa độ GPS (Khuyến khích khi bạn đang tại quán)'}
            </span>
            <button
              type="button"
              className="cx-gps-btn"
              onClick={handleGetGps}
              disabled={gpsStatus === 'locating'}
            >
              {gpsStatus === 'locating' ? (
                <Spinner animation="border" size="sm" aria-hidden="true" />
              ) : (
                <i className="bi bi-crosshair" aria-hidden="true" />
              )}
              {gpsStatus === 'locating' ? 'Đang xác định…' : 'Lấy GPS tại quán'}
            </button>
          </div>

          {addressComplete && (
            <div className="rounded-3 border p-2 mt-2 bg-white small">
              <span className="text-muted">Địa chỉ hoàn chỉnh: </span>
              <strong>{address}</strong>
              <div className="mt-1">
                <a
                  href={restaurantDirections({ name: values.name?.trim(), address })}
                  target="_blank"
                  rel="noreferrer"
                  className="text-success text-decoration-none"
                >
                  <i className="bi bi-map me-1" aria-hidden="true" />
                  Kiểm tra trên Google Maps
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Phần 2: Thông tin ẩm thực chay & Vận hành (Khuyến khích) */}
        <div className="cx-proposal-section mb-3">
          <h6 className="cx-proposal-section-title is-secondary">
            <i className="bi bi-patch-check-fill" aria-hidden="true" />
            2. Tiêu chuẩn ăn chay & Thông tin hoạt động (Tùy chọn)
          </h6>

          <div
            className={`cx-proposal-check-card ${values.separate_kitchen ? 'is-checked' : ''} mb-3`}
          >
            <Form.Check
              type="checkbox"
              id="proposal-separate-kitchen"
              {...register('separate_kitchen')}
              label={
                <div className="cx-proposal-check-content">
                  <span className="cx-proposal-check-title">
                    Gian bếp & dụng cụ nấu thuần chay riêng biệt
                  </span>
                  <span className="cx-proposal-check-desc">
                    Không chung với đồ mặn, đảm bảo không gian chế biến thuần chay
                  </span>
                </div>
              }
            />
          </div>

          <Row>
            <Col xs={12} sm={6}>
              <Form.Group controlId="proposal-phone" className="mb-3">
                <Form.Label>Số điện thoại liên hệ</Form.Label>
                <Form.Control
                  {...register('phone')}
                  maxLength={50}
                  placeholder="Ví dụ: 0901234567"
                  isInvalid={!!errors.phone}
                />
              </Form.Group>
            </Col>

            <Col xs={12} sm={6}>
              <Form.Group controlId="proposal-hours" className="mb-3">
                <Form.Label>Khung giờ mở cửa</Form.Label>
                <Form.Control
                  {...register('hours')}
                  maxLength={100}
                  placeholder="Ví dụ: 07:00 - 21:00"
                  isInvalid={!!errors.hours}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group controlId="proposal-price-range" className="mb-1">
            <Form.Label>Mức giá tham khảo</Form.Label>
            <Form.Select {...register('price_range')}>
              {PRICE_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </div>

        <Button
          type="submit"
          variant="success"
          className="w-100 py-2 fw-bold"
          disabled={isSubmitting}
          aria-label="Lưu Quán Chay"
        >
          {isSubmitting && (
            <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />
          )}
          {isSubmitting ? 'Đang gửi đề xuất…' : 'Gửi Đề Xuất Quán Chay'}
        </Button>

        <p className="cx-proposal-notice">
          <i className="bi bi-shield-check me-1 text-success" aria-hidden="true" />
          Đề xuất của bạn sẽ được đội ngũ Chay Xanh kiểm duyệt thông tin địa chỉ trước khi hiển thị
          chính thức trên bản đồ.
        </p>
      </fieldset>
    </Form>
  );
}
