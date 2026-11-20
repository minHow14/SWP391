// client/src/features/community/components/PostMedia.jsx
// Hiển thị danh sách ảnh/video đính kèm của bài viết; chế độ preview cho phép gỡ từng tệp khi soạn bài.
import ContentImage from '../../../components/common/ContentImage.jsx';

// Component media; trả về null khi không có tệp đính kèm nào.
export default function PostMedia({ attachments, preview = false, onRemove }) {
  if (!attachments?.length) return null;
  return (
    <div
      className={`cx-post-media ${attachments.length > 1 ? 'is-grid' : ''} ${preview ? 'is-preview' : ''}`}
    >
      {attachments.map((attachment) => (
        <figure key={attachment.id || attachment.url}>
          {attachment.type?.toLowerCase() === 'video' ? (
            <video
              src={attachment.url}
              controls
              playsInline
              preload="metadata"
              aria-label={`Video: ${attachment.name || 'Bài viết'}`}
            />
          ) : (
            <ContentImage
              src={attachment.url}
              alt={`Ảnh đính kèm: ${attachment.name || 'Bài viết'}`}
            />
          )}
          {preview && (
            <>
              <figcaption title={attachment.name}>{attachment.name}</figcaption>
              <button
                type="button"
                className="cx-media-remove"
                aria-label={`Gỡ ${attachment.name}`}
                onClick={() => onRemove(attachment)}
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </>
          )}
        </figure>
      ))}
    </div>
  );
}
