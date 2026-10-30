import { useState } from 'react';
import type { Driver } from '../api/auth';
import { ApiError } from '../api/client';
import { setDutyStatus } from '../api/me';
import { useAuth } from './AuthProvider';
import { Icon, type IconName } from './Icon';

type Duty = Driver['dutyStatus'];

const options: { value: Duty; label: string; icon: IconName }[] = [
  { value: 'driving', label: 'Driving', icon: 'loads' },
  { value: 'on_duty', label: 'On duty', icon: 'briefcase' },
  { value: 'sleeper', label: 'Sleeper', icon: 'moon' },
  { value: 'off_duty', label: 'Off duty', icon: 'power' },
];

export function DutySelector({ current }: { current: Duty }) {
  const { updateDriver } = useAuth();
  const [error, setError] = useState<string | null>(null);

  async function choose(value: Duty) {
    if (value === current) return;
    setError(null);
    try {
      const { driver } = await setDutyStatus(value);
      updateDriver(driver);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change your status. Try again.');
    }
  }

  return (
    <fieldset className="duty">
      <legend>Your duty status</legend>
      <div className="duty-options">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className="duty-option"
            aria-pressed={o.value === current}
            onClick={() => void choose(o.value)}
          >
            <Icon name={o.icon} />
            {o.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="message message-error" role="alert">
          <Icon name="error" />
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  );
}
