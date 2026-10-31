import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { config } from './config/env.js';
import {
  loadTemplate,
  TemplateError,
  validateTemplate,
  type OnboardingTemplate,
} from './config/onboarding.js';
import { openDb } from './db/index.js';
import { DEMO_PASSWORD, seed } from './db/seed.js';

const db = openDb(':memory:');
const pinnedStarter = loadTemplate(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/starter.template.json'),
);

function start(options: { template?: OnboardingTemplate; demoMode?: boolean } = {}) {
  const server = createApp(db, options).listen(0);
  return { server, base: () => `http://127.0.0.1:${(server.address() as AddressInfo).port}/api` };
}

const normal = start({ template: pinnedStarter });
const demo = start({ template: pinnedStarter, demoMode: true });
const withExtra = start({
  template: validateTemplate({
    phases: [{ id: 'start', title: 'Start' }],
    tasks: [
      ...pinnedStarter.tasks
        .filter((t) => t.id === 'safety-video')
        .map((t) => ({ ...t, phase: 'start' })),
      {
        id: 'tire-check',
        phase: 'start',
        title: 'Learn the tire check',
        description: 'A new step added to the template only.',
        type: 'video',
        dueDay: 4,
      },
    ],
  }),
});

type App = ReturnType<typeof start>;

async function signIn(app: App, driverId: string): Promise<string> {
  const res = await fetch(`${app.base()}/auth/login`, {
    method: 'POST',
    headers: { Origin: config.appOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId, password: DEMO_PASSWORD }),
  });
  return (res.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
}

const get = (app: App, cookie: string) =>
  fetch(`${app.base()}/onboarding`, { headers: { Cookie: cookie } });

const post = (app: App, cookie: string, route: string, body: unknown = {}) =>
  fetch(`${app.base()}/onboarding/${route}`, {
    method: 'POST',
    headers: { Origin: config.appOrigin, 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });

interface Task {
  id: string;
  status: string;
  dueAt: string;
  note?: string;
}
interface View {
  phases: { id: string; tasks: Task[] }[];
  progress: { done: number; total: number };
  demoActions: boolean;
}
const tasksOf = (view: View) =>
  Object.fromEntries(view.phases.flatMap((p) => p.tasks).map((t) => [t.id, t]));

let cody = '';
let anthony = '';
beforeEach(async () => {
  seed(db);
  cody = await signIn(normal, 'D-1042');
  anthony = await signIn(normal, 'D-2217');
});
afterAll(() => {
  for (const app of [normal, demo, withExtra]) app.server.close();
});

describe('template validation', () => {
  const task = (over: Record<string, unknown> = {}) => ({
    id: 't1',
    phase: 'p1',
    title: 'A task',
    description: 'Do it.',
    type: 'video',
    dueDay: 1,
    ...over,
  });
  const template = (tasks: unknown[], phases: unknown[] = [{ id: 'p1', title: 'Phase' }]) => ({
    phases,
    tasks,
  });
  const message = (raw: unknown) => {
    try {
      validateTemplate(raw);
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateError);
      return (err as Error).message;
    }
    throw new Error('expected the template to be rejected');
  };

  it('accepts the starter template: 7 tasks in 3 phases', () => {
    expect(pinnedStarter.phases).toHaveLength(3);
    expect(pinnedStarter.tasks).toHaveLength(7);
  });

  it('accepts the real template file, whatever tasks it has now', () => {
    expect(() => loadTemplate()).not.toThrow();
  });

  it('names the task and the field when something is wrong', () => {
    expect(message(template([task({ type: 'videos' })]))).toBe(
      'Onboarding template, task "t1": "type" is "videos", but it must be one of: video, upload, esign, company.',
    );
    expect(message(template([task({ phase: 'later' })]))).toContain(
      '"phase" is "later", which is not one of: p1',
    );
    expect(message(template([task({ dueDay: -2 })]))).toContain(
      '"dueDay" is required and must be a whole number',
    );
    expect(message(template([task(), task()]))).toContain('the task id "t1" is used twice');
  });

  it('requires the field each type depends on', () => {
    expect(message(template([task({ type: 'upload' })]))).toContain('"docType" is required');
    expect(message(template([task({ type: 'company' })]))).toContain('"ownerLabel" is required');
  });

  it('rejects a field that belongs to another type', () => {
    expect(message(template([task({ docType: 'cdl' })]))).toContain(
      '"docType" is only for "upload" tasks, but this task is "video"',
    );
  });

  it('rejects a file that is the wrong shape', () => {
    expect(message([])).toContain('must be a JSON object');
    expect(message({ phases: [], tasks: [] })).toContain(
      '"phases" must be a list with at least one phase',
    );
    expect(message({ phases: [{ id: 'p1', title: 'P' }], tasks: [] })).toContain(
      '"tasks" must be a list with at least one task',
    );
  });

  it('says plainly when the file is not valid JSON', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'apex-')), 'bad.json');
    fs.writeFileSync(file, '{ "phases": [ ');
    expect(() => loadTemplate(file)).toThrow(/the file is not valid JSON/);
    expect(() => loadTemplate(path.join(path.dirname(file), 'missing.json'))).toThrow(
      /could not read the file/,
    );
  });

  it('matches the task IDs the seed data uses', () => {
    const ids = new Set(loadTemplate().tasks.map((t) => t.id));
    const seeded = db.prepare('SELECT DISTINCT task_id FROM onboarding_progress').all() as {
      task_id: string;
    }[];
    expect(seeded.length).toBeGreaterThan(0);
    for (const { task_id } of seeded) expect(ids.has(task_id)).toBe(true);
  });
});

