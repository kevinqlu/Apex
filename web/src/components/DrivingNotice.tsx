import { useAuth } from './AuthProvider';
import { Icon } from './Icon';

export function DrivingNotice() {
  const { state } = useAuth();
  if (state.status !== 'signed-in' || state.driver.dutyStatus !== 'driving') return null;
  return (
    <p className="message message-caution" role="note">
      <Icon name="warning" />
      <span>Park safely before filling this out.</span>
    </p>
  );
}
