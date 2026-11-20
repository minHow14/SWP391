// D:/SWP391/SWP391/server/tests/youtubeMetadata.test.js
// Kiểm thử service đọc metadata YouTube (qua công cụ dòng lệnh) làm cổng chặn trước khi gửi sang AI.
import { describe, expect, it, vi } from 'vitest';
import { createYoutubeMetadataService } from '../src/services/youtubeMetadataService.js';

// Nguồn video mẫu, hàm tạo metadata hợp lệ có thể ghi đè từng trường, và hàm tạo service với executor giả.
const SOURCE = { videoId: 'AbCdEfGhI12', videoUrl: 'https://www.youtube.com/watch?v=AbCdEfGhI12' };
const metadata = (patch = {}) => ({ id: SOURCE.videoId, title: 'Video fixture', duration: 660, live_status: 'not_live',
  availability: 'public', formats: [{ acodec: 'opus', url: 'https://media.invalid/audio' }], ...patch });
const service = (data) => createYoutubeMetadataService({ execute: vi.fn().mockResolvedValue({ stdout: JSON.stringify(data) }) });

// Nhóm test: metadata phải hợp lệ trước khi bất kỳ dữ liệu nào tới AI.
describe('metadata gate before AI', () => {
  // Video 660 giây (giới hạn tối đa) được chấp nhận; lệnh chỉ đọc metadata (--skip-download), bỏ cấu hình ngoài,
  // không lấy playlist, không chạy qua shell (chống command injection) và có timeout.
  it('accepts 660 seconds without downloading media or invoking a shell', async () => {
    const execute = vi.fn().mockResolvedValue({ stdout: JSON.stringify(metadata()) });
    const inspector = createYoutubeMetadataService({ execute });
    expect(await inspector.inspect(SOURCE)).toMatchObject({ videoId: SOURCE.videoId, durationSeconds: 660 });
    const [command, args, options] = execute.mock.calls[0];
    expect(command).toBeTruthy();
    expect(args).toContain('--skip-download');
    expect(args).toContain('--ignore-config');
    expect(args).toContain('--no-playlist');
    expect(args.at(-1)).toBe(SOURCE.videoUrl);
    expect(options).toMatchObject({ windowsHide: true, shell: false });
    expect(options.timeout).toBeGreaterThan(0);
  });
  // Video dài quá 660 giây phải bị từ chối trước khi tốn chi phí AI.
  it('rejects overlong videos before any AI boundary', async () => {
    await expect(service(metadata({ duration: 661 })).inspect(SOURCE)).rejects.toMatchObject({ errorCode: 'VIDEO_TOO_LONG' });
  });
  // Video không có định dạng audio tải được vẫn hợp lệ vì có thể dùng phụ đề.
  it.each([{ formats: [] }, { formats: undefined }])('accepts caption sources without downloadable audio formats %j', async ({ formats }) => {
    await expect(service(metadata({ formats })).inspect(SOURCE)).resolves.toMatchObject({
      videoId: SOURCE.videoId, durationSeconds: 660,
    });
  });
  // Metadata thiếu thời lượng, đang livestream, riêng tư, sai ID hoặc là playlist phải bị từ chối (fail closed).
  it.each([{ duration: null }, { duration: 0 }, { live_status: 'is_live' }, { is_live: true },
    { availability: 'private' }, { id: 'Different12' }, { _type: 'playlist' }])('fails closed for invalid metadata %j', async (patch) => {
    await expect(service(metadata(patch)).inspect(SOURCE)).rejects.toHaveProperty('errorCode');
  });
  // Thiếu công cụ đọc metadata phải báo lỗi có mã riêng và không lộ nội dung stderr.
  it('reports a missing metadata executable without exposing stderr', async () => {
    const inspector = createYoutubeMetadataService({ execute: vi.fn().mockRejectedValue(Object.assign(new Error('SECRET_STDERR'), { code: 'ENOENT' })) });
    await expect(inspector.inspect(SOURCE)).rejects.toMatchObject({ errorCode: 'VIDEO_INSPECTOR_UNAVAILABLE' });
    await expect(inspector.inspect(SOURCE)).rejects.not.toThrow('SECRET_STDERR');
  });
  // Quá thời gian đọc metadata phải được phân loại là lỗi tạm thời có thể thử lại (504), không phải video không truy cập được.
  it('classifies a metadata deadline as retryable instead of an inaccessible video', async () => {
    const inspector = createYoutubeMetadataService({ execute: vi.fn().mockRejectedValue(Object.assign(new Error('PRIVATE_TIMEOUT_DETAIL'), { killed: true, signal: 'SIGTERM' })) });
    await expect(inspector.inspect(SOURCE)).rejects.toMatchObject({ errorCode: 'VIDEO_METADATA_TIMEOUT', retryable: true, statusCode: 504 });
  });
});
