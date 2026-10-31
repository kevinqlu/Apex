import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { openDb } from './db/index.js';
import { DEMO_PASSWORD, seed } from './db/seed.js';

const db = openDb(':memory:');
const server = createApp(db).listen(0);
const base = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

let cody = '';
let anthony = '';

async function signIn(driverId: string): Promise<string> {
  const res = await fetch(`${base()}/auth/login`, {
    method: 'POST',
    headers: { Origin: config.appOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId, password: DEMO_PASSWORD }),
  });
  return (res.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
}

const get = (path: string, cookie?: string) =>
  fetch(`${base()}${path}`, { headers: cookie ? { Cookie: cookie } : {} });

const patch = (path: string, body: unknown, cookie: string) =>
  fetch(`${base()}${path}`, {
    method: 'PATCH',
    headers: { Origin: config.appOrigin, 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });

beforeAll(async () => {
  seed(db);
  cody = await signIn('D-1042');
  anthony = await signIn('D-2217');
});
afterAll(() => {
  server.close();
});

describe('loads are scoped to the signed-in driver', () => {
  it('requires a session', async () => {
    expect((await get('/loads')).status).toBe(401);
    expect((await get('/loads/L-48213')).status).toBe(401);
  });

  it('shows each driver only their own loads', async () => {
    const marcusIds = ((await (await get('/loads', cody)).json()).loads as { id: string }[]).map(
      (l) => l.id,
    );
    const danaIds = ((await (await get('/loads', anthony)).json()).loads as { id: string }[]).map(
      (l) => l.id,
    );
    expect(marcusIds).toHaveLength(4);
    expect(danaIds).toEqual(['L-52007']);
  });

  it('returns 404, not 403, when a driver asks for another driver’s load', async () => {
    // L-48213 is Cody's. Anthony asking for it must look the same as asking for a load that does not exist.
    const theirs = await get('/loads/L-48213', anthony);
    const missing = await get('/loads/L-00000', anthony);
    expect(theirs.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(await theirs.json()).toEqual(await missing.json());
    expect((await get('/loads/L-48213', cody)).status).toBe(200);
  });

  it('returns every field the driver needs to see', async () => {
    const { load } = await (await get('/loads/L-48230', cody)).json();
    expect(load).toMatchObject({
      id: 'L-48230',
      status: 'delayed',
      origin: { city: 'Houston', state: 'TX', facility: 'Gulf Cold Storage' },
      destination: { city: 'Nashville', state: 'TN', facility: 'Music City Grocers' },
      cargoDescription: expect.any(String),
      weightLb: expect.any(Number),
      equipment: '53 ft reefer',
      pickupAt: expect.any(String),
      deliveryAt: expect.any(String),
      delayNote: expect.stringContaining('late'),
      reference: 'PO-77188',
    });
  });

  it('puts the truck about 40% along a load in transit, and at the ends otherwise', async () => {
    const { loads } = (await (await get('/loads', cody)).json()) as {
      loads: { id: string; progress: number }[];
    };
    const progress = Object.fromEntries(loads.map((l) => [l.id, l.progress]));
    expect(progress['L-48213']).toBeGreaterThan(0.35);
    expect(progress['L-48213']).toBeLessThan(0.45);
    expect(progress['L-48230']).toBe(0);
    expect(progress['L-48244']).toBe(0);
    expect(progress['L-48190']).toBe(1);
  });
});

describe('duty status', () => {
  it('changes only the signed-in driver', async () => {
    const res = await patch('/me/duty-status', { dutyStatus: 'driving' }, cody);
    expect(res.status).toBe(200);
    expect((await res.json()).driver.dutyStatus).toBe('driving');
    const danaNow = await (await get('/auth/me', anthony)).json();
    expect(danaNow.driver.dutyStatus).toBe('off_duty');
  });

  it('rejects a status that does not exist', async () => {
    const res = await patch('/me/duty-status', { dutyStatus: 'napping' }, cody);
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toMatch(/Driving, On duty, Sleeper, or Off duty/);
  });
});
