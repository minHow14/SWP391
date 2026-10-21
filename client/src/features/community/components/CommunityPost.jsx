// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/community/components/CommunityPost.jsx
import { Button, Card, Spinner } from 'react-bootstrap';
import { formatCreatedAt } from '../../../utils/formatters.js';
import PostMedia from './PostMedia.jsx';

const POST_STATUS_LABELS = { PUBLISHED: 'Công khai', DRAFT: 'Bản nháp', PENDING: 'Chờ duyệt', HIDDEN_BY_AI: 'Đã ẩn' };

export default function CommunityPost({ post, user, voting, onEdit, onVote, onComment, onReport }) {
  const liked = post.post_votes?.some(vote => vote.user_id === user?.user_id);
  return <Card as="article" className="cx-post-card">
    <Card.Body className="cx-post-body">
      <div className="cx-post-author-row"><span className="cx-post-avatar" aria-hidden="true">{post.initials}</span>
        <div className="flex-grow-1"><strong>{post.author_full_name}</strong>
          <span className="cx-post-metadata">{formatCreatedAt(post.created_at)} · {POST_STATUS_LABELS[post.status] || post.status}</span></div>
        {post.author_id === user?.user_id && <Button size="sm" variant="outline-success" onClick={() => onEdit(post)} aria-label={`Sửa bài viết ${post.title}`}><i className="bi bi-pencil me-1" aria-hidden="true" />Sửa</Button>}
      </div>
      <h2>{post.title}</h2><p className="cx-post-text">{post.content}</p>
      <PostMedia attachments={post.attachments} />
    </Card.Body>
    <Card.Footer className="cx-post-actions">
      <Button variant="link" className={liked ? 'is-liked' : ''} disabled={!user || voting} aria-pressed={Boolean(liked)} onClick={() => onVote(post)}>
        {voting ? <Spinner size="sm" animation="border" className="me-2" /> : <i className={`bi bi-heart${liked ? '-fill' : ''}`} aria-hidden="true" />}
        {post.vote_count || 0} Thích</Button>
      <Button variant="link" onClick={() => onComment(post.post_id)}><i className="bi bi-chat-left-text" aria-hidden="true" />{post.comments?.length || 0} Bình luận</Button>
      <Button variant="link" className="cx-report-button" onClick={() => onReport({
        type: 'post', postId: post.post_id, authorName: post.author_full_name, title: post.title, content: post.content,
      })} aria-label={`Báo cáo bài viết: ${post.title}`}><i className="bi bi-flag" aria-hidden="true" />Báo cáo</Button>
    </Card.Footer>
  </Card>;
}
