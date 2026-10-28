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
const seedEnvironment = { ...environment, NODE_OPTIONS: `--import=${new URL('./helpers/disableSeedImageNetwork.js', import.meta.url).href}` };
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

function execute(command, args, options = {}) {
  const { input, env = environment } = options;
  const result = spawnSync(command, args, { input, env, cwd: SERVER_DIRECTORY,
    encoding: 'utf8', windowsHide: true, timeout: 60_000 });
  if (result.error || result.status !== 0) throw new Error(`Seed verification failed: ${result.error?.code || result.stderr}`);
}
function sql(database, statement) {
  execute(psqlExecutable(), [...connectionArgs, '--dbname', database], { input: statement });
}
function importSeed(script = 'db:seed') {
  execute(process.execPath, [process.env.npm_execpath, 'run', script], { env: seedEnvironment });
}
beforeAll(() => {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(connection.hostname) || !connection.pathname.endsWith('_test') ||
    !/^seed_[a-f0-9]+_test$/.test(DATABASE_NAME)) throw new Error('Seed verification requires an isolated local test database.');
  sql('postgres', `CREATE DATABASE "${DATABASE_NAME}";`);
  created = true;
  db = new PrismaClient({ datasourceUrl: databaseUrl.toString() });
}, 60_000);
afterAll(async () => {
  await db?.$disconnect();
  if (created) sql('postgres', `DROP DATABASE "${DATABASE_NAME}";`);
}, 30_000);

async function verifyMigratedSchema() {
  const applied = await db.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  expect(applied.map((row) => row.migration_name)).toEqual(expect.arrayContaining([
    '20261023113000_schema_indexes_and_decimal_optimization',
    '20261025113000_health_history_recorded_date_timestamptz',
    '20261026075600_add_restaurant_source_place_id_status',
    '20261026124500_add_food_scan_ai_generation_type',
    '20261028112816_add_content_moderation_jobs',
  ]));
  const columns = await db.$queryRaw`SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
    FROM information_schema.columns WHERE table_schema = 'public' AND (table_name, column_name) IN
    (('restaurant_menu_prices', 'price'), ('health_histories', 'recorded_date'), ('restaurants', 'source'), ('restaurants', 'place_id'), ('restaurants', 'status'))`;
  expect(columns).toEqual(expect.arrayContaining([
    expect.objectContaining({ table_name: 'restaurant_menu_prices', column_name: 'price', data_type: 'numeric', numeric_precision: 18, numeric_scale: 2 }),
    expect.objectContaining({ table_name: 'health_histories', column_name: 'recorded_date', data_type: 'timestamp with time zone' }),
    expect.objectContaining({ table_name: 'restaurants', column_name: 'source' }),
    expect.objectContaining({ table_name: 'restaurants', column_name: 'place_id' }),
    expect.objectContaining({ table_name: 'restaurants', column_name: 'status' }),
  ]));
  const scanTypes = await db.$queryRaw`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = enumtypid WHERE typname = 'AiGenerationType' AND enumlabel = 'FOOD_SCAN'`;
  expect(scanTypes).toEqual([{ enumlabel: 'FOOD_SCAN' }]);
}

describe('seed compatibility with moderation migrations', () => {
  it('applies pending migrations before seeding through either npm alias and resets stale jobs on re-seed', async () => {
    importSeed('seed');
    await verifyMigratedSchema();
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

  it('also applies migrations when invoked through the Prisma seed entry point', async () => {
    sql(DATABASE_NAME, 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    execute(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'seed'], { env: seedEnvironment });
    expect(await db.user.count()).toBeGreaterThan(0);
    expect(await db.contentModerationJob.count()).toBe(0);
  }, 60_000);
});
