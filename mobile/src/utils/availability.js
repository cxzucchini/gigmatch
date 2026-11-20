const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

export function getUpcomingDates(count = 30) {
  const todayParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const parts = Object.fromEntries(todayParts.map(({ type, value }) => [type, value]));
  const start = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));

  return Array.from({ length: count }, (_, index) => {
    const dateValue = new Date(start + index * 86400000).toISOString().slice(0, 10);
    const date = new Date(`${dateValue}T12:00:00+08:00`);
    return { dateValue, label: formatter.format(date) };
  });
}
