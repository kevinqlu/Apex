const when = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const formatWhen = (iso: string) => when.format(new Date(iso));

export const formatWeight = (lb: number) => `${lb.toLocaleString()} lb`;

const day = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
export const formatDay = (iso: string) => day.format(new Date(iso));
