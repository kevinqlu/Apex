import type { Notification } from '../api/notifications';
import { Icon } from './Icon';

// Urgent and announcement each carry an icon and a word, never color alone.
export function KindChip({ kind }: { kind: Notification['kind'] }) {
  return kind === 'urgent' ? (
    <span className="chip chip-urgent">
      <Icon name="error" />
      Urgent
    </span>
  ) : (
    <span className="chip">
      <Icon name="megaphone" />
      Announcement
    </span>
  );
}
