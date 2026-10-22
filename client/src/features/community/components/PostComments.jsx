// client/src/features/community/components/PostComments.jsx
import { useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const COMMENT_SCHEMA = z.object({ content: z.string().trim().min(1, 'Vui lòng nhập bình luận.').max(5000) });

export default function PostComments({ post, user, onClose, onComment, onReport, show = true }) {
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(COMMENT_SCHEMA) });
  async function submit(values) {
    setError('');
    try { await onComment(post.post_id, values.content); reset(); }
    catch (failure) { setError(failure.message); }
  }
  return <Modal show={show} onHide={onClose} animation={false} centered scrollable>
    <Modal.Header closeButton><Modal.Title>Bình luận</Modal.Title></Modal.Header>
    <Modal.Body><h2 className="h6 mb-3">{post.title}</h2>
      {!post.comments?.length && <p className="text-secondary">Chưa có bình luận. Hãy bắt đầu cuộc trò chuyện!</p>}
      {post.comments?.map(comment => <article className="cx-comment" key={comment.comment_id}>
        <div className="cx-comment-heading"><strong>{comment.user_full_name}</strong>
          <Button variant="link" size="sm" className="cx-report-button" onClick={() => onReport({
            type: 'comment', postId: post.post_id, commentId: comment.comment_id,
            authorName: comment.user_full_name, content: comment.content,
          })} aria-label={`Báo cáo bình luận của ${comment.user_full_name}`}>
            <i className="bi bi-flag me-1" aria-hidden="true" />Báo cáo
          </Button></div><p>{comment.content}</p>
      </article>)}
      {error && <Alert variant="danger">{error}</Alert>}
      {user ? <Form onSubmit={handleSubmit(submit)} noValidate>
        <Form.Group controlId="community-comment"><Form.Label>Bình luận của bạn</Form.Label>
          <Form.Control as="textarea" rows={3} maxLength={5000} {...register('content')} isInvalid={Boolean(errors.content)} disabled={isSubmitting} />
          <Form.Control.Feedback type="invalid">{errors.content?.message}</Form.Control.Feedback>
        </Form.Group><Button type="submit" className="mt-3" variant="success" disabled={isSubmitting}>
          {isSubmitting && <Spinner size="sm" className="me-2" animation="border" />}Gửi bình luận</Button>
      </Form> : <p>Đăng nhập để bình luận.</p>}
    </Modal.Body>
  </Modal>;
}
