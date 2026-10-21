// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/profile/components/HealthProfileNotice.jsx
import { Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router';

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
