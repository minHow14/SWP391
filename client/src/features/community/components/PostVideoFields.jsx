// client/src/features/community/components/PostVideoFields.jsx
import { Form, Row, Col } from 'react-bootstrap';

export default function PostVideoFields({
  composer,
  register,
  errors,
  currentVideoUrl,
  currentThumbnailUrl,
}) {
  return (
    <>
      <Form.Group controlId="community-post-video-url" className="mb-3">
        <Form.Label>
          Link video (YouTube / URL) <span className="text-danger">*</span>
        </Form.Label>
        <Form.Control
          type="url"
          value={currentVideoUrl || ''}
          onChange={composer.handleVideoUrlChange}
          placeholder="https://www.youtube.com/watch?v=... hoặc dán URL video"
          isInvalid={Boolean(errors.videoUrl)}
        />
        <Form.Control.Feedback type="invalid">{errors.videoUrl?.message}</Form.Control.Feedback>
        <div className="d-flex align-items-center justify-content-between mt-1">
          <Form.Text className="text-muted small">
            Hỗ trợ link YouTube (tự động lấy ảnh bìa) hoặc file MP4 trực tiếp.
          </Form.Text>
          <label className="btn btn-outline-secondary btn-sm rounded-3 py-0 px-2 mt-1 cursor-pointer">
            <i className="bi bi-upload me-1" /> Tải video từ máy
            <input
              type="file"
              accept="video/mp4,video/webm,video/ogg"
              hidden
              onChange={composer.uploadDirectVideo}
              disabled={composer.busy}
            />
          </label>
        </div>
      </Form.Group>

      <Row className="g-2 mb-3">
        <Col xs={12} md={8}>
          <Form.Group controlId="community-post-thumbnail-url">
            <Form.Label>Ảnh bìa xem trước (Thumbnail)</Form.Label>
            <Form.Control
              type="url"
              {...register('thumbnailUrl')}
              placeholder="Tự động trích từ YouTube hoặc nhập URL ảnh"
            />
          </Form.Group>
        </Col>
        <Col xs={12} md={4} className="d-flex align-items-end">
          <label className="btn btn-outline-secondary btn-sm rounded-3 w-100 py-2 cursor-pointer">
            <i className="bi bi-image me-1" /> Tải ảnh bìa lên
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={composer.uploadThumbnail}
              disabled={composer.busy}
            />
          </label>
        </Col>
      </Row>

      {currentThumbnailUrl && (
        <div className="mb-3 text-center">
          <img
            src={currentThumbnailUrl}
            alt="Thumbnail preview"
            className="rounded-3 shadow-sm border"
            style={{ maxHeight: 120, objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      <Form.Group controlId="community-post-transcript" className="mb-3">
        <Form.Label>Mô tả nội dung / Hướng dẫn trong video</Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          {...register('transcript')}
          placeholder="Mô tả tóm tắt nguyên liệu, cách nấu hoặc nội dung chính của video..."
        />
      </Form.Group>
    </>
  );
}
