// client/src/components/common/ContentVideo.jsx
import { useState, useMemo } from 'react';
import ContentImage from './ContentImage.jsx';

/**
 * Phân tích và chuyển đổi URL YouTube sang dạng embed URL
 * Hỗ trợ các định dạng: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
 */
function getYouTubeEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    // youtu.be/<id>
    if (parsed.hostname === 'youtu.be' || parsed.hostname.endsWith('.youtu.be')) {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    // youtube.com/*
    if (parsed.hostname.includes('youtube.com')) {
      // /watch?v=<id>
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;

      // /embed/<id>
      if (parsed.pathname.startsWith('/embed/')) {
        const id = parsed.pathname.split('/')[2];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }

      // /shorts/<id>
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/')[2];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
    }
  } catch {
    // Dự phòng Regex cho trường hợp URL không chuẩn
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
    );
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  return null;
}

export default function ContentVideo({ src, poster, title }) {
  const [failedSrc, setFailedSrc] = useState(null);

  const youtubeEmbedUrl = useMemo(() => getYouTubeEmbedUrl(src), [src]);

  // Kiểm tra liên kết không hợp lệ hoặc link mẫu
  const isUnavailable =
    !src ||
    failedSrc === src ||
    /^https?:\/\/([^/]*\.)?example\.com(?:\/|$)/i.test(src);

  if (isUnavailable) {
    return (
      <div className="cx-video-preview">
        <ContentImage src={poster} alt={title} />
        <span className="cx-video-unavailable">
          <i className="bi bi-play-circle" aria-hidden="true" /> Video chưa khả dụng
        </span>
      </div>
    );
  }

  // Trường hợp 1: Video YouTube -> Phát qua iframe embed
  if (youtubeEmbedUrl) {
    return (
      <div className="cx-video-preview">
        <iframe
          src={`${youtubeEmbedUrl}?rel=0`}
          title={title || 'Video hướng dẫn'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-100 h-100 border-0"
        />
      </div>
    );
  }

  // Trường hợp 2: Tệp video trực tiếp (.mp4, .webm, ...) -> Phát bằng thẻ video HTML5
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
