import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { openDb } from './db/index.js';
import { DEMO_PASSWORD, seed } from './db/seed.js';
import { sniffKind } from './uploads/fileType.js';

const db = openDb(':memory:');
const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apex-uploads-'));
const server = createApp(db, { uploadsDir }).listen(0);
const base = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);
const heic = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from('ftypheic'),
  Buffer.alloc(16),
]);
const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(64)]);

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

function upload(
  cookie: string,
  fields: Record<string, string>,
  file?: { bytes: Buffer; name: string },
  origin = config.appOrigin,
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  if (file) form.append('file', new Blob([new Uint8Array(file.bytes)]), file.name);
  return fetch(`${base()}/documents`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: cookie },
    body: form,
  });
}

const center = async (cookie: string) =>
  (await (await fetch(`${base()}/documents`, { headers: { Cookie: cookie } })).json()) as {
    required: { type: string; status: string; document?: { id: string; originalName: string } }[];
    proofOfDelivery: { load: { id: string }; status: string; document?: { id: string } }[];
  };

const storedFiles = () => fs.readdirSync(uploadsDir);

beforeEach(async () => {
  seed(db, Date.now(), uploadsDir);
  cody = await signIn('D-1042');
  anthony = await signIn('D-2217');
});
afterAll(() => {
  server.close();
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

describe('the document center', () => {
  it('requires a session', async () => {
    expect((await fetch(`${base()}/documents`)).status).toBe(401);
  });

  it('lists the required documents from the onboarding template, per driver', async () => {
    const m = await center(cody);
    expect(m.required.map((d) => [d.type, d.status])).toEqual([
      ['cdl', 'approved'],
      ['medical_card', 'review'],
    ]);
    const d = await center(anthony);
    expect(d.required.map((x) => x.status)).toEqual(['missing', 'missing']);
  });

  it('asks for proof of delivery on a delivered load only, and shows Cody is missing one', async () => {
    const m = await center(cody);
    expect(m.proofOfDelivery.map((p) => [p.load.id, p.status])).toEqual([['L-48190', 'missing']]);
    expect((await center(anthony)).proofOfDelivery).toEqual([]);
  });
});

describe('uploading', () => {
  it('accepts a PDF, JPG, PNG, and HEIC, and stores each under a random name', async () => {
    const cases = [
      { bytes: pdf, name: 'license.pdf' },
      { bytes: jpeg, name: 'license.JPG' },
      { bytes: png, name: 'license.png' },
      { bytes: heic, name: 'license.heic' },
    ];
    for (const file of cases) {
      const res = await upload(anthony, { type: 'cdl' }, file);
      expect(res.status).toBe(201);
    }
    const stored = storedFiles().filter((name) => !name.startsWith('seed-'));
    // Each upload replaced the one before it, so one file is left, with a random name.
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatch(/^[0-9a-f]{32}\.heic$/);
    expect(stored[0]).not.toContain('license');
  });

  it('puts a new upload under review and finishes the matching onboarding task', async () => {
    const res = await upload(anthony, { type: 'cdl' }, { bytes: pdf, name: 'my cdl.pdf' });
    const body = (await res.json()) as Awaited<ReturnType<typeof center>>;
    expect(body.required.find((d) => d.type === 'cdl')).toMatchObject({
      status: 'review',
      document: { originalName: 'my cdl.pdf' },
    });
    const onboarding = await (
      await fetch(`${base()}/onboarding`, { headers: { Cookie: anthony } })
    ).json();
    const task = onboarding.phases
      .flatMap((p: { tasks: { id: string; status: string }[] }) => p.tasks)
      .find((t: { id: string }) => t.id === 'cdl-upload');
    expect(task.status).toBe('done');
  });

  it('replaces the earlier file, and removes it from disk', async () => {
    await upload(anthony, { type: 'cdl' }, { bytes: pdf, name: 'first.pdf' });
    const first = storedFiles().filter((n) => !n.startsWith('seed-'));
    await upload(anthony, { type: 'cdl' }, { bytes: png, name: 'second.png' });
    const second = storedFiles().filter((n) => !n.startsWith('seed-'));
    expect(second).toHaveLength(1);
    expect(second[0]).not.toBe(first[0]);
    const rows = db
      .prepare("SELECT COUNT(*) AS n FROM documents WHERE driver_id = 'D-2217' AND type = 'cdl'")
      .get();
    expect(rows).toEqual({ n: 1 });
  });

  it('rejects a 20 MB file with a plain message, and stores nothing', async () => {
    const big = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(20 * 1024 * 1024)]);
    const before = storedFiles();
    const res = await upload(anthony, { type: 'cdl' }, { bytes: big, name: 'huge.pdf' });
    expect(res.status).toBe(413);
    expect((await res.json()).error.message).toBe('That file is too large. The limit is 10 MB.');
    expect(storedFiles()).toEqual(before);
  });

  it('rejects an .exe, and a program renamed to .pdf, with a plain message', async () => {
    const before = storedFiles();
    for (const name of ['setup.exe', 'invoice.pdf']) {
      const res = await upload(anthony, { type: 'cdl' }, { bytes: exe, name });
      expect(res.status).toBe(415);
      expect((await res.json()).error.message).toBe(
        'That file type is not allowed. Upload a PDF, JPG, PNG, or HEIC file.',
      );
    }
    expect(storedFiles()).toEqual(before);
    expect((await center(anthony)).required[0]?.status).toBe('missing');
  });

  it('rejects a real PDF that is named like a program', async () => {
    const res = await upload(anthony, { type: 'cdl' }, { bytes: pdf, name: 'license.exe' });
    expect(res.status).toBe(415);
  });

  it('rejects a missing file and a document type that is not on the list', async () => {
    expect((await upload(anthony, { type: 'cdl' })).status).toBe(400);
    const res = await upload(anthony, { type: 'passport' }, { bytes: pdf, name: 'a.pdf' });
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toBe('That kind of document is not on your list.');
  });

  it('only takes an upload that comes from the app’s own origin', async () => {
    const res = await upload(
      anthony,
      { type: 'cdl' },
      { bytes: pdf, name: 'a.pdf' },
      'https://evil.example',
    );
    expect(res.status).toBe(403);
  });
});

