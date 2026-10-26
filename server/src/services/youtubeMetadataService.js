// D:/SWP391/SWP391/server/src/services/youtubeMetadataService.js
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { videoRecipeSummaryConfig } from '../config/videoRecipeSummaryConfig.js';
import { MAX_METADATA_BYTES, MAX_VIDEO_DURATION_SECONDS } from '../constants/videoRecipeSummary.js';
import { normalizeYoutubeVideoUrl } from '../utils/youtubeVideoUrl.js';
import { videoRecipeSummaryError } from '../utils/videoRecipeSummaryError.js';

const executeFile = promisify(execFile);
const metadataError = (code, message) => videoRecipeSummaryError({ code, message });

function validatedMetadata(value, videoId) {
  if (value.id !== videoId || (value._type && value._type !== 'video') || value.is_live || !['not_live', 'was_live', 'post_live'].includes(value.live_status)) {
    throw metadataError('VIDEO_UNAVAILABLE', 'Chỉ hỗ trợ một video YouTube đã đăng và có thể truy cập.');
  }
  if (!['public', 'unlisted'].includes(value.availability)) throw metadataError('VIDEO_UNAVAILABLE', 'Không thể truy cập video YouTube này.');
  if (!Number.isFinite(value.duration) || value.duration <= 0) throw metadataError('VIDEO_DURATION_UNKNOWN', 'Không xác định được thời lượng video.');
  if (value.duration > MAX_VIDEO_DURATION_SECONDS) throw metadataError('VIDEO_TOO_LONG', 'Video cần có thời lượng không quá 11 phút.');
  if (!value.formats?.some((format) => format.acodec && format.acodec !== 'none' && typeof format.url === 'string')) {
    throw metadataError('VIDEO_AUDIO_UNAVAILABLE', 'Video không có nguồn âm thanh khả dụng.');
  }
  return { videoId, title: typeof value.title === 'string' ? value.title.slice(0, 255) : null, durationSeconds: value.duration };
}

function inspectionFailure(error, signal) {
  if (signal?.aborted) return signal.reason;
  if (error.errorCode) return error;
  if (error.code === 'ENOENT') return videoRecipeSummaryError({ status: 503, code: 'VIDEO_INSPECTOR_UNAVAILABLE', message: 'Công cụ kiểm tra video chưa được cấu hình.' });
  return metadataError('VIDEO_UNAVAILABLE', 'Không thể kiểm tra video YouTube. Vui lòng kiểm tra link và thử lại.');
}

export function createYoutubeMetadataService({ execute = executeFile, config = videoRecipeSummaryConfig } = {}) {
  return { async inspect({ videoUrl, videoId, signal }) {
    const source = normalizeYoutubeVideoUrl(videoUrl);
    if (source.videoId !== videoId) throw metadataError('VIDEO_UNAVAILABLE', 'Video không khớp với yêu cầu.');
    const args = ['--ignore-config', '--no-cache-dir', '--no-playlist', '--skip-download', '--dump-single-json', '--js-runtimes', 'node',
      '--no-warnings', '--socket-timeout', '15', '--retries', '1', '--extractor-retries', '1', '--', source.videoUrl];
    try {
      const result = await execute(config.ytDlpPath, args, { signal, timeout: config.metadataTimeoutMs,
        maxBuffer: MAX_METADATA_BYTES, encoding: 'utf8', windowsHide: true, shell: false });
      return validatedMetadata(JSON.parse(result.stdout), videoId);
    } catch (error) { throw inspectionFailure(error, signal); }
  } };
}

export const youtubeMetadataService = createYoutubeMetadataService();
