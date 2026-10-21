// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/community/components/PostComposer.jsx
import { Alert, Button, Form, Modal, ProgressBar, Spinner } from 'react-bootstrap';
import { usePostComposer } from '../hooks/usePostComposer.js';
import { POST_MEDIA_ACCEPT, MAX_POST_ATTACHMENTS } from '../../../utils/postAttachments.js';
import PostMedia from './PostMedia.jsx';

export default function PostComposer({ post, user, onClose, onSaved }) {
  const composer = usePostComposer({ post, onSaved });
  const { register, formState: { errors } } = composer.form;
  return <Modal show onHide={onClose} backdrop="static" keyboard={!composer.busy} centered scrollable className="cx-post-composer">
    <Modal.Header closeButton={!composer.busy}><Modal.Title>{post.post_id ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}</Modal.Title></Modal.Header>
    <Modal.Body>
      <div className="cx-post-author-row"><span className="cx-post-avatar" aria-hidden="true">{user.full_name.slice(0, 1)}</span>
        <div><strong>{user.full_name}</strong><span className="cx-post-metadata"><i className="bi bi-globe2 me-1" aria-hidden="true" />Chia sẻ với cộng đồng</span></div></div>
      <Form id="community-post-form" onSubmit={composer.submit} noValidate>
        <fieldset disabled={composer.busy}>
          <Form.Group controlId="community-post-title" className="mb-3">
            <Form.Label>Tiêu đề</Form.Label>
            <Form.Control {...register('title')} maxLength={255} autoFocus placeholder="Tiêu đề bài viết của bạn" isInvalid={Boolean(errors.title)} aria-required="true" />
            <Form.Control.Feedback type="invalid">{errors.title?.message}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group controlId="community-post-content" className="mb-3">
            <Form.Label>Nội dung</Form.Label>
            <Form.Control as="textarea" {...register('content')} rows={6} maxLength={50000} placeholder="Chia sẻ câu chuyện, trải nghiệm hoặc điều bạn quan tâm…" isInvalid={Boolean(errors.content)} aria-required="true" />
            <Form.Control.Feedback type="invalid">{errors.content?.message}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group controlId="community-post-media" className="cx-post-upload">
            <Form.Label><i className="bi bi-images me-2" aria-hidden="true" />Thêm ảnh / video <span>({composer.attachments.length}/{MAX_POST_ATTACHMENTS})</span></Form.Label>
            <Form.Control type="file" accept={POST_MEDIA_ACCEPT} multiple onChange={composer.selectFiles} aria-describedby="community-media-help" disabled={composer.busy || composer.attachments.length >= MAX_POST_ATTACHMENTS} />
            <Form.Text id="community-media-help">Tối đa 6 tệp. Ảnh JPG, PNG, WebP, GIF ≤ 10 MB; video MP4, WebM, OGG ≤ 50 MB.</Form.Text>
          </Form.Group>
          <PostMedia attachments={composer.attachments} preview onRemove={composer.removeAttachment} />
        </fieldset>
      </Form>
      {composer.error && <Alert variant="danger" className="mt-3" role="alert">{composer.error}</Alert>}
      {composer.busy && <div className="mt-3" role="status"><p className="small mb-2">{composer.progress < 100 ? 'Đang gửi bài viết…' : 'Đang lưu bài viết…'}</p>
        <ProgressBar now={composer.progress} label={`${composer.progress}%`} variant="success" /></div>}
    </Modal.Body>
    <Modal.Footer><Button variant="light" onClick={onClose} disabled={composer.busy}>Hủy</Button>
      <Button variant="success" type="submit" form="community-post-form" disabled={composer.busy}>
        {composer.busy && <Spinner size="sm" className="me-2" animation="border" aria-hidden="true" />}
        {post.post_id ? 'Lưu thay đổi' : 'Đăng bài viết'}
      </Button></Modal.Footer>
  </Modal>;
}
