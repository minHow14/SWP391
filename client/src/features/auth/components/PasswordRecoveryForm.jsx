// D:/SWP391/SWP391/client/src/features/auth/components/PasswordRecoveryForm.jsx
import { Alert, Button, Card, Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router';
import usePasswordRecovery from '../hooks/usePasswordRecovery.js';
import RecoveryEmailStep from './RecoveryEmailStep.jsx';
import RecoveryPasswordStep from './RecoveryPasswordStep.jsx';
import '../passwordRecovery.css';

export default function PasswordRecoveryForm({ isReset = false, token = '' }) {
  const recovery = usePasswordRecovery({ isReset, token });
  const isPassword = recovery.step === 'password';
  const isSuccess = recovery.step === 'success';
  const title = isSuccess ? 'Mật khẩu đã được cập nhật' : isPassword ? 'Đặt mật khẩu mới' : 'Quên mật khẩu';
  const description = isSuccess ? 'Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.'
    : isPassword ? 'Chọn mật khẩu mới để bảo vệ tài khoản của bạn.'
      : 'Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu.';
  const error = recovery.invalidLink ? 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã OTP mới.' : recovery.error;

  return <Container fluid as="main" id="main-content" tabIndex={-1} className="cx-auth-page cx-recovery-page d-flex align-items-center">
    <Row className="justify-content-center w-100 g-0">
      <Col xs={12} sm={10} md={8} lg={6}>
        <Card as="section" body className="cx-recovery-card" aria-labelledby="recovery-title">
          <h1 id="recovery-title">{title}</h1>
          <p className="cx-recovery-description">{description}</p>
          {error && <Alert variant="danger">{error}</Alert>}
          {recovery.notice && <Alert variant="success" role="status">{recovery.notice}</Alert>}
          {!recovery.invalidLink && !isSuccess && (isPassword
            ? <RecoveryPasswordStep recovery={recovery} />
            : <RecoveryEmailStep recovery={recovery} />)}
          {recovery.invalidLink && <Button as={Link} to="/quen-mat-khau" role="link" variant="success" className="cx-recovery-action w-100">Yêu cầu mã OTP mới</Button>}
          <div className="cx-recovery-footer">
            <Button as={Link} to="/dang-nhap" role="link" variant={isSuccess ? 'success' : 'outline-success'}>
              <i className="bi bi-arrow-left" aria-hidden="true" />Đăng nhập
            </Button>
          </div>
        </Card>
      </Col>
    </Row>
  </Container>;
}
