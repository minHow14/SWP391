import { useState } from 'react';
import ContentImage from './ContentImage.jsx';

export default function ContentVideo({ src, poster, title }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (
    !src ||
    failedSrc === src ||
    /^https?:\/\/([^/]*\.)?example\.com(?:\/|$)/i.test(src)
  ) {
    return (
      <div className="cx-video-preview">
        <ContentImage src={poster} alt={title} />
        <span className="cx-video-unavailable">
          <i className="bi bi-play-circle" aria-hidden="true" /> Video chưa khả
          dụng
        </span>
      </div>
    );
  }
  return (
    <div className="cx-video-preview">
      <video
        controls
        playsInline
        preload="metadata"
        poster={poster}
        src={src}
        aria-label={title}
        onError={() => setFailedSrc(src)}
      />
    </div>
  );
}
