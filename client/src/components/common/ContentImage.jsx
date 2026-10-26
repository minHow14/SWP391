// client/src/components/common/ContentImage.jsx
import { useState } from 'react';

export default function ContentImage({
  src,
  alt,
  className = '',
  emptyText = 'Chưa có ảnh',
  fallbackSrc = null,
}) {
  const [failedSrc, setFailedSrc] = useState('');
  const [triedFallback, setTriedFallback] = useState(false);

  const currentSrc = (!src || failedSrc === src) ? (triedFallback ? null : fallbackSrc) : src;

  if (!currentSrc) {
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
      src={currentSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (currentSrc === src && fallbackSrc && fallbackSrc !== src) {
          setFailedSrc(src);
        } else {
          setTriedFallback(true);
          setFailedSrc(currentSrc);
        }
      }}
    />
  );
}
