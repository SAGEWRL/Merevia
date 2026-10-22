import { put, del } from '@vercel/blob';
import { Pool } from '@neondatabase/serverless';
import { createApiHandler } from '../scripts/api.js';
import { createPostgresDatabase } from '../scripts/postgres-database.js';
import { POSTGRES_SCHEMA } from '../scripts/postgres-schema.js';
import { originalApiUrl } from '../scripts/vercel-routing.js';

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const database = pool ? createPostgresDatabase(pool) : null;
let schemaReady;
let handleApi;

const photoStorage = {
  async put(fileName, bytes, contentType) {
    const blob = await put(fileName, bytes, { access: 'public', contentType, addRandomSuffix: false });
    return blob.url;
  },
  delete(url) {
    return del(url);
  },
};

export default async function handler(request, response) {
  const missing = [
    !process.env.DATABASE_URL && 'DATABASE_URL',
    !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 14 ? 'ADMIN_PASSWORD' : null,
    !process.env.BOOKING_ACCESS_SECRET || process.env.BOOKING_ACCESS_SECRET.length < 32 ? 'BOOKING_ACCESS_SECRET' : null,
    !process.env.BLOB_READ_WRITE_TOKEN && 'BLOB_READ_WRITE_TOKEN',
  ].filter(Boolean);
  if (missing.length) {
    response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: { code: 'deployment_not_configured', message: `Configure ${missing.join(', ')} for this deployment.` } }));
    return;
  }

  if (!database) {
    response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: { code: 'database_not_configured', message: 'DATABASE_URL is not configured for this deployment.' } }));
    return;
  }

  try {
    schemaReady ??= database.exec(POSTGRES_SCHEMA).catch((error) => {
      schemaReady = undefined;
      throw error;
    });
    await schemaReady;
    handleApi ??= createApiHandler({ database, environment: process.env, photoStorage });
    await handleApi(request, response, originalApiUrl(request));
  } catch (error) {
    console.error('Vercel API request failed:', error);
    response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: { code: 'service_unavailable', message: 'The service is not configured or temporarily unavailable.' } }));
  }
}