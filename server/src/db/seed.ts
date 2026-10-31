import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import type { Db } from './index.js';

export const DEMO_PASSWORD = 'apex-demo-1';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

interface SeedLoad {
  id: string;
  driverId: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'delayed';
  from: [city: string, state: string, facility: string];
  to: [city: string, state: string, facility: string];
  cargo: string;
  weightLb: number;
  equipment: string;
  pickup: number;
  delivery: number;
  delayNote?: string;
  reference?: string;
}

const loads: SeedLoad[] = [
  {
    id: 'L-48213',
    driverId: 'D-1042',
    status: 'in_transit',
    from: ['Dallas', 'TX', 'Apex Dallas Yard'],
    to: ['Atlanta', 'GA', 'Peachtree Distribution Center'],
    cargo: 'Packaged beverages, 22 pallets',
    weightLb: 38400,
    equipment: '53 ft dry van',
    pickup: -8 * HOUR,
    delivery: 12 * HOUR,
    reference: 'PO-77120',
  },
  {
    id: 'L-48230',
    driverId: 'D-1042',
    status: 'delayed',
    from: ['Houston', 'TX', 'Gulf Cold Storage'],
    to: ['Nashville', 'TN', 'Music City Grocers'],
    cargo: 'Refrigerated produce, 18 pallets',
    weightLb: 34100,
    equipment: '53 ft reefer',
    pickup: 4 * HOUR,
    delivery: DAY + 6 * HOUR,
    delayNote: 'Shipper is loading late. Your pickup window opens in about 4 hours.',
    reference: 'PO-77188',
  },
  {
    id: 'L-48244',
    driverId: 'D-1042',
    status: 'pending',
    from: ['Atlanta', 'GA', 'Peachtree Distribution Center'],
    to: ['Charlotte', 'NC', 'Queen City Hardware'],
    cargo: 'Hardware and tools, 16 pallets',
    weightLb: 29800,
    equipment: '53 ft dry van',
    pickup: DAY + 10 * HOUR,
    delivery: 2 * DAY + 4 * HOUR,
  },
  {
    id: 'L-48190',
    driverId: 'D-1042',
    status: 'delivered',
    from: ['Oklahoma City', 'OK', 'Sooner Freight Dock'],
    to: ['Dallas', 'TX', 'Apex Dallas Yard'],
    cargo: 'Paper goods, 24 pallets',
    weightLb: 31200,
    equipment: '53 ft dry van',
    pickup: -3 * DAY,
    delivery: -2 * DAY,
    reference: 'PO-76990',
  },
  {
    id: 'L-52007',
    driverId: 'D-2217',
    status: 'pending',
    from: ['Memphis', 'TN', 'Mid-South Warehouse'],
    to: ['Louisville', 'KY', 'Bluegrass Retail Hub'],
    cargo: 'Household goods, 20 pallets',
    weightLb: 27500,
    equipment: '53 ft dry van',
    pickup: DAY,
    delivery: DAY + 9 * HOUR,
  },
];

const tablesToClear = [
  'tickets',
  'onboarding_progress',
  'documents',
  'notification_reads',
  'notification_targets',
  'notifications',
  'loads',
  'sessions',
  'drivers',
];

function samplePdf(): Buffer {
  const content = 'BT /F1 16 Tf 20 70 Td (Sample document. Demo data only.) Tj ET';
  return Buffer.from(
    [
      '%PDF-1.4',
      '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj',
      `4 0 obj<</Length ${content.length}>>stream`,
      content,
      'endstream endobj',
      '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
      'trailer<</Root 1 0 R>>',
      '%%EOF',
      '',
    ].join('\n'),
  );
}

// Matches only names we create, so a wrong UPLOADS_DIR cannot delete other files.
const OURS = /^(seed-[a-z-]+|[0-9a-f]{32})\.(pdf|jpg|png|heic)$/;
function resetUploads(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  for (const name of fs.readdirSync(dir)) {
    if (OURS.test(name)) fs.rmSync(path.join(dir, name), { force: true });
  }
}

