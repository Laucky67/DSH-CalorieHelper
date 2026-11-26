export function localDate(date = new Date(), timeZone?: string): string {
  if (timeZone) {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const field = (name: string) => parts.find(({ type }) => type === name)?.value;
    return `${field('year')}-${field('month')}-${field('day')}`;
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  const next = date.toISOString();
  return /^\d{4}-/.test(next) ? next.slice(0, 10) : value;
}
