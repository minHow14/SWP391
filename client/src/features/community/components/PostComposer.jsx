// client/src/features/community/components/PostComposer.jsx
import { Alert, Button, Form, Modal, ProgressBar, Spinner } from 'react-bootstrap';
import { usePostComposer } from '../hooks/usePostComposer.js';
import { POST_MEDIA_ACCEPT, MAX_POST_ATTACHMENTS } from '../../../utils/postAttachments.js';
import PostMedia from './PostMedia.jsx';
import PostVideoFields from './PostVideoFields.jsx';

export default function PostComposer({ post, user, categories = [], onClose, onSaved }) {
  const composer = usePostComposer({ post, onSaved });
  const {
    register,
    formState: { errors },
    watch,
  } = composer.form;

  const currentVideoUrl = watch('videoUrl');
  const currentThumbnailUrl = watch('thumbnailUrl');
  const isVideo = composer.postType === 'VIDEO';

  return (
    <Modal
      show
      onHide={onClose}
      backdrop="static"
      keyboard={!composer.busy}
      centered
      scrollable
      size="lg"
      className="cx-post-composer"
    >
      <Modal.Header closeButton={!composer.busy}>
        <Modal.Title className="fs-6 fw-bold">
          {post?.post_id ? 'Chỉnh sửa nội dung' : 'Tạo bài đăng cộng đồng'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="cx-post-author-row mb-3">
          <span className="cx-post-avatar" aria-hidden="true">
            {user?.full_name?.slice(0, 1) || <i className="bi bi-person" />}
          </span>
          <div>
            <strong>{user?.full_name}</strong>
            <span className="cx-post-metadata">
              <i className="bi bi-globe2 me-1" aria-hidden="true" />
              Chia sẻ công khai với cộng đồng ChayXanh
            </span>
          </div>
        </div>

        {/* Nút chuyển đổi loại bài đăng: Blog vs Video */}
        {!post?.post_id && (
          <div className="d-flex gap-2 mb-3 p-1 bg-light rounded-3 border">
            <Button
              type="button"
              size="sm"
              variant={!isVideo ? 'success' : 'light'}
              className="flex-fill rounded-3 fw-medium"
              onClick={() => composer.changePostType('BLOG')}
              disabled={composer.busy}
            >
              <i className="bi bi-journal-richtext me-1" /> Bài viết Blog
            </Button>
            <Button
              type="button"
              size="sm"
              variant={isVideo ? 'success' : 'light'}
              className="flex-fill rounded-3 fw-medium"
              onClick={() => composer.changePostType('VIDEO')}
              disabled={composer.busy}
            >
              <i className="bi bi-play-circle-fill me-1" /> Video Cộng đồng
            </Button>
          </div>
        )}

        <Form id="community-post-form" onSubmit={composer.submit} noValidate>
          <fieldset disabled={composer.busy}>
            {/* Tiêu đề */}
            <Form.Group controlId="community-post-title" className="mb-3">
              <Form.Label>
                {isVideo ? 'Tiêu đề video' : 'Tiêu đề bài viết'} <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                {...register('title')}
                maxLength={255}
                autoFocus
                placeholder={isVideo ? 'Ví dụ: Cách làm canh chua nấm chay thơm ngon...' : 'Nhập tiêu đề chia sẻ của bạn...'}
                isInvalid={Boolean(errors.title)}
                aria-required="true"
              />
              <Form.Control.Feedback type="invalid">{errors.title?.message}</Form.Control.Feedback>
            </Form.Group>

            {/* Chủ đề */}
            <Form.Group controlId="community-post-category" className="mb-3">
              <Form.Label>
                Chủ đề <span className="text-danger">*</span>
              </Form.Label>
              <Form.Select
                {...register('categoryId')}
                isInvalid={Boolean(errors.categoryId)}
                aria-required="true"
              >
                <option value="">Chọn chủ đề phù hợp</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {errors.categoryId?.message}
              </Form.Control.Feedback>
            </Form.Group>

            {/* Giao diện nhập liệu theo loại bài */}
            {isVideo ? (
              <PostVideoFields
                composer={composer}
                register={register}
                errors={errors}
                currentVideoUrl={currentVideoUrl}
                currentThumbnailUrl={currentThumbnailUrl}
              />
            ) : (
              <>
                <Form.Group controlId="community-post-content" className="mb-3">
                  <Form.Label>
                    Nội dung bài viết <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    {...register('content')}
                    rows={6}
                    maxLength={50000}
                    placeholder="Chia sẻ trải nghiệm, công thức, thực đơn hoặc câu chuyện ăn chay của bạn..."
                    isInvalid={Boolean(errors.content)}
                    aria-required="true"
                  />
                  <Form.Control.Feedback type="invalid">{errors.content?.message}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group controlId="community-post-media" className="cx-post-upload mb-3">
                  <Form.Label>
                    <i className="bi bi-images me-2" aria-hidden="true" />
                    Thêm ảnh / video đính kèm <span>({composer.attachments.length}/{MAX_POST_ATTACHMENTS})</span>
                  </Form.Label>
                  <Form.Control
                    type="file"
                    accept={POST_MEDIA_ACCEPT}
                    multiple
                    onChange={composer.selectFiles}
                    disabled={composer.busy || composer.attachments.length >= MAX_POST_ATTACHMENTS}
                  />
                  <Form.Text id="community-media-help">
                    Tối đa 6 tệp. Ảnh JPG, PNG, WebP ≤ 10 MB; video MP4, WebM ≤ 50 MB.
                  </Form.Text>
                </Form.Group>

                <PostMedia
                  attachments={composer.attachments}
                  preview
                  onRemove={composer.removeAttachment}
                />
              </>
            )}
          </fieldset>
        </Form>

        {composer.error && (
          <Alert variant="danger" className="mt-3" role="alert">
            {composer.error}
          </Alert>
        )}

        {composer.uploading && (
          <div className="mt-3" role="status">
            <p className="small mb-2">Đang tải tệp đa phương tiện lên máy chủ ({composer.progress}%)...</p>
            <ProgressBar now={composer.progress} label={`${composer.progress}%`} variant="success" animated />
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onClose} disabled={composer.busy}>
          Hủy
        </Button>
        <Button variant="success" type="submit" form="community-post-form" disabled={composer.busy}>
          {composer.busy && <Spinner size="sm" className="me-2" animation="border" aria-hidden="true" />}
          {post?.post_id ? 'Lưu thay đổi' : isVideo ? 'Đăng Video' : 'Đăng Bài Viết'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
