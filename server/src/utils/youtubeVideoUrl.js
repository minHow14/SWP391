// D:/SWP391/SWP391/server/src/utils/youtubeVideoUrl.js
// Kiểm tra và chuẩn hoá link video YouTube về dạng chuẩn https://www.youtube.com/watch?v=<id>.
import { videoRecipeSummaryError } from './videoRecipeSummaryError.js';

// Chỉ chấp nhận các host chính thức của YouTube để tránh dùng link giả mạo.
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const SHORT_HOSTS = new Set(['youtu.be', 'www.youtu.be']);
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const invalidUrl = () => videoRecipeSummaryError({ status: 400, code: 'INVALID_YOUTUBE_URL', message: 'Vui lòng gửi một link video YouTube HTTPS hợp lệ, không kèm playlist.' });

// Lấy ID video từ các dạng link: youtu.be, /watch?v=, /shorts/ và /embed/.
function extractVideoId(url) {
  if (SHORT_HOSTS.has(url.hostname)) return /^\/([A-Za-z0-9_-]{11})$/.exec(url.pathname)?.[1];
  if (!YOUTUBE_HOSTS.has(url.hostname)) return null;
  // Chỉ chấp nhận đúng một tham số v để tránh link mơ hồ.
  if (url.pathname === '/watch' && url.searchParams.getAll('v').length === 1) return url.searchParams.get('v');
  return /^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})$/.exec(url.pathname)?.[1];
}

// Chuẩn hoá link YouTube; ném lỗi 400 nếu link không hợp lệ.
export function normalizeYoutubeVideoUrl(input) {
  // Giới hạn độ dài và chặn thông tin đăng nhập, cổng lạ, playlist để chỉ nhận đúng một video.
  if (typeof input !== 'string' || input.length > 2048) throw invalidUrl();
  let url;
  try { url = new URL(input.trim()); } catch { throw invalidUrl(); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.searchParams.has('list')) throw invalidUrl();
  const videoId = extractVideoId(url);
  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) throw invalidUrl();
  return { videoId, videoUrl: `https://www.youtube.com/watch?v=${videoId}` };
}

// Phiên bản không ném lỗi: trả về null khi link không hợp lệ.
export function tryNormalizeYoutubeVideoUrl(input) {
  try { return normalizeYoutubeVideoUrl(input); } catch { return null; }
}