describe('proof of delivery', () => {
  it('attaches to a delivered load and clears the missing flag', async () => {
    const res = await upload(
      cody,
      { type: 'proof_of_delivery', loadId: 'L-48190' },
      { bytes: jpeg, name: 'pod.jpg' },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as Awaited<ReturnType<typeof center>>;
    expect(body.proofOfDelivery[0]).toMatchObject({ status: 'review', load: { id: 'L-48190' } });
  });

  it('is refused for a load that is not delivered', async () => {
    const res = await upload(
      cody,
      { type: 'proof_of_delivery', loadId: 'L-48213' },
      { bytes: jpeg, name: 'pod.jpg' },
    );
    expect(res.status).toBe(400);
  });

  it('is refused, as not found, for another driver’s load', async () => {
    const res = await upload(
      anthony,
      { type: 'proof_of_delivery', loadId: 'L-48190' },
      { bytes: jpeg, name: 'pod.jpg' },
    );
    expect(res.status).toBe(404);
    expect(
      (await upload(anthony, { type: 'proof_of_delivery' }, { bytes: jpeg, name: 'pod.jpg' }))
        .status,
    ).toBe(404);
  });
});

describe('downloading', () => {
  const get = (cookie: string | undefined, id: string) =>
    fetch(`${base()}/documents/${id}/file`, { headers: cookie ? { Cookie: cookie } : {} });

  it('requires a session', async () => {
    const id = (await center(cody)).required[0]!.document!.id;
    expect((await get(undefined, id)).status).toBe(401);
  });

  it('gives a driver their own file, as a download', async () => {
    const doc = (await center(cody)).required.find((d) => d.type === 'medical_card')!.document!;
    const res = await get(cody, doc.id);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toContain('attachment');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(sniffKind(Buffer.from(await res.arrayBuffer()))).toBe('pdf');
  });

  it('does not give one driver another driver’s file, and cannot tell if it exists', async () => {
    const theirs = (await center(cody)).required.find((d) => d.type === 'medical_card')!.document!;
    const refused = await get(anthony, theirs.id);
    const missing = await get(anthony, 'DOC-nothing');
    expect(refused.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(await refused.json()).toEqual(await missing.json());
  });

  it('does not expose the uploads folder directly', async () => {
    const stored = storedFiles()[0]!;
    const res = await fetch(`${base()}/uploads/${stored}`, { headers: { Cookie: cody } });
    expect(res.status).toBe(404);
  });
});
