// D:/SWP391/SWP391/server/src/utils/imageSignature.js
// The declared extension or MIME type is client-controlled; only the file header proves the real format.
export const IMAGE_SIGNATURE_BYTES = 12;

const startsWith = (buffer, bytes, offset = 0) => bytes.every((byte, index) => buffer[offset + index] === byte);

const SIGNATURES = [
  { mimeType: 'image/png', matches: (buffer) => startsWith(buffer, [0x89, 0x50, 0x4e, 0x47]) },
  { mimeType: 'image/jpeg', matches: (buffer) => startsWith(buffer, [0xff, 0xd8, 0xff]) },
  { mimeType: 'image/gif', matches: (buffer) => startsWith(buffer, [0x47, 0x49, 0x46, 0x38]) },
  { mimeType: 'image/webp',
    matches: (buffer) => startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8) },
];

export function detectImageMimeType(buffer) {
  if (!buffer || buffer.length < IMAGE_SIGNATURE_BYTES) return null;
  return SIGNATURES.find((signature) => signature.matches(buffer))?.mimeType ?? null;
}
