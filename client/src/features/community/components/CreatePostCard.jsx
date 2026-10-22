// client/src/features/community/components/CreatePostCard.jsx
import { Button, Card } from 'react-bootstrap';
import { Link } from 'react-router';

export default function CreatePostCard({ user, onCreate }) {
  return <Card className="cx-create-post mb-4">
    <Card.Body>
      <div className="cx-create-post-prompt">
        <span className="cx-post-avatar" aria-hidden="true">{user?.full_name?.slice(0, 1) || <i className="bi bi-person" />}</span>
        {user ? <Button variant="light" className="cx-create-post-trigger" onClick={() => onCreate()}>
          Bạn muốn chia sẻ điều gì với cộng đồng?
        </Button> : <div><strong>Cùng chia sẻ câu chuyện sống xanh</strong>
          <p className="mb-0 text-secondary">Đăng nhập để đăng bài, thích và bình luận.</p></div>}
      </div>
      <div className="cx-create-post-footer">
        <span className="cx-create-post-media"><i className="bi bi-images" aria-hidden="true" /> Ảnh
          <i className="bi bi-camera-video ms-3" aria-hidden="true" /> Video</span>
        {user ? <Button variant="success" onClick={() => onCreate()}><i className="bi bi-plus-lg me-2" aria-hidden="true" />Tạo bài viết</Button>
          : <Button as={Link} to="/dang-nhap" variant="success">Đăng nhập</Button>}
      </div>
    </Card.Body>
  </Card>;
}
