// D:/SWP391/SWP391/client/src/components/common/ContentImage.jsx
// Ảnh nội dung có trạng thái dự phòng khi thiếu URL hoặc ảnh tải lỗi.
import { useState } from 'react';

// Component ảnh: lazy-load ảnh, nếu lỗi thì hiển thị khung thay thế có nhãn trợ năng.
export default function ContentImage({
  src,
  alt,
  className = '',
  emptyText = 'Chưa có ảnh',
}) {
  // Lưu URL đã lỗi (thay vì cờ boolean) để khi src đổi sang ảnh khác thì tự thử tải lại.
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
