const formatDateInput = (value) => {
  const date = String(value || '').trim();
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const digits = (isoDate ? `${isoDate[2]}${isoDate[3]}${isoDate[1]}` : date.replace(/\D/g, '')).slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const toApiDate = (value) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || '').trim());
  if (!match) return null;
  const [, month, day, year] = match;
  const date = `${year}-${month}-${day}`;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    ? date
    : null;
};

const formatTimeInput = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const toApiTime = (value, period) => {
  const match = /^(0?[1-9]|1[0-2]):([0-5]\d)$/.exec(String(value || '').trim());
  if (!match || !['AM', 'PM'].includes(period)) return null;
  let hours = Number(match[1]) % 12;
  if (period === 'PM') hours += 12;
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
};

const formatTimeFromMinute = (minute) => {
  if (!Number.isInteger(minute) || minute < 0 || minute >= 1440) return '';
  const hour = Math.floor(minute / 60);
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
};

module.exports = {
  formatDateInput,
  toApiDate,
  formatTimeInput,
  toApiTime,
  formatTimeFromMinute,
};
