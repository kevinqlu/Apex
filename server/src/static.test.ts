import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { openDb } from './db/index.js';

const webDist = fs.mkdtempSync(path.join(os.tmpdir(), 'apex-web-'));
fs.writeFileSync(
  path.join(webDist, 'index.html'),
  '<!doctype html><title>Apex</title><div id="root"></div>',
);
fs.mkdirSync(path.join(webDist, 'assets'));
fs.writeFileSync(path.join(webDist, 'assets', 'app.js'), 'console.log("app")');

const db = openDb(':memory:');
const withWeb = createApp(db, { webDist }).listen(0);
const withoutWeb = createApp(db, { webDist: undefined }).listen(0);
const url = (server: typeof withWeb, route: string) =>
  `http://127.0.0.1:${(server.address() as AddressInfo).port}${route}`;

afterAll(() => {
  withWeb.close();
  withoutWeb.close();
  fs.rmSync(webDist, { recursive: true, force: true });
});

describe('serving the built web app', () => {
  it('serves the app at the root and its files', async () => {
    const page = await fetch(url(withWeb, '/'));
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<div id="root">');
    const asset = await fetch(url(withWeb, '/assets/app.js'));
    expect(await asset.text()).toBe('console.log("app")');
  });

  it('gives the app for any screen address, so a refresh on /loads works', async () => {
    const res = await fetch(url(withWeb, '/loads'));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<div id="root">');
  });

  it('keeps /api answers as JSON, never the app page', async () => {
    expect((await (await fetch(url(withWeb, '/api/health'))).json()).ok).toBe(true);
    const missing = await fetch(url(withWeb, '/api/nothing-here'));
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe('not_found');
  });

  it('serves nothing when there is no built app, such as in development', async () => {
    expect((await fetch(url(withoutWeb, '/'))).status).toBe(404);
  });
});

describe('response headers', () => {
  it('stop the browser guessing types and stop other sites framing the app', async () => {
    const res = await fetch(url(withWeb, '/api/health'));
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });
});
