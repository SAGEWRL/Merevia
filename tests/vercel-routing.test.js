import assert from 'node:assert/strict';
import { test } from 'node:test';
import { originalApiUrl } from '../scripts/vercel-routing.js';

test('Vercel rewrite restores nested API paths and original query parameters', () => {
  const request = {
    url: '/api/index?path=admin/session&next=%2Fadmin',
    headers: { host: 'merevia.vercel.app' },
  };

  const url = originalApiUrl(request);

  assert.equal(url.pathname, '/api/admin/session');
  assert.equal(url.searchParams.get('next'), '/admin');
  assert.equal(url.searchParams.has('path'), false);
});