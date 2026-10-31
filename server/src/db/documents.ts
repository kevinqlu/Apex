import { randomBytes } from 'node:crypto';
import { labelFor, PROOF_OF_DELIVERY, requiredDocumentTypes } from '../config/documentTypes.js';
import type { OnboardingTemplate } from '../config/onboarding.js';
import type { Db } from './index.js';

export type DocumentStatus = 'review' | 'approved';

interface DocumentRow {
  id: string;
  type: string;
  load_id: string | null;
  original_name: string;
  stored_name: string;
  size: number;
  mime: string;
  status: DocumentStatus;
  uploaded_at: string;
}

export interface DocumentView {
  id: string;
  originalName: string;
  size: number;
  mime: string;
  status: DocumentStatus;
  uploadedAt: string;
}

export interface DocumentCenter {
  required: {
    type: string;
    label: string;
    status: 'missing' | DocumentStatus;
    document?: DocumentView;
  }[];
  proofOfDelivery: {
    load: { id: string; from: string; to: string; deliveredAt: string };
    status: 'missing' | DocumentStatus;
    document?: DocumentView;
  }[];
}

const toView = (row: DocumentRow): DocumentView => ({
  id: row.id,
  originalName: row.original_name,
  size: row.size,
  mime: row.mime,
  status: row.status,
  uploadedAt: row.uploaded_at,
});

export function buildDocumentCenter(
  db: Db,
  template: OnboardingTemplate,
  driverId: string,
): DocumentCenter {
  const rows = db
    .prepare('SELECT * FROM documents WHERE driver_id = ? ORDER BY uploaded_at')
    .all(driverId) as DocumentRow[];
  const byKey = new Map(rows.map((r) => [`${r.type}|${r.load_id ?? ''}`, r]));

  const required = requiredDocumentTypes(template).map((type) => {
    const row = byKey.get(`${type}|`);
    return {
      type,
      label: labelFor(type),
      status: row?.status ?? ('missing' as const),
      document: row && toView(row),
    };
  });

  const delivered = db
    .prepare(
      `SELECT id, origin_city, origin_state, dest_city, dest_state, delivery_at FROM loads
       WHERE driver_id = ? AND status = 'delivered' ORDER BY delivery_at DESC`,
    )
    .all(driverId) as {
    id: string;
    origin_city: string;
    origin_state: string;
    dest_city: string;
    dest_state: string;
    delivery_at: string;
  }[];
  const proofOfDelivery = delivered.map((load) => {
    const row = byKey.get(`${PROOF_OF_DELIVERY}|${load.id}`);
    return {
      load: {
        id: load.id,
        from: `${load.origin_city}, ${load.origin_state}`,
        to: `${load.dest_city}, ${load.dest_state}`,
        deliveredAt: load.delivery_at,
      },
      status: row?.status ?? ('missing' as const),
      document: row && toView(row),
    };
  });

  return { required, proofOfDelivery };
}

// Ownership is in the query: another driver's document is not found.
export function findOwnedDocument(db: Db, driverId: string, id: string): DocumentRow | undefined {
  return db.prepare('SELECT * FROM documents WHERE id = ? AND driver_id = ?').get(id, driverId) as
    DocumentRow | undefined;
}

interface NewDocument {
  type: string;
  loadId: string | null;
  originalName: string;
  storedName: string;
  size: number;
  mime: string;
}

export function saveDocument(
  db: Db,
  driverId: string,
  doc: NewDocument,
  now = Date.now(),
): string[] {
  return db.transaction(() => {
    const old = db
      .prepare(
        'SELECT id, stored_name FROM documents WHERE driver_id = ? AND type = ? AND load_id IS ?',
      )
      .all(driverId, doc.type, doc.loadId) as { id: string; stored_name: string }[];
    for (const row of old) db.prepare('DELETE FROM documents WHERE id = ?').run(row.id);
    db.prepare(
      `INSERT INTO documents (id, driver_id, type, load_id, original_name, stored_name, size, mime, status, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'review', ?)`,
    ).run(
      `DOC-${randomBytes(4).toString('hex')}`,
      driverId,
      doc.type,
      doc.loadId,
      doc.originalName,
      doc.storedName,
      doc.size,
      doc.mime,
      new Date(now).toISOString(),
    );
    return old.map((row) => row.stored_name);
  })();
}
