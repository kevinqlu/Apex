import type { Db } from './index.js';

export interface Notification {
  id: string;
  kind: 'urgent' | 'announcement';
  category: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

interface NotificationRow {
  id: string;
  kind: Notification['kind'];
  category: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

// Every read and write goes through this, so a driver only touches notifications sent to them.
const SENT_TO_DRIVER = `(
  NOT EXISTS (SELECT 1 FROM notification_targets t WHERE t.notification_id = n.id)
  OR EXISTS (SELECT 1 FROM notification_targets t WHERE t.notification_id = n.id AND t.driver_id = @driver)
)`;

export function listNotifications(db: Db, driverId: string): Notification[] {
  const rows = db
    .prepare(
      `SELECT n.*, r.read_at FROM notifications n
       LEFT JOIN notification_reads r ON r.notification_id = n.id AND r.driver_id = @driver
       WHERE ${SENT_TO_DRIVER}
       ORDER BY n.created_at DESC`,
    )
    .all({ driver: driverId }) as NotificationRow[];
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    category: row.category,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    read: row.read_at !== null,
  }));
}

// IDs not sent to this driver are skipped silently, so existence is not revealed.
export function markRead(db: Db, driverId: string, ids: string[], now = Date.now()): void {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO notification_reads (driver_id, notification_id, read_at)
     SELECT @driver, n.id, @readAt FROM notifications n
     WHERE n.id = @id AND ${SENT_TO_DRIVER}`,
  );
  const readAt = new Date(now).toISOString();
  db.transaction(() => {
    for (const id of ids) insert.run({ driver: driverId, readAt, id });
  })();
}
