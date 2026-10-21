// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/profile/components/ProfileSetupNotice.jsx
import { Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router';

export default function ProfileSetupNotice() {
  return (
    <Alert variant="info">
      <Alert.Heading>Hoàn thiện thông tin cá nhân</Alert.Heading>
      <p>
        Bổ sung chiều cao, cân nặng và nguyên liệu dị ứng để sử dụng BMI và thực đơn
        cá nhân. Nếu không có dị ứng, bạn có thể để trống danh sách.
      </p>
      <p>Bạn có thể điền sau và tiếp tục khám phá các tính năng không cần hồ sơ sức khỏe.</p>
      <Button as={Link} to="/" variant="outline-success">Để sau, về trang chủ</Button>
    </Alert>
  );
}