export function seed(db: Db, now = Date.now(), uploadsDir?: string): void {
  const at = (offsetMs: number) => new Date(now + offsetMs).toISOString();
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  db.transaction(() => {
    for (const table of tablesToClear) db.exec(`DELETE FROM ${table}`);

    const insertDriver = db.prepare(
      `INSERT INTO drivers (id, name, password_hash, terminal, dispatcher_name, dispatcher_phone, hired_at, duty_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    insertDriver.run(
      'D-1042',
      'Cody Pheng',
      hash,
      'Dallas, TX',
      'Priya Nair',
      '555-0142',
      at(-5 * DAY),
      'on_duty',
    );
    insertDriver.run(
      'D-2217',
      'Anthony Jacob',
      hash,
      'Memphis, TN',
      'Tom Okafor',
      '555-0177',
      at(-1 * DAY),
      'off_duty',
    );

    const insertLoad = db.prepare(
      `INSERT INTO loads (id, driver_id, status, origin_city, origin_state, origin_facility,
         dest_city, dest_state, dest_facility, cargo_description, weight_lb, equipment,
         pickup_at, delivery_at, delay_note, reference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const l of loads) {
      insertLoad.run(
        l.id,
        l.driverId,
        l.status,
        l.from[0],
        l.from[1],
        l.from[2],
        l.to[0],
        l.to[1],
        l.to[2],
        l.cargo,
        l.weightLb,
        l.equipment,
        at(l.pickup),
        at(l.delivery),
        l.delayNote ?? null,
        l.reference ?? null,
      );
    }

    const insertNote = db.prepare(
      'INSERT INTO notifications (id, kind, category, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    );
    insertNote.run(
      'N-1',
      'urgent',
      'Weather',
      'Severe storms on I-20 east of Dallas',
      'Hail and high wind through tonight. Slow down and find safe parking if conditions worsen.',
      at(-2 * HOUR),
    );
    insertNote.run(
      'N-2',
      'urgent',
      'Route',
      'Lane closure on I-40 near Memphis',
      'Right two lanes closed until tomorrow morning. Expect delays on your Nashville route.',
      at(-90 * MINUTE),
    );
    insertNote.run(
      'N-3',
      'announcement',
      'Company',
      'New fuel card pickup hours',
      'Fuel cards are now available at every terminal from 6 a.m. to 8 p.m.',
      at(-DAY),
    );
    insertNote.run(
      'N-4',
      'announcement',
      'Company',
      'Holiday schedule posted',
      'Terminals close early the day before the holiday. Check with your dispatcher before you plan a run.',
      at(-3 * DAY),
    );
    db.prepare('INSERT INTO notification_targets (notification_id, driver_id) VALUES (?, ?)').run(
      'N-2',
      'D-1042',
    );

    db.prepare(
      'INSERT INTO notification_reads (driver_id, notification_id, read_at) VALUES (?, ?, ?)',
    ).run('D-1042', 'N-4', at(-2 * DAY));

    const insertDocument = db.prepare(
      `INSERT INTO documents (id, driver_id, type, load_id, original_name, stored_name, size, mime, status, uploaded_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, 'application/pdf', ?, ?)`,
    );
    const sample = samplePdf();
    insertDocument.run(
      'DOC-1',
      'D-1042',
      'medical_card',
      'medical-card.pdf',
      'seed-medical-card.pdf',
      sample.length,
      'review',
      at(-DAY),
    );
    insertDocument.run(
      'DOC-2',
      'D-1042',
      'cdl',
      'cdl.pdf',
      'seed-cdl.pdf',
      sample.length,
      'approved',
      at(-4 * DAY),
    );
    if (uploadsDir) {
      resetUploads(uploadsDir);
      for (const name of ['seed-medical-card.pdf', 'seed-cdl.pdf']) {
        fs.writeFileSync(path.join(uploadsDir, name), sample);
      }
    }

    db.prepare(
      `INSERT INTO tickets (id, driver_id, category, load_id, message, status, created_at)
       VALUES ('T-4F2A91', 'D-1042', 'equipment', NULL, ?, 'open', ?)`,
    ).run(
      'The latch on my trailer door sticks when it is cold. Please have it checked when I next stop at the terminal.',
      at(-DAY),
    );

    const insertProgress = db.prepare(
      'INSERT INTO onboarding_progress (driver_id, task_id, completed_at) VALUES (?, ?, ?)',
    );
    insertProgress.run('D-1042', 'safety-video', at(-4 * DAY));
    insertProgress.run('D-1042', 'record-check', at(-3 * DAY));
    insertProgress.run('D-1042', 'equipment-walkthrough', at(-1 * DAY));
    insertProgress.run('D-2217', 'record-check', at(-6 * HOUR));
  })();
}
