// D:/SWP391/SWP391/client/src/components/common/ContentImage.jsx
import { useState } from 'react';

export default function ContentImage({
  src,
  alt,
  className = '',
  emptyText = 'Chưa có ảnh',
}) {
  const [failedSrc, setFailedSrc] = useState('');

  if (!src || failedSrc === src) {
    return (
      <div
        className={`cx-image-fallback ${className}`}
        role="img"
        aria-label={alt}
      >
        <i className="bi bi-image" aria-hidden="true" />
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}
