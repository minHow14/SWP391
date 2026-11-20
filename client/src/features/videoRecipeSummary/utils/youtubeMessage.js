// D:/SWP391/SWP391/client/src/features/videoRecipeSummary/utils/youtubeMessage.js
// Nhận diện link video YouTube trong tin nhắn chatbot và chuẩn hóa về dạng watch?v=ID.
const LINK_PATTERN = /https?:\/\/[^\s<>"'`]+|(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s<>"'`]+/gi;
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be']);
const invalidLink = () => new Error('Vui lòng gửi một link video YouTube hợp lệ, không kèm playlist.');

// Phân tích một link; trả null nếu không phải YouTube, ném lỗi nếu là link YouTube không hợp lệ
// (không phải https, có thông tin đăng nhập/cổng, hoặc là playlist).
function parseYoutubeLink(candidate) {
  const cleaned = candidate.replace(/[),.!?;:]+$/, '');
  const url = new URL(/^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`);
  if (!/youtube|youtu\.be/i.test(url.hostname)) return null;
  if (!HOSTS.has(url.hostname) || url.protocol !== 'https:' || url.username || url.password || url.port || url.searchParams.has('list')) throw invalidLink();
  let videoId;
  if (url.hostname.endsWith('youtu.be')) videoId = /^\/([\w-]{11})$/.exec(url.pathname)?.[1];
  else if (url.pathname === '/watch' && url.searchParams.getAll('v').length === 1) videoId = url.searchParams.get('v');
  else videoId = /^\/(?:shorts|embed)\/([\w-]{11})$/.exec(url.pathname)?.[1];
  if (!videoId || !/^[\w-]{11}$/.test(videoId)) throw invalidLink();
  return { videoId, videoUrl: `https://www.youtube.com/watch?v=${videoId}` };
}

// Tìm link YouTube trong văn bản; chỉ cho phép một video mỗi tin nhắn (link trùng video được tính là một).
export function detectYoutubeMessage(text) {
  const sources = new Map();
  for (const candidate of String(text).match(LINK_PATTERN) || []) {
    const source = parseYoutubeLink(candidate);
    if (source) sources.set(source.videoId, source);
  }
  if (sources.size > 1) throw new Error('Mỗi lần chỉ gửi một video YouTube để tạo công thức.');
  return sources.values().next().value || null;
}
