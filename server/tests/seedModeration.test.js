// D:/SWP391/SWP391/server/tests/seedModeration.test.js
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SERVER_DIRECTORY = fileURLToPath(new URL('../', import.meta.url));
const DATABASE_NAME = `seed_${randomUUID().replaceAll('-', '')}_test`;
const connection = new URL(process.env.DATABASE_URL);
const databaseUrl = new URL(connection);
databaseUrl.pathname = `/${DATABASE_NAME}`;
const environment = { ...process.env, DATABASE_URL: databaseUrl.toString(), PGPASSWORD: decodeURIComponent(connection.password) };
const connectionArgs = ['--host', connection.hostname, '--port', connection.port || '5432',
  '--username', decodeURIComponent(connection.username), '--no-password', '--no-psqlrc', '--quiet', '--set', 'ON_ERROR_STOP=1'];
let db, created = false;

function psqlExecutable() {
  if (process.env.PSQL_PATH && process.env.PSQL_PATH !== 'psql') return process.env.PSQL_PATH;
  if (process.platform !== 'win32') return 'psql';
  const root = join(process.env.ProgramFiles || 'C:/Program Files', 'PostgreSQL');
  const versions = existsSync(root) ? readdirSync(root).sort((left, right) => Number(right) - Number(left)) : [];
  return versions.map((version) => join(root, version, 'bin', 'psql.exe')).find(existsSync) || 'psql';
}

function execute(command, args, input) {
  const result = spawnSync(command, args, { input, env: environment, cwd: SERVER_DIRECTORY,
    encoding: 'utf8', windowsHide: true, timeout: 60_000 });
  if (result.error || result.status !== 0) throw new Error(`Seed verification failed: ${result.error?.code || result.stderr}`);
}
function sql(database, statement) {
  execute(psqlExecutable(), [...connectionArgs, '--dbname', database], statement);
}
function importSeed() {
  execute(psqlExecutable(), [...connectionArgs, '--dbname', DATABASE_NAME, '--file', 'prisma/seed.sql']);
}
beforeAll(() => {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(connection.hostname) || !connection.pathname.endsWith('_test') ||
    !/^seed_[a-f0-9]+_test$/.test(DATABASE_NAME)) throw new Error('Seed verification requires an isolated local test database.');
  sql('postgres', `CREATE DATABASE "${DATABASE_NAME}";`);
  created = true;
  execute(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
  db = new PrismaClient({ datasourceUrl: databaseUrl.toString() });
}, 60_000);
afterAll(async () => {
  await db?.$disconnect();
  if (created) sql('postgres', `DROP DATABASE "${DATABASE_NAME}";`);
}, 30_000);

describe('seed compatibility with moderation migrations', () => {
  it('initializes a migrated database without fabricated AI decisions and resets stale jobs on re-seed', async () => {
    importSeed();
    expect(await db.contentModerationJob.count()).toBe(0);
    expect(await db.post.count({ where: { status: 'HIDDEN_BY_AI' } })).toBe(0);
    expect(await db.comment.count({ where: { OR: [{ status: 'HIDDEN_BY_AI' }, { is_flagged_by_ai: true }] } })).toBe(0);
    const initialPosts = await db.post.count();
    const initialComments = await db.comment.count();
    expect(initialPosts).toBeGreaterThan(0);
    expect(initialComments).toBeGreaterThan(0);
    const blog = await db.blog.findFirstOrThrow({ include: { post: true } });
    await db.post.update({ where: { post_id: blog.post_id }, data: { moderationVersion: 1, status: 'PENDING_MODERATION' } });
    await db.contentModerationJob.create({ data: { userId: blog.post.author_id, postId: blog.post_id,
      contentVersion: 1, title: blog.title, content: blog.content } });
    importSeed();
    expect(await db.contentModerationJob.count()).toBe(0);
    expect(await db.post.count()).toBe(initialPosts);
    expect(await db.comment.count()).toBe(initialComments);
    expect(await db.post.count({ where: { moderationVersion: { not: 0 } } })).toBe(0);
    expect(await db.comment.count({ where: { moderationVersion: { not: 0 } } })).toBe(0);
  }, 60_000);
});
