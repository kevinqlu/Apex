import type { AddressInfo } from 'node:net';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { openDb } from './db/index.js';
import { DEMO_PASSWORD, seed } from './db/seed.js';

const db = openDb(':memory:');
const server = createApp(db).listen(0);
const base = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const sameOrigin = { Origin: config.appOrigin, 'Content-Type': 'application/json' };

function post(path: string, body: unknown = {}, headers: Record<string, string> = {}) {
  return fetch(`${base()}/api${path}`, {
    method: 'POST',
    headers: { ...sameOrigin, ...headers },
    body: JSON.stringify(body),
  });
}

function login(driverId = 'D-1042', password = DEMO_PASSWORD) {
  return post('/auth/login', { driverId, password });
}

function cookieFrom(res: Response): string {
  const header = res.headers.get('set-cookie') ?? '';
  return header.split(';')[0] ?? '';
}

beforeEach(() => seed(db));
afterAll(() => {
  server.close();
});

describe('login', () => {
  it('signs in with the right credentials and sets a locked-down cookie', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.driver.id).toBe('D-1042');
    expect(JSON.stringify(body)).not.toContain('password');
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
  });

  it('gives the same generic error for a wrong password and an unknown ID', async () => {
    const wrongPassword = await login('D-1042', 'not-the-password');
    const unknownId = await login('D-9999', DEMO_PASSWORD);
    expect(wrongPassword.status).toBe(401);
    expect(unknownId.status).toBe(401);
    expect(await wrongPassword.json()).toEqual(await unknownId.json());
  });

  it('blocks the sixth attempt, even with the right password', async () => {
    for (let i = 0; i < 5; i++) expect((await login('D-2217', 'wrong-password')).status).toBe(401);
    const blocked = await login('D-2217', DEMO_PASSWORD);
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.message).toMatch(/try again in \d+ minutes?/i);
    expect((await login('D-1042')).status).toBe(200);
  });
});

describe('sessions', () => {
  it('rejects calls with no session', async () => {
    const res = await fetch(`${base()}/api/auth/me`);
    expect(res.status).toBe(401);
    expect((await res.json()).error.message).toBe('Your session expired. Sign in again.');
  });

  it('returns the signed-in driver from /me', async () => {
    const cookie = cookieFrom(await login('D-1042'));
    const res = await fetch(`${base()}/api/auth/me`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    expect((await res.json()).driver.id).toBe('D-1042');
  });

  it('rejects an expired session', async () => {
    const cookie = cookieFrom(await login());
    db.prepare('UPDATE sessions SET expires_at = ?').run(new Date(Date.now() - 1000).toISOString());
    const res = await fetch(`${base()}/api/auth/me`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(401);
  });

  it('ends the session on the server when signing out', async () => {
    const cookie = cookieFrom(await login());
    expect((await post('/auth/logout', {}, { Cookie: cookie })).status).toBe(200);
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 0 });
    const res = await fetch(`${base()}/api/auth/me`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(401);
  });
});

describe('request checks', () => {
  it('rejects a mutating request from another origin', async () => {
    const res = await post(
      '/auth/login',
      { driverId: 'D-1042', password: DEMO_PASSWORD },
      { Origin: 'https://evil.example' },
    );
    expect(res.status).toBe(403);
  });

  it('rejects a mutating request that is not JSON', async () => {
    const res = await post('/auth/login', {}, { 'Content-Type': 'text/plain' });
    expect(res.status).toBe(415);
  });

  it('answers unknown API paths in the standard error shape', async () => {
    const res = await fetch(`${base()}/api/nothing-here`);
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('not_found');
  });
});
