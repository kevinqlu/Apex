import type { LoadStatus } from '../api/loads';
import { Icon, type IconName } from './Icon';

const chips: Record<LoadStatus, { label: string; icon: IconName }> = {
  pending: { label: 'Pending', icon: 'clock' },
  in_transit: { label: 'In transit', icon: 'loads' },
  delayed: { label: 'Delayed', icon: 'warning' },
  delivered: { label: 'Delivered', icon: 'checkCircle' },
};

// Every status has an icon and a word, so it never depends on color alone.
export function StatusChip({ status }: { status: LoadStatus }) {
  const { label, icon } = chips[status];
  return (
    <span className={`chip chip-${status}`}>
      <Icon name={icon} />
      {label}
    </span>
  );
}
