import { useState } from 'react';

export default function ContentImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div
        className={`cx-image-fallback ${className}`}
        role="img"
        aria-label={alt}
      >
        <i className="bi bi-image" aria-hidden="true" />
        <span>Ảnh món ăn</span>
      </div>
    );
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
