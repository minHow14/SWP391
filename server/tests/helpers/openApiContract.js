// D:/SWP391/SWP391/server/tests/helpers/openApiContract.js
import { readFileSync } from 'node:fs';
import { z } from 'zod';

const apiDocument = JSON.parse(readFileSync(new URL('../../../docs/content-moderation-openapi.json', import.meta.url), 'utf8'));

function resolveSchema(schema) {
  if (Array.isArray(schema)) return schema.map(resolveSchema);
  if (!schema || typeof schema !== 'object') return schema;
  if (schema.$ref) return resolveSchema(schema.$ref.split('/').slice(1).reduce((value, key) => value[key], apiDocument));
  // JSON Schema defaults are annotations; wire validation must not fill missing required fields.
  return Object.fromEntries(Object.entries(schema).filter(([key]) => key !== 'default').map(([key, value]) => [key, resolveSchema(value)]));
}

export const moderationContract = (name) => z.fromJSONSchema(resolveSchema(apiDocument.components.schemas[name]));