describe('what each driver sees', () => {
  it('requires a session', async () => {
    expect((await fetch(`${normal.base()}/onboarding`)).status).toBe(401);
  });

  it('keeps the order of the template file', async () => {
    const view = (await (await get(normal, cody)).json()) as View;
    expect(view.phases.map((p) => p.id)).toEqual(['start', 'week', 'month']);
    expect(view.phases.flatMap((p) => p.tasks.map((t) => t.id))).toEqual([
      'record-check',
      'cdl-upload',
      'medical-card',
      'safety-video',
      'fleet-policy',
      'equipment-walkthrough',
      'thirty-day-checkin',
    ]);
  });

  it('shows Cody done except the fleet policy, which is due today', async () => {
    const view = (await (await get(normal, cody)).json()) as View;
    const tasks = tasksOf(view);
    expect(tasks['fleet-policy']?.status).toBe('todo');
    expect(tasks['safety-video']?.status).toBe('done');
    expect(tasks['cdl-upload']?.status).toBe('done');
    expect(tasks['medical-card']).toMatchObject({ status: 'done', note: 'Under review' });
    expect(Math.abs(Date.parse(tasks['fleet-policy']!.dueAt) - Date.now())).toBeLessThan(60_000);
    expect(tasks['thirty-day-checkin']?.status).toBe('waiting_on_company');
    expect(view.progress).toEqual({ done: 5, total: 7 });
  });

  it('shows Anthony almost nothing done, and a company step as waiting, not theirs to do', async () => {
    const view = (await (await get(normal, anthony)).json()) as View;
    const tasks = tasksOf(view);
    expect(view.progress).toEqual({ done: 1, total: 7 });
    expect(tasks['equipment-walkthrough']?.status).toBe('waiting_on_company');
    expect(tasks['cdl-upload']?.status).toBe('todo');
  });
});

describe('completing tasks', () => {
  it('lets a driver confirm a video', async () => {
    const res = await post(normal, anthony, 'tasks/safety-video/complete');
    expect(res.status).toBe(200);
    expect(tasksOf((await res.json()) as View)['safety-video']?.status).toBe('done');
  });

  it('never lets a driver complete a company task, even in demo mode', async () => {
    for (const app of [normal, demo]) {
      const cookie = await signIn(app, 'D-2217');
      const res = await post(app, cookie, 'tasks/equipment-walkthrough/complete');
      expect(res.status).toBe(403);
      expect((await res.json()).error.message).toBe(
        'Only Terminal manager can finish this step. You do not need to do anything.',
      );
    }
    const rows = db
      .prepare(
        "SELECT COUNT(*) AS n FROM onboarding_progress WHERE task_id = 'equipment-walkthrough' AND driver_id = 'D-2217'",
      )
      .get();
    expect(rows).toEqual({ n: 0 });
  });

  it('does not let a driver mark an upload task done by hand', async () => {
    const res = await post(normal, anthony, 'tasks/cdl-upload/complete');
    expect(res.status).toBe(400);
    expect(tasksOf((await (await get(normal, anthony)).json()) as View)['cdl-upload']?.status).toBe(
      'todo',
    );
  });

  it('signs only when the typed name matches the driver', async () => {
    const wrong = await post(normal, cody, 'tasks/fleet-policy/complete', {
      name: 'Anthony Jacob',
    });
    expect(wrong.status).toBe(400);
    expect((await wrong.json()).error.message).toMatch(/does not match your name on file/);
    expect((await post(normal, cody, 'tasks/fleet-policy/complete', {})).status).toBe(400);

    const right = await post(normal, cody, 'tasks/fleet-policy/complete', {
      name: '  cody   PHENG ',
    });
    expect(right.status).toBe(200);
    expect(tasksOf((await right.json()) as View)['fleet-policy']?.status).toBe('done');
  });

  it('keeps one driver’s progress out of another’s', async () => {
    await post(normal, cody, 'tasks/fleet-policy/complete', { name: 'Cody Pheng' });
    const anthony1 = tasksOf((await (await get(normal, anthony)).json()) as View);
    expect(anthony1['fleet-policy']?.status).toBe('todo');
  });

  it('answers an unknown task with 404', async () => {
    expect((await post(normal, cody, 'tasks/nope/complete')).status).toBe(404);
  });
});

describe('the demo-only company button', () => {
  it('does not exist unless demo mode is on', async () => {
    expect((await post(normal, anthony, 'tasks/equipment-walkthrough/demo-complete')).status).toBe(
      404,
    );
    expect(((await (await get(normal, anthony)).json()) as View).demoActions).toBe(false);
  });

  it('finishes a company task in demo mode, and only a company task', async () => {
    const cookie = await signIn(demo, 'D-2217');
    const ok = await post(demo, cookie, 'tasks/equipment-walkthrough/demo-complete');
    expect(ok.status).toBe(200);
    const view = (await ok.json()) as View;
    expect(view.demoActions).toBe(true);
    expect(tasksOf(view)['equipment-walkthrough']?.status).toBe('done');
    expect((await post(demo, cookie, 'tasks/safety-video/demo-complete')).status).toBe(400);
  });
});

describe('onboarding is data', () => {
  it('shows a task that exists only in the template, and completing it works', async () => {
    const cookie = await signIn(withExtra, 'D-2217');
    const before = (await (await get(withExtra, cookie)).json()) as View;
    expect(before.phases.flatMap((p) => p.tasks).map((t) => t.id)).toEqual([
      'safety-video',
      'tire-check',
    ]);
    const done = await post(withExtra, cookie, 'tasks/tire-check/complete');
    expect(tasksOf((await done.json()) as View)['tire-check']?.status).toBe('done');
  });
});
