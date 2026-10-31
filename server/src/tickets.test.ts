import type { AddressInfo } from 'node:net';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { openDb } from './db/index.js';
import { DEMO_PASSWORD, seed } from './db/seed.js';

const db = openDb(':memory:');
const server = createApp(db).listen(0);
const base = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

let marcus = '';
let dana = '';

interface Ticket {
  id: string;
  category: string;
  loadId: string | null;
  message: string;
  status: string;
}

async function signIn(driverId: string): Promise<string> {
  const res = await fetch(`${base()}/auth/login`, {
    method: 'POST',
    headers: { Origin: config.appOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId, password: DEMO_PASSWORD }),
  });
  return (res.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
}

const tickets = async (cookie: string) =>
  (
    (await (await fetch(`${base()}/tickets`, { headers: { Cookie: cookie } })).json()) as {
      tickets: Ticket[];
    }
  ).tickets;

const send = (cookie: string, body: unknown) =>
  fetch(`${base()}/tickets`, {
    method: 'POST',
    headers: { Origin: config.appOrigin, 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });

const valid = { category: 'pay', message: 'My last settlement is missing a detention payment.' };

beforeEach(async () => {
  seed(db);
  marcus = await signIn('D-1042');
  dana = await signIn('D-2217');
});
afterAll(() => {
  server.close();
});

describe('tickets are scoped to the signed-in driver', () => {
  it('requires a session', async () => {
    expect((await fetch(`${base()}/tickets`)).status).toBe(401);
    expect((await fetch(`${base()}/support`)).status).toBe(401);
  });

  it('shows each driver only their own tickets', async () => {
    expect((await tickets(marcus)).map((t) => t.id)).toEqual(['T-4F2A91']);
    expect(await tickets(dana)).toEqual([]);
  });

  it('keeps a new ticket out of the other driver’s list', async () => {
    const res = await send(dana, valid);
    expect(res.status).toBe(201);
    const danaTickets = await tickets(dana);
    expect(danaTickets).toHaveLength(1);
    expect(danaTickets[0]).toMatchObject({ category: 'pay', status: 'open', loadId: null });
    expect(await tickets(marcus)).toHaveLength(1);
    expect((await tickets(marcus)).map((t) => t.id)).not.toContain(danaTickets[0]!.id);
  });

  it('lets a ticket name the driver’s own load, and refuses someone else’s as not found', async () => {
    expect((await send(marcus, { ...valid, category: 'load', loadId: 'L-48213' })).status).toBe(
      201,
    );
    const refused = await send(dana, { ...valid, category: 'load', loadId: 'L-48213' });
    expect(refused.status).toBe(404);
    expect(await tickets(dana)).toEqual([]);
  });
});

describe('ticket validation', () => {
  it('asks for a category from the list', async () => {
    const res = await send(dana, { ...valid, category: 'gossip' });
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toBe('Choose what your message is about.');
  });

  it('asks for a real message, and ignores spaces around it', async () => {
    const short = await send(dana, { ...valid, message: '   too short  ' });
    expect(short.status).toBe(400);
    expect((await short.json()).error.message).toBe(
      'Tell us what is going on, in at least 10 characters.',
    );
    expect((await send(dana, { ...valid, message: undefined })).status).toBe(400);
    await send(dana, { ...valid, message: '   spaces around this one   ' });
    expect((await tickets(dana))[0]?.message).toBe('spaces around this one');
  });

  it('stops a message that is too long', async () => {
    const res = await send(dana, { ...valid, message: 'x'.repeat(1001) });
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toBe('Keep your message under 1,000 characters.');
    expect(await tickets(dana)).toEqual([]);
  });
});

describe('support contacts', () => {
  it('give each driver their own dispatcher and terminal', async () => {
    const get = async (cookie: string) =>
      (await (await fetch(`${base()}/support`, { headers: { Cookie: cookie } })).json()) as {
        roadside: { phone: string };
        terminal: { name: string };
        dispatcher: { name: string; phone: string };
      };
    const m = await get(marcus);
    const d = await get(dana);
    expect(m.dispatcher).toEqual({ name: 'Priya Nair', phone: '555-0142' });
    expect(d.dispatcher).toEqual({ name: 'Tom Okafor', phone: '555-0177' });
    expect(m.terminal.name).toBe('Dallas, TX');
    expect(d.terminal.name).toBe('Memphis, TN');
    expect(m.roadside.phone).toBe(d.roadside.phone);
  });
});
