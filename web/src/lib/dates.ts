const MS_PER_DAY = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function dueLabel(iso: string, now = new Date()): { text: string; overdue: boolean } {
  const days = Math.round((startOfDay(new Date(iso)) - startOfDay(now)) / MS_PER_DAY);
  if (days < 0)
    return { text: `Overdue by ${-days} ${days === -1 ? 'day' : 'days'}`, overdue: true };
  if (days === 0) return { text: 'Due today', overdue: false };
  if (days === 1) return { text: 'Due tomorrow', overdue: false };
  return { text: `Due in ${days} days`, overdue: false };
}
