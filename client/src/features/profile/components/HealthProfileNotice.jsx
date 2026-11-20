// client/src/features/profile/components/HealthProfileNotice.jsx
// Thông báo nhắc người dùng bổ sung chiều cao, cân nặng để dùng BMI và thực đơn cá nhân.
import { Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router';

// Component nhắc bổ sung hồ sơ sức khỏe; onContinue được gọi khi người dùng chuyển tới trang hồ sơ.
export default function HealthProfileNotice({ onContinue }) {
  return (
    <Alert variant="info" className="mb-0">
      <Alert.Heading>Bổ sung hồ sơ sức khỏe</Alert.Heading>
      <p>Điền chiều cao và cân nặng trong hồ sơ để sử dụng BMI và thực đơn cá nhân.</p>
      <p>Các tính năng không cần thông tin sức khỏe vẫn sử dụng bình thường.</p>
      <Button as={Link} to="/ho-so" variant="success" onClick={onContinue}>
        Điền thông tin cá nhân
      </Button>
    </Alert>
  );
}
