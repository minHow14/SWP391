// D:/SWP391/SWP391/server/src/services/youtubeMetadataService.js
// Kiểm tra metadata video YouTube bằng yt-dlp trước khi cho phép tóm tắt công thức từ video.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { videoRecipeSummaryConfig } from '../config/videoRecipeSummaryConfig.js';
import { MAX_METADATA_BYTES, MAX_VIDEO_DURATION_SECONDS } from '../constants/videoRecipeSummary.js';
import { normalizeYoutubeVideoUrl } from '../utils/youtubeVideoUrl.js';
import { videoRecipeSummaryError } from '../utils/videoRecipeSummaryError.js';

const executeFile = promisify(execFile);
// Tạo lỗi nghiệp vụ tóm tắt video với mã và thông báo cho trước.
const metadataError = (code, message) => videoRecipeSummaryError({ code, message });

// Kiểm tra metadata: chỉ nhận video đúng ID, đã đăng (không phải livestream đang phát), công khai/không liệt kê và không quá giới hạn thời lượng.
function validatedMetadata(value, videoId) {
  // Livestream đang phát hoặc sắp phát không có nội dung cố định để tóm tắt nên bị từ chối.
  if (value.id !== videoId || (value._type && value._type !== 'video') || value.is_live || !['not_live', 'was_live', 'post_live'].includes(value.live_status)) {
    throw metadataError('VIDEO_UNAVAILABLE', 'Chỉ hỗ trợ một video YouTube đã đăng và có thể truy cập.');
  }
  // Video riêng tư/cần đăng nhập thì AI không truy cập được.
  if (!['public', 'unlisted'].includes(value.availability)) throw metadataError('VIDEO_UNAVAILABLE', 'Không thể truy cập video YouTube này.');
  if (!Number.isFinite(value.duration) || value.duration <= 0) throw metadataError('VIDEO_DURATION_UNKNOWN', 'Không xác định được thời lượng video.');
  // Giới hạn thời lượng để kiểm soát chi phí và thời gian xử lý AI.
  if (value.duration > MAX_VIDEO_DURATION_SECONDS) throw metadataError('VIDEO_TOO_LONG', 'Video cần có thời lượng không quá 11 phút.');
  // Cắt tiêu đề 255 ký tự cho vừa cột DB.
  return { videoId, title: typeof value.title === 'string' ? value.title.slice(0, 255) : null, durationSeconds: value.duration };
}

// Ánh xạ lỗi khi chạy yt-dlp sang lỗi nghiệp vụ; chỉ lỗi timeout được đánh dấu retryable.
function inspectionFailure(error, signal) {
  // Bị hủy chủ động (worker dừng) thì trả lại lý do hủy gốc.
  if (signal?.aborted) return signal.reason;
  if (error.errorCode) return error;
  // ENOENT: chưa cài hoặc sai đường dẫn yt-dlp -> lỗi cấu hình (503).
  if (error.code === 'ENOENT') return videoRecipeSummaryError({ status: 503, code: 'VIDEO_INSPECTOR_UNAVAILABLE', message: 'Công cụ kiểm tra video chưa được cấu hình.' });
  // Bị kill do timeout (không phải do vượt maxBuffer) -> có thể thử lại.
  if (error.code === 'ETIMEDOUT' || (error.killed && error.signal === 'SIGTERM' && error.code !== 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER')) {
    return videoRecipeSummaryError({ status: 504, code: 'VIDEO_METADATA_TIMEOUT', message: 'Kiểm tra video đã quá thời gian chờ. Hệ thống sẽ thử lại.', retryable: true });
  }
  return metadataError('VIDEO_UNAVAILABLE', 'Không thể kiểm tra video YouTube. Vui lòng kiểm tra link và thử lại.');
}

// Factory tạo service kiểm tra metadata; cho phép inject `execute`/`config` để test không cần chạy yt-dlp thật.
export function createYoutubeMetadataService({ execute = executeFile, config = videoRecipeSummaryConfig } = {}) {
  return { async inspect({ videoUrl, videoId, signal }) {
    // Chuẩn hóa URL và đối chiếu videoId để chắc chắn đang kiểm tra đúng video của yêu cầu.
    const source = normalizeYoutubeVideoUrl(videoUrl);
    if (source.videoId !== videoId) throw metadataError('VIDEO_UNAVAILABLE', 'Video không khớp với yêu cầu.');
    // Tham số yt-dlp: bỏ config cục bộ, không tải video, chỉ lấy JSON metadata; `--` ngăn URL bị hiểu là tùy chọn.
    const args = ['--ignore-config', '--no-cache-dir', '--no-playlist', '--skip-download', '--dump-single-json', '--js-runtimes', 'node',
      '--no-warnings', '--socket-timeout', '15', '--retries', '1', '--extractor-retries', '1', '--', source.videoUrl];
    try {
      // shell: false và maxBuffer để chống command injection và giới hạn bộ nhớ.
      const result = await execute(config.ytDlpPath, args, { signal, timeout: config.metadataTimeoutMs,
        maxBuffer: MAX_METADATA_BYTES, encoding: 'utf8', windowsHide: true, shell: false });
      return validatedMetadata(JSON.parse(result.stdout), videoId);
    } catch (error) { throw inspectionFailure(error, signal); }
  } };
}

// Instance mặc định dùng trong ứng dụng.
export const youtubeMetadataService = createYoutubeMetadataService();
