// D:/SWP391/SWP391/server/src/config/uploads.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const UPLOAD_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
export const POST_UPLOAD_DIRECTORY = path.join(UPLOAD_ROOT, 'posts');
