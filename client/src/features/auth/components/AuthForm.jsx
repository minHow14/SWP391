// D:/SWP391/SWP391/client/src/features/auth/components/AuthForm.jsx
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Col, Container, Form, InputGroup, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router';
import AuthHeader from './AuthHeader.jsx';
import { authService } from '../../../services/authService.js';
import { getSessionSnapshot, setSession } from '../../../utils/session.js';
import { getAuthDestination } from '../utils/authRedirect.js';
import { loginSchema, registrationSchema } from '../utils/authValidation.js';

export default function AuthForm({ isRegister = false }) {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const inFlight = useRef(false);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(isRegister ? registrationSchema : loginSchema),
    defaultValues: { email: '', password: '', full_name: '', remember: false, agreement: false },
  });

  async function submit(values) {
    if (inFlight.current) return;
    inFlight.current = true; setMessage('');
    const snapshot = getSessionSnapshot();
    try {
      const payload = { email: values.email, password: values.password,
        ...(isRegister ? { full_name: values.full_name } : {}) };
      const result = isRegister ? await authService.register(payload) : await authService.login(payload);
      const user = result?.user || result?.data?.user;
      const token = result?.token || result?.data?.token;
      if (snapshot.identityRevision !== getSessionSnapshot().identityRevision) return;
      if (!token || !user) throw new Error('Phản hồi đăng nhập không hợp lệ. Vui lòng thử lại.');
      setSession({ token, user }, { remember: Boolean(values.remember) });
      navigate(getAuthDestination({ user, isRegister }), { replace: true });
    } catch (error) { setMessage(error.message); }
    finally { inFlight.current = false; }
  }

  return <Container as="main" id="main-content" tabIndex={-1} className="cx-auth-page min-vh-100 d-flex align-items-center py-5">
    <Row className="justify-content-center w-100 g-0">
      <Col xs={12} sm={10} md={8} lg={6} xl={5}>
        <Card as="section" className="border-0 rounded-4 shadow-lg overflow-hidden">
          <AuthHeader isRegister={isRegister} />
          <Card.Body className="p-4">
            <Form onSubmit={(event) => handleSubmit(submit)(event)} noValidate aria-busy={isSubmitting} onChange={() => setMessage('')}>
              <fieldset disabled={isSubmitting}>
                <legend className="visually-hidden">Thông tin tài khoản</legend>
                {isRegister && <Form.Group controlId="fullName" className="mb-4">
                  <Form.Label className="small fw-semibold">Họ và tên</Form.Label>
                  <Form.Control type="text" autoComplete="name" maxLength={255} required {...register('full_name')}
                    isInvalid={Boolean(errors.full_name)} aria-invalid={Boolean(errors.full_name)} aria-describedby={errors.full_name ? 'full-name-error' : undefined} />
                  {errors.full_name && <Form.Control.Feedback type="invalid" id="full-name-error" role="alert">{errors.full_name.message}</Form.Control.Feedback>}
                </Form.Group>}
                <Form.Group controlId="account" className="mb-4">
                  <Form.Label className="small fw-semibold">Email</Form.Label>
                  <Form.Control type="email" autoComplete={isRegister ? 'email' : 'username'} maxLength={255} required {...register('email')}
                    isInvalid={Boolean(errors.email)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'account-error' : undefined} />
                  {errors.email && <Form.Control.Feedback type="invalid" id="account-error" role="alert">{errors.email.message}</Form.Control.Feedback>}
                </Form.Group>
                <Form.Group controlId="password" className="mb-4">
                  <Form.Label className="small fw-semibold">Mật khẩu</Form.Label>
                  <InputGroup>
                    <Form.Control type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'}
                      minLength={isRegister ? 8 : undefined} maxLength={128} required {...register('password')}
                      isInvalid={Boolean(errors.password)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} />
                    <Button type="button" variant="outline-secondary" onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword}>
                      <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'} aria-hidden="true" />
                    </Button>
                  </InputGroup>
                  {errors.password && <div className="invalid-feedback d-block" id="password-error" role="alert">{errors.password.message}</div>}
                  {!isRegister && <div className="d-flex justify-content-end mt-2">
                    <Link to="/quen-mat-khau" className="small text-success text-decoration-none">Quên mật khẩu?</Link>
                  </div>}
                </Form.Group>
                <Form.Check id="agreement" className="mb-4 small text-secondary" type="checkbox" required={isRegister}
                  {...register(isRegister ? 'agreement' : 'remember')} isInvalid={Boolean(errors.agreement)}
                  label={isRegister ? <>Tôi đồng ý với <Link to="/dieu-khoan" className="text-success">Điều khoản dịch vụ</Link>{' & '}
                    <Link to="/chinh-sach-bao-mat" className="text-success">Chính sách bảo mật</Link></> : 'Ghi nhớ đăng nhập'} />
                {errors.agreement && <p role="alert" className="small text-danger">{errors.agreement.message}</p>}
                {message && <Alert variant="danger" className="small">{message}</Alert>}
                <Button type="submit" disabled={isSubmitting} variant="success" className="bg-gradient w-100 py-3 rounded-3 fw-semibold shadow-sm">
                  {isSubmitting && <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />}
                  <span role="status">{isSubmitting ? 'Đang xử lý…' : isRegister ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập Ngay'}</span>
                </Button>
              </fieldset>
            </Form>
          </Card.Body>
          <Card.Footer className="text-center bg-success bg-opacity-10 p-3 small">
            Trở về <Link to="/" className="text-success fw-semibold text-decoration-none">Trang chủ Cộng Đồng Chay Xanh</Link>
          </Card.Footer>
        </Card>
      </Col>
    </Row>
  </Container>;
}
