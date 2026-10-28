// client/src/features/community/components/CommunityPost.jsx
import { useState } from 'react';
import { Button, Card, Spinner, Badge, Modal } from 'react-bootstrap';
import { formatCreatedAt } from '../../../utils/formatters.js';
import PostMedia from './PostMedia.jsx';
import ContentVideo from '../../../components/common/ContentVideo.jsx';

const POST_STATUS_LABELS = {
  PUBLISHED: 'Công khai',
  DRAFT: 'Bản nháp',
  PENDING: 'Chờ duyệt',
  HIDDEN_BY_AI: 'Đã ẩn',
};

export default function CommunityPost({
  post,
  user,
  voting,
  onEdit,
  onDelete,
  onVote,
  onComment,
  onReport,
}) {
  const liked = post.post_votes?.some((vote) => vote.user_id === user?.user_id);
  const isAuthor = user && post.author_id === user.user_id;
  const isVideo = post.post_type === 'VIDEO' || Boolean(post.video_url);
  const itemLabel = isVideo ? 'video' : 'bài viết';
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    onDelete?.(post);
  };

  return (
    <Card as="article" className="cx-post-card">
      <Card.Body className="cx-post-body">
        <div className="cx-post-author-row">
          <span className="cx-post-avatar" aria-hidden="true">
            {post.initials || <i className="bi bi-person" />}
          </span>
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <strong>{post.author_full_name}</strong>
              {isVideo && (
                <Badge bg="danger-subtle" className="text-danger border border-danger-subtle">
                  <i className="bi bi-play-circle-fill me-1" /> Video
                </Badge>
              )}
              {post.category?.name && (
                <Badge bg="success-subtle" className="text-success-emphasis border border-success-subtle">
                  {post.category.name}
                </Badge>
              )}
            </div>
            <span className="cx-post-metadata">
              {formatCreatedAt(post.created_at)} · {POST_STATUS_LABELS[post.status] || post.status}
            </span>
          </div>
          {isAuthor && (
            <div className="d-flex gap-2">
              <Button
                size="sm"
                variant="outline-success"
                onClick={() => onEdit(post)}
                aria-label={`Sửa ${isVideo ? 'video' : 'bài viết'} ${post.title}`}
              >
                <i className="bi bi-pencil me-1" aria-hidden="true" />
                Sửa
              </Button>
              <Button
                size="sm"
                variant="outline-danger"
                onClick={handleDelete}
                aria-label={`Xóa ${isVideo ? 'video' : 'bài viết'} ${post.title}`}
              >
                <i className="bi bi-trash me-1" aria-hidden="true" />
                Xóa
              </Button>
            </div>
          )}
        </div>

        <h2>{post.title}</h2>

        {/* Phát video trực tiếp nếu bài viết có video */}
        {post.video_url && (
          <div className="mb-3 rounded-4 overflow-hidden border">
            <ContentVideo
              src={post.video_url}
              poster={post.thumbnail_url || post.image}
              title={post.title}
            />
          </div>
        )}

        {post.content && <p className="cx-post-text">{post.content}</p>}
        {post.attachments?.length > 0 && <PostMedia attachments={post.attachments} />}
      </Card.Body>
      <Card.Footer className="cx-post-actions">
        <Button
          variant="link"
          className={liked ? 'is-liked' : ''}
          disabled={!user || voting}
          aria-pressed={Boolean(liked)}
          onClick={() => onVote(post)}
        >
          {voting ? (
            <Spinner size="sm" animation="border" className="me-2" />
          ) : (
            <i className={`bi bi-heart${liked ? '-fill' : ''}`} aria-hidden="true" />
          )}
          {post.vote_count || 0} Thích
        </Button>
        <Button variant="link" onClick={() => onComment(post.post_id)}>
          <i className="bi bi-chat-left-text" aria-hidden="true" />
          {post.comments?.length || 0} Bình luận
        </Button>
        <Button
          variant="link"
          className="cx-report-button"
          onClick={() =>
            onReport({
              type: 'post',
              postId: post.post_id,
              authorName: post.author_full_name,
              title: post.title,
              content: post.content,
            })
          }
          aria-label={`Báo cáo: ${post.title}`}
        >
          <i className="bi bi-flag" aria-hidden="true" />
          Báo cáo
        </Button>
      </Card.Footer>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fs-6 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-trash3-fill text-danger" />
            Xác Nhận Xóa {isVideo ? 'Video' : 'Bài Viết'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted mb-2">
            Bạn có chắc chắn muốn xóa vĩnh viễn {itemLabel} sau? Hành động này không thể hoàn tác.
          </p>
          <div className="p-2 border rounded-3 bg-danger-subtle text-danger-emphasis small fw-medium text-truncate mb-2">
            "{post.title}"
          </div>
        </Modal.Body>
        <Modal.Footer className="border-top">
          <Button variant="secondary" size="sm" className="rounded-3 px-3" onClick={() => setShowDeleteModal(false)}>
            Hủy bỏ
          </Button>
          <Button variant="danger" size="sm" className="rounded-3 px-3 fw-medium" onClick={handleConfirmDelete}>
            Xác Nhận Xóa
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}
