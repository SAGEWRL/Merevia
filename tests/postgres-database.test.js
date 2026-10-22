import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPostgresDatabase } from '../scripts/postgres-database.js';

test('PostgreSQL adapter binds placeholders and preserves prepared-query results', async () => {
  const calls = [];
  const pool = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      return { rows: [{ id: 'example' }], rowCount: 1 };
    },
  };
  const database = createPostgresDatabase(pool);

  assert.deepEqual(await database.prepare('SELECT * FROM properties WHERE id = ? AND slug = ?').get('id', 'slug'), { id: 'example' });
  assert.deepEqual(await database.prepare('SELECT * FROM properties').all(), [{ id: 'example' }]);
  assert.deepEqual(await database.prepare('DELETE FROM properties WHERE id = ?').run('id'), { changes: 1 });

  await database.exec('CREATE TABLE first_table (id TEXT); CREATE TABLE second_table (id TEXT);');

  assert.equal(calls[0].sql, 'SELECT * FROM properties WHERE id = $1 AND slug = $2');
  assert.deepEqual(calls[0].values, ['id', 'slug']);
  assert.equal(calls.length, 5);
});