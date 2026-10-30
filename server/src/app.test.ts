import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { openDb } from './db/index.js';
import { seed } from './db/seed.js';

const db = openDb(':memory:');
const server = createApp(db).listen(0);
const base = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

beforeAll(() => seed(db));
afterAll(() => {
  server.close();
});

describe('health', () => {
  it('reports ok when the database answers', async () => {
    const res = await fetch(`${base()}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('seed', () => {
  it('gives the two drivers different loads', () => {
    const loadsFor = (id: string) =>
      db.prepare('SELECT id FROM loads WHERE driver_id = ?').all(id).length;
    expect(loadsFor('D-1042')).toBe(4);
    expect(loadsFor('D-2217')).toBe(1);
  });

  it('can run twice and leave the same data', () => {
    seed(db);
    expect(db.prepare('SELECT COUNT(*) AS n FROM drivers').get()).toEqual({ n: 2 });
  });
});
