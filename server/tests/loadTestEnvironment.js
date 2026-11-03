// d:\Projects\FPT\SWP391\server\tests/loadTestEnvironment.js
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env.test', import.meta.url), override: true, quiet: true });
const databaseUrl = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
if (!databaseUrl.pathname.endsWith('_test')) throw new Error('Tests require .env.test and a separate database ending in _test.');
process.env.NODE_ENV = 'test';
// A developer's .env must not switch moderation on for unrelated suites; moderation tests opt in explicitly.
process.env.CONTENT_MODERATION_ENABLED ??= 'false';
