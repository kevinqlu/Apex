import type { AddressInfo } from 'node:net';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { openDb } from './db/index.js';
import { DEMO_PASSWORD, seed } from './db/seed.js';

const db = openDb(':memory:');
const server = createApp(db).listen(0);
const base = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

let cody = '';
let anthony = '';

interface Item {
  id: string;
  read: boolean;
  kind: string;
}

async function signIn(driverId: string): Promise<string> {
  const res = await fetch(`${base()}/auth/login`, {
    method: 'POST',
    headers: { Origin: config.appOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId, password: DEMO_PASSWORD }),
  });
  return (res.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
}

const list = async (cookie: string): Promise<Item[]> =>
  (await (await fetch(`${base()}/notifications`, { headers: { Cookie: cookie } })).json())
    .notifications;

const markRead = (cookie: string, ids: unknown) =>
  fetch(`${base()}/notifications/read`, {
    method: 'POST',
    headers: { Origin: config.appOrigin, 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ ids }),
  });

const unreadIds = (items: Item[]) => items.filter((n) => !n.read).map((n) => n.id);

beforeEach(async () => {
  seed(db);
  cody = await signIn('D-1042');
  anthony = await signIn('D-2217');
});
afterAll(() => {
  server.close();
});

describe('who gets which notification', () => {
  it('requires a session', async () => {
    expect((await fetch(`${base()}/notifications`)).status).toBe(401);
  });

  it('sends a targeted alert only to the driver it names', async () => {
    const marcusIds = (await list(cody)).map((n) => n.id);
    const danaIds = (await list(anthony)).map((n) => n.id);
    expect([...marcusIds].sort()).toEqual(['N-1', 'N-2', 'N-3', 'N-4']);
    expect(danaIds).not.toContain('N-2');
    expect(danaIds.sort()).toEqual(['N-1', 'N-3', 'N-4']);
  });

  it('lists the newest first', async () => {
    const ids = (await list(cody)).map((n) => n.id);
    expect(ids).toEqual(['N-2', 'N-1', 'N-3', 'N-4']);
  });
});

describe('read state is per driver', () => {
  it('starts with the seeded unread and read items', async () => {
    expect(unreadIds(await list(cody)).sort()).toEqual(['N-1', 'N-2', 'N-3']);
    expect(unreadIds(await list(anthony)).sort()).toEqual(['N-1', 'N-3', 'N-4']);
  });

  it('marking read as Cody does not change Anthony', async () => {
    const before = await list(anthony);
    const res = await markRead(cody, ['N-1', 'N-3']);
    expect(res.status).toBe(200);
    expect(unreadIds((await res.json()).notifications)).toEqual(['N-2']);
    expect(await list(anthony)).toEqual(before);
  });

  it('can be repeated without changing anything', async () => {
    await markRead(cody, ['N-1']);
    const again = await markRead(cody, ['N-1']);
    expect(again.status).toBe(200);
    expect(unreadIds(await list(cody)).sort()).toEqual(['N-2', 'N-3']);
  });

  it('ignores an alert that was not sent to the driver, without saying whether it exists', async () => {
    const notSent = await markRead(anthony, ['N-2']);
    const missing = await markRead(anthony, ['N-999']);
    expect(notSent.status).toBe(200);
    expect(missing.status).toBe(200);
    expect(
      db.prepare("SELECT COUNT(*) AS n FROM notification_reads WHERE driver_id = 'D-2217'").get(),
    ).toEqual({ n: 0 });
    expect(unreadIds(await list(cody))).toContain('N-2');
  });

  it('rejects a request that is not a list of IDs', async () => {
    expect((await markRead(cody, 'N-1')).status).toBe(400);
    expect((await markRead(cody, [1, 2])).status).toBe(400);
  });
});
