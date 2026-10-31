const when = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

// Times are stored in UTC and shown in the device's own time zone.
export const formatWhen = (iso: string) => when.format(new Date(iso));

export const formatWeight = (lb: number) => `${lb.toLocaleString()} lb`;

// Just the day, for dates that have no meaningful time of day.
const day = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
export const formatDay = (iso: string) => day.format(new Date(iso));
