import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { openDb } from './db/index.js';
import { listLoads } from './db/loads.js';
import { DEMO_PASSWORD, seed } from './db/seed.js';
import { cityCoordinates } from './tracking/cities.js';
import { MockProvider } from './tracking/mockProvider.js';
import { SamsaraProvider } from './tracking/samsaraProvider.js';

const db = openDb(':memory:');
const server = createApp(db, { trackingProvider: new MockProvider(1) }).listen(0);
const samsaraServer = createApp(db, { trackingProvider: new SamsaraProvider() }).listen(0);
const base = (s = server) => `http://127.0.0.1:${(s.address() as AddressInfo).port}/api`;

async function signIn(driverId: string, s = server): Promise<string> {
  const res = await fetch(`${base(s)}/auth/login`, {
    method: 'POST',
    headers: { Origin: config.appOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId, password: DEMO_PASSWORD }),
  });
  return (res.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
}

const getTracking = (cookie?: string, query = '', s = server) =>
  fetch(`${base(s)}/tracking/active-load${query}`, { headers: cookie ? { Cookie: cookie } : {} });

let cody = '';
let anthony = '';

beforeAll(async () => {
  seed(db);
  cody = await signIn('D-1042');
  anthony = await signIn('D-2217');
});
afterAll(() => {
  server.close();
  samsaraServer.close();
  db.close();
});

describe('GET /api/tracking/active-load', () => {
  it('needs a session', async () => {
    expect((await getTracking()).status).toBe(401);
  });

  it("puts Cody's truck between Dallas and Atlanta, marked as simulated", async () => {
    const body = await (await getTracking(cody)).json();
    expect(body.simulated).toBe(true);
    expect(body.load.id).toBe('L-48213');
    expect(body.position.lat).toBeGreaterThan(32.7);
    expect(body.position.lat).toBeLessThan(33.8);
    expect(body.position.lng).toBeGreaterThan(-96.8);
    expect(body.position.lng).toBeLessThan(-84.3);
    expect(body.position.speedMph).toBeGreaterThan(0);
  });

  it("shows Anthony only his own load, with no position because it hasn't been picked up", async () => {
    const body = await (await getTracking(anthony)).json();
    expect(body.load.id).toBe('L-52007');
    expect(body.load.status).toBe('pending');
    expect(body.position).toBeNull();
  });

  it("cannot return another driver's position, even when asked for it", async () => {
    const res = await getTracking(anthony, '?driverId=D-1042&loadId=L-48213');
    const text = await res.text();
    expect(JSON.parse(text).load.id).toBe('L-52007');
    expect(text).not.toContain('L-48213');
  });

  it('gives a plain message when the provider is not configured', async () => {
    const samsaraCookie = await signIn('D-1042', samsaraServer);
    const res = await getTracking(samsaraCookie, '', samsaraServer);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.message).toContain('Live tracking is not available right now');
  });
});

describe('simulated positions', () => {
  it('has coordinates for every city in the seed data', () => {
    for (const driverId of ['D-1042', 'D-2217']) {
      for (const load of listLoads(db, driverId)) {
        expect(() => cityCoordinates(load.origin)).not.toThrow();
        expect(() => cityCoordinates(load.destination)).not.toThrow();
      }
    }
  });

  it('fails loudly on a city it does not know', () => {
    expect(() => cityCoordinates({ city: 'Springfield', state: 'XX' })).toThrow(/Springfield/);
  });

  it('moves the truck toward the destination as time passes in demo speed', () => {
    const [load] = listLoads(db, 'D-1042').filter((l) => l.status === 'in_transit');
    const startedAt = Date.now();
    const provider = new MockProvider(60, startedAt);
    const now = provider.getPosition(load!, startedAt)!;
    const later = provider.getPosition(load!, startedAt + 30_000)!;
    expect(later.lng).toBeGreaterThan(now.lng);
  });

  it('loops the demo truck back to the start instead of parking it at the destination', () => {
    const [load] = listLoads(db, 'D-1042').filter((l) => l.status === 'in_transit');
    const startedAt = Date.now();
    const provider = new MockProvider(1000, startedAt);
    const dallas = cityCoordinates(load!.origin);
    const atlanta = cityCoordinates(load!.destination);
    for (const minutes of [1, 4, 9, 30, 600]) {
      const p = provider.getPosition(load!, startedAt + minutes * 60_000)!;
      expect(p.lng).toBeGreaterThanOrEqual(dallas.lng);
      expect(p.lng).toBeLessThanOrEqual(atlanta.lng);
    }
    const early = provider.getPosition(load!, startedAt + 30_000)!;
    const late = provider.getPosition(load!, startedAt + 60_000)!;
    expect(late.lng).toBeLessThan(early.lng);
  });

  it('keeps the truck still at real speed when no time has passed', () => {
    const [load] = listLoads(db, 'D-1042').filter((l) => l.status === 'in_transit');
    const provider = new MockProvider(1, Date.now());
    const a = provider.getPosition(load!, 1_000_000)!;
    const b = provider.getPosition(load!, 1_000_000)!;
    expect(a.lat).toBe(b.lat);
  });

  it('gives no position for a load that is not on the road', () => {
    const delivered = listLoads(db, 'D-1042').find((l) => l.status === 'delivered');
    expect(new MockProvider().getPosition(delivered!)).toBeNull();
  });
});
