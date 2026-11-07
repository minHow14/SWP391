// D:/SWP391/SWP391/server/src/services/moderationImageLoader.js
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { POST_UPLOAD_DIRECTORY } from '../config/uploads.js';
import { MODERATION_IMAGE_UNREADABLE, MODERATION_MAX_IMAGE_BYTES } from '../constants/contentModeration.js';
import { POST_IMAGE_URL_PATTERN } from '../constants/postMedia.js';
import { detectImageMimeType } from '../utils/imageSignature.js';

const unreadableImage = () => Object.assign(new Error('Moderation image is unreadable.'), { errorCode: MODERATION_IMAGE_UNREADABLE });

/** Reads only server-uploaded post images; the URL pattern rules out traversal before touching the disk. */
export async function loadModerationImage(imageUrl, { directory = POST_UPLOAD_DIRECTORY } = {}) {
  if (!POST_IMAGE_URL_PATTERN.test(imageUrl)) throw unreadableImage();
  const filePath = path.join(directory, path.basename(imageUrl));
  try {
    const { size } = await stat(filePath);
    if (size > MODERATION_MAX_IMAGE_BYTES) throw unreadableImage();
    const buffer = await readFile(filePath);
    const mimeType = detectImageMimeType(buffer);
    if (!mimeType) throw unreadableImage();
    return { mimeType, imageBase64: buffer.toString('base64') };
  } catch (error) {
    if (error.errorCode) throw error;
    throw unreadableImage();
  }
}
