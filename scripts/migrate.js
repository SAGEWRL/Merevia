import { openDatabase, migrateLatest, rollbackLastMigration } from './database.js';

const database = openDatabase();
try {
  if (process.argv.includes('--down')) {
    const version = rollbackLastMigration(database);
    console.log(version ? `Rolled back ${version}.` : 'No migration to roll back.');
  } else {
    migrateLatest(database);
    console.log('Database schema is up to date.');
  }
} finally {
  database.close();
}