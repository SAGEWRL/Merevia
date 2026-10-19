import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const migrationsPath = resolve(projectRoot, 'migrations');

export function openDatabase(databasePath = process.env.DATABASE_PATH || resolve(projectRoot, 'data/bjlive.sqlite')) {
  if (databasePath !== ':memory:' && !databasePath.startsWith('file:')) {
    mkdirSync(dirname(resolve(databasePath)), { recursive: true });
  }

  const database = new DatabaseSync(databasePath);
  database.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  return database;
}

export function migrateLatest(database) {
  const applied = database.prepare('SELECT version FROM schema_migrations WHERE version = ?');
  const record = database.prepare('INSERT INTO schema_migrations (version) VALUES (?)');
  const migrationFiles = readdirSync(migrationsPath)
    .filter((fileName) => /^\d+_[a-z0-9_-]+\.sql$/i.test(fileName))
    .sort();

  for (const fileName of migrationFiles) {
    const version = fileName.slice(0, fileName.length - 4);
    if (applied.get(version)) continue;

    database.exec('BEGIN IMMEDIATE');
    try {
      database.exec(readFileSync(resolve(migrationsPath, fileName), 'utf8'));
      record.run(version);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw new Error(`Could not apply migration ${fileName}: ${error.message}`, { cause: error });
    }
  }
}

export function rollbackLastMigration(database) {
  const row = database.prepare('SELECT version FROM schema_migrations ORDER BY applied_at DESC, version DESC LIMIT 1').get();
  if (!row) return null;
  const rollbackPath = resolve(migrationsPath, `${row.version}.down.sql`);
  const rollbackSql = readFileSync(rollbackPath, 'utf8');
  database.exec('BEGIN IMMEDIATE');
  try {
    database.exec(rollbackSql);
    database.prepare('DELETE FROM schema_migrations WHERE version = ?').run(row.version);
    database.exec('COMMIT');
    return row.version;
  } catch (error) {
    database.exec('ROLLBACK');
    throw new Error(`Could not roll back migration ${row.version}: ${error.message}`, { cause: error });
  }
}

export function createDatabase(databasePath = process.env.DATABASE_PATH || resolve(projectRoot, 'data/bjlive.sqlite')) {
  const database = openDatabase(databasePath);
  try {
    migrateLatest(database);
  } catch (error) {
    database.close();
    throw error;
  }
  return database;
}