// D:/SWP391/SWP391/server/tests/youtubeVideoUrl.test.js
// Kiểm thử chuẩn hóa URL video YouTube trước khi lưu hoặc gửi sang AI Service.
import { describe, expect, it } from 'vitest';
import { normalizeYoutubeVideoUrl } from '../src/utils/youtubeVideoUrl.js';

const VIDEO_ID = 'AbCdEfGhI12';
// Nhóm test: chỉ chấp nhận URL YouTube hợp lệ và đưa về dạng watch?v= chuẩn.
describe('YouTube video URL normalization', () => {
  // Các dạng URL được hỗ trợ (watch, youtu.be, shorts, embed) phải quy về cùng một URL chuẩn.
  it.each([
    `https://www.youtube.com/watch?v=${VIDEO_ID}&si=share`,
    `https://youtu.be/${VIDEO_ID}?t=12`,
    `https://m.youtube.com/shorts/${VIDEO_ID}`,
    `https://www.youtube.com/embed/${VIDEO_ID}`,
  ])('canonicalizes supported URL %s', (input) => {
    expect(normalizeYoutubeVideoUrl(input)).toEqual({ videoId: VIDEO_ID, videoUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}` });
  });
  // URL giả mạo tên miền, có thông tin đăng nhập, sai cổng, http, playlist, trùng tham số v hoặc giao thức file
  // phải bị từ chối với lỗi 400 INVALID_YOUTUBE_URL để chống SSRF và dữ liệu rác.
  it.each([
    `https://youtube.com.attacker.invalid/watch?v=${VIDEO_ID}`,
    `https://youtube.com@127.0.0.1/watch?v=${VIDEO_ID}`,
    `https://name:secret@www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://www.youtube.com:8000/watch?v=${VIDEO_ID}`,
    `http://www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://www.youtube.com/watch?v=${VIDEO_ID}&list=playlist`,
    `https://www.youtube.com/watch?v=${VIDEO_ID}&v=AnotherId12`,
    'https://www.youtube.com/playlist?list=playlist',
    'file:///tmp/video', 'https://youtu.be/not-valid', '', null,
  ])('rejects unsupported or unsafe URL %s', (input) => {
    expect(() => normalizeYoutubeVideoUrl(input)).toThrow(expect.objectContaining({ statusCode: 400, errorCode: 'INVALID_YOUTUBE_URL' }));
  });
});
