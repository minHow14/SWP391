// D:/SWP391/SWP391/server/tests/helpers/openApiContract.js
// Helper dựng schema Zod từ tài liệu OpenAPI kiểm duyệt nội dung, dùng để test response đúng hợp đồng API.
import { readFileSync } from 'node:fs';
import { z } from 'zod';

const apiDocument = JSON.parse(readFileSync(new URL('../../../docs/content-moderation-openapi.json', import.meta.url), 'utf8'));

// Giải đệ quy các $ref trong OpenAPI thành schema đầy đủ và bỏ trường "default".
// @param schema nút schema bất kỳ (object, mảng hoặc giá trị nguyên thủy)
// @returns schema đã thay $ref bằng định nghĩa thật
function resolveSchema(schema) {
  if (Array.isArray(schema)) return schema.map(resolveSchema);
  if (!schema || typeof schema !== 'object') return schema;
  if (schema.$ref) return resolveSchema(schema.$ref.split('/').slice(1).reduce((value, key) => value[key], apiDocument));
  // Giá trị default trong JSON Schema chỉ là chú thích; khi kiểm tra dữ liệu thật không được tự điền các trường bắt buộc bị thiếu.
  return Object.fromEntries(Object.entries(schema).filter(([key]) => key !== 'default').map(([key, value]) => [key, resolveSchema(value)]));
}

// Trả về schema Zod của một component trong OpenAPI kiểm duyệt theo tên.
export const moderationContract = (name) => z.fromJSONSchema(resolveSchema(apiDocument.components.schemas[name]));
