export const POST_MEDIA_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/ogg';
export const MAX_POST_ATTACHMENTS = 6;
const imageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const videoTypes = new Set(['video/mp4', 'video/webm', 'video/ogg']);

export function validatePostAttachments(files, currentCount = 0) {
  if (currentCount + files.length > MAX_POST_ATTACHMENTS)
    return 'Mỗi bài viết được đính kèm tối đa 6 ảnh hoặc video.';
  for (const file of files) {
    const isVideo = videoTypes.has(file.type);
    if (!imageTypes.has(file.type) && !isVideo)
      return `File “${file.name}” không được hỗ trợ. Chọn ảnh JPG, PNG, WebP, GIF hoặc video MP4, WebM, OGG.`;
    const limit = (isVideo ? 50 : 10) * 1024 * 1024;
    if (file.size > limit)
      return `File “${file.name}” quá lớn. Ảnh tối đa 10 MB, video tối đa 50 MB.`;
  }
  return '';
}
