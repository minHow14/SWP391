// d:\Projects\FPT\SWP391\server\scripts/prepareTestDatabase.js
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const SERVER_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(SERVER_DIRECTORY, '.env.test'), override: true, quiet: true });
const databaseUrl = new URL(process.env.DATABASE_URL);
const databaseName = databaseUrl.pathname.slice(1);
if (!/^[a-zA-Z0-9_]+_test$/.test(databaseName)) throw new Error('Refusing to prepare a database without the _test suffix.');
if (!['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname)) throw new Error('This helper only prepares a local test database.');
const psql = process.env.PSQL_PATH || 'psql';
const connectionArgs = ['-h', databaseUrl.hostname, '-p', databaseUrl.port || '5432', '-U', decodeURIComponent(databaseUrl.username), '-w', '-v', 'ON_ERROR_STOP=1', '-q'];
const childEnvironment = { ...process.env, PGPASSWORD: decodeURIComponent(databaseUrl.password) };

function executeSql(database, sql) {
  const result = spawnSync(psql, [...connectionArgs, '-d', database], { input: sql, env: childEnvironment, encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`Failed to prepare the isolated test database: ${result.error?.code || result.stderr}`);
  return result.stdout;
}

const exists = executeSql('postgres', `SELECT datname FROM pg_database WHERE datname = '${databaseName}';`);
if (!exists.includes(databaseName)) executeSql('postgres', `CREATE DATABASE "${databaseName}";`);
const prismaCli = path.join(SERVER_DIRECTORY, 'node_modules/prisma/build/index.js');
executeSql(databaseName, 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
const migration = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
  cwd: SERVER_DIRECTORY, env: childEnvironment, encoding: 'utf8', windowsHide: true,
});
if (migration.status !== 0) throw new Error(`Could not apply migrations to the test database: ${migration.stderr}`);
executeSql(databaseName, fs.readFileSync(path.join(SERVER_DIRECTORY, 'prisma/seed.sql'), 'utf8'));
process.stdout.write(`Prepared isolated database ${databaseName}. Development data was not modified.\n`);
