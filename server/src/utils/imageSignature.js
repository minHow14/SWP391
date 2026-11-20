// D:/SWP391/SWP391/server/src/utils/imageSignature.js
// Đuôi file hoặc MIME type khai báo do client kiểm soát; chỉ phần header (magic bytes) của file mới chứng minh định dạng thật.
// Số byte đầu cần đọc để nhận diện (WebP cần tới byte thứ 12).
export const IMAGE_SIGNATURE_BYTES = 12;

// Kiểm tra buffer có chứa dãy byte cho trước tại vị trí offset hay không.
const startsWith = (buffer, bytes, offset = 0) => bytes.every((byte, index) => buffer[offset + index] === byte);

// Chữ ký nhận diện từng định dạng ảnh được hỗ trợ; WebP là container RIFF có chữ "WEBP" ở byte 8.
const SIGNATURES = [
  { mimeType: 'image/png', matches: (buffer) => startsWith(buffer, [0x89, 0x50, 0x4e, 0x47]) },
  { mimeType: 'image/jpeg', matches: (buffer) => startsWith(buffer, [0xff, 0xd8, 0xff]) },
  { mimeType: 'image/gif', matches: (buffer) => startsWith(buffer, [0x47, 0x49, 0x46, 0x38]) },
  { mimeType: 'image/webp',
    matches: (buffer) => startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8) },
];

// Trả về MIME type thật của ảnh dựa trên magic bytes, hoặc null nếu không nhận diện được.
export function detectImageMimeType(buffer) {
  if (!buffer || buffer.length < IMAGE_SIGNATURE_BYTES) return null;
  return SIGNATURES.find((signature) => signature.matches(buffer))?.mimeType ?? null;
}
