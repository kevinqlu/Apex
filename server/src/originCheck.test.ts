import type { AddressInfo } from 'node:net';
import express from 'express';
import { afterAll, describe, expect, it } from 'vitest';
import { originCheck } from './middleware/originCheck.js';

const app = express();
app.use(express.json());
app.use('/api', originCheck(['http://localhost:5173', 'http://192.168.1.20:5173']));
app.post('/api/ping', (_req, res) => res.json({ ok: true }));
const server = app.listen(0);
afterAll(() => {
  server.close();
});

const ping = (origin?: string) =>
  fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
    body: '{}',
  });

describe('origin check with more than one allowed address', () => {
  it('accepts each listed address, such as the computer and a phone on the network', async () => {
    expect((await ping('http://localhost:5173')).status).toBe(200);
    expect((await ping('http://192.168.1.20:5173')).status).toBe(200);
  });

  it('refuses any other address, and a request with no origin at all', async () => {
    expect((await ping('http://192.168.1.99:5173')).status).toBe(403);
    expect((await ping('https://evil.example')).status).toBe(403);
    expect((await ping()).status).toBe(403);
  });
});
