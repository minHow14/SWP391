// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/community/components/PostMedia.jsx
import ContentImage from '../../../components/common/ContentImage.jsx';

export default function PostMedia({ attachments, preview = false, onRemove }) {
  if (!attachments?.length) return null;
  return (
    <div
      className={`cx-post-media ${attachments.length > 1 ? 'is-grid' : ''} ${preview ? 'is-preview' : ''}`}
    >
      {attachments.map((attachment) => (
        <figure key={attachment.id}>
          {attachment.type === 'video' ? (
            <video
              src={attachment.url}
              controls
              playsInline
              preload="metadata"
              aria-label={`Video: ${attachment.name}`}
            />
          ) : (
            <ContentImage
              src={attachment.url}
              alt={`Ảnh đính kèm: ${attachment.name}`}
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
