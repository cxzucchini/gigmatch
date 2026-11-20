const isValidEventDate = (date) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

const getStartMinute = (time) => {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const getEventInstant = (date, time, timeZone = 'Asia/Manila') => {
  if (timeZone !== 'Asia/Manila' || !isValidEventDate(date) || getStartMinute(time) === null) {
    return null;
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes) - 8 * 60 * 60 * 1000);
};

const isOverlapping = (startA, durationA, startB, durationB) => (
  startA < startB + durationB * 60 && startB < startA + durationA * 60
);

module.exports = { isValidEventDate, getStartMinute, getEventInstant, isOverlapping };
