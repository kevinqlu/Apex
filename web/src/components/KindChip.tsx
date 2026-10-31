import type { Notification } from '../api/notifications';
import { Icon } from './Icon';

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
