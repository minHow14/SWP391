// D:/SWP391/SWP391/client/src/features/auth/components/PasswordRecoveryForm.jsx
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router';
import { authService } from '../../../services/authService.js';
import { forgotPasswordSchema, passwordResetSchema } from '../utils/authValidation.js';

export default function PasswordRecoveryForm({ isReset = false, token = '' }) {
  const [response, setResponse] = useState({ success: '', error: '' });
  const inFlight = useRef(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(isReset ? passwordResetSchema : forgotPasswordSchema),
    defaultValues: { email: '', newPassword: '', confirmNewPassword: '' },
  });
  const invalidToken = isReset && !token;
  const error = invalidToken ? 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.' : response.error;

  async function submit(values) {
    if (inFlight.current || invalidToken) return;
    inFlight.current = true;
    setResponse({ success: '', error: '' });
    try {
      const result = isReset
        ? await authService.resetPassword({ token, newPassword: values.newPassword })
        : await authService.forgotPassword({ email: values.email });
      if (!result?.success || !result.message) throw new Error('Phản hồi chưa hợp lệ. Vui lòng thử lại.');
      setResponse({ success: result.message, error: '' });
    } catch (failure) {
      setResponse({ success: '', error: failure.message || 'Không thể xử lý yêu cầu. Vui lòng thử lại sau.' });
    } finally { inFlight.current = false; }
  }

  return <Container as="main" id="main-content" tabIndex={-1} className="cx-auth-page min-vh-100 d-flex align-items-center py-5">
    <Row className="justify-content-center w-100 g-0">
      <Col xs={12} sm={10} md={8} lg={6} xl={5}>
        <Card as="section" body className="border-0 shadow p-sm-3" aria-labelledby="recovery-title">
          <h1 id="recovery-title" className="h3 text-success">{isReset ? 'Đặt lại mật khẩu' : 'Quên mật khẩu'}</h1>
          <p>{isReset ? 'Nhập mật khẩu mới cho tài khoản của bạn.' : 'Nhập email đã dùng cho tài khoản để yêu cầu hướng dẫn đặt lại mật khẩu.'}</p>
          {error && <Alert variant="danger">{error}</Alert>}
          {response.success && <Alert variant="success">{response.success}</Alert>}
          {!invalidToken && !response.success && <Form onSubmit={(event) => handleSubmit(submit)(event)} noValidate aria-busy={isSubmitting}>
            <fieldset disabled={isSubmitting}>
              <legend className="visually-hidden">Thông tin khôi phục mật khẩu</legend>
              {!isReset ? <Form.Group controlId="recovery-email" className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" autoComplete="email" maxLength={255} required {...register('email')}
                  isInvalid={Boolean(errors.email)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'recovery-email-error' : undefined} />
                {errors.email && <Form.Control.Feedback type="invalid" id="recovery-email-error" role="alert">{errors.email.message}</Form.Control.Feedback>}
              </Form.Group> : <>
                {[['newPassword', 'Mật khẩu mới'], ['confirmNewPassword', 'Xác nhận mật khẩu mới']].map(([name, label]) => <Form.Group key={name} controlId={`recovery-${name}`} className="mb-3">
                  <Form.Label>{label}</Form.Label>
                  <Form.Control type="password" autoComplete="new-password" minLength={8} maxLength={128} required {...register(name)}
                    isInvalid={Boolean(errors[name])} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `recovery-${name}-error` : undefined} />
                  {errors[name] && <Form.Control.Feedback type="invalid" id={`recovery-${name}-error`} role="alert">{errors[name].message}</Form.Control.Feedback>}
                </Form.Group>)}
                <p className="small text-muted">Từ 8 đến 128 ký tự và tối đa 72 byte UTF-8.</p>
              </>}
              <Button type="submit" variant="success" className="w-100" disabled={isSubmitting} aria-label={isSubmitting ? 'Đang gửi yêu cầu' : undefined}>
                {isSubmitting && <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />}
                {isSubmitting ? 'Đang gửi yêu cầu' : isReset ? 'Đặt lại mật khẩu' : 'Gửi hướng dẫn đặt lại mật khẩu'}
              </Button>
            </fieldset>
          </Form>}
          <div className="d-flex flex-wrap gap-3 mt-4">
            <Link to="/dang-nhap">Đăng nhập</Link>
            {isReset && <Link to="/quen-mat-khau">Yêu cầu liên kết mới</Link>}
          </div>
        </Card>
      </Col>
    </Row>
  </Container>;
}
