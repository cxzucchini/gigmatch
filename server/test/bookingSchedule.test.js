const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidEventDate,
  getStartMinute,
  getEventInstant,
  isOverlapping,
} = require('../services/bookingSchedule');

test('accepts valid calendar dates and rejects malformed dates', () => {
  assert.equal(isValidEventDate('2026-11-07'), true);
  assert.equal(isValidEventDate('2026-02-29'), false);
  assert.equal(isValidEventDate('2026-13-01'), false);
  assert.equal(isValidEventDate('07/11/2026'), false);
});

test('parses valid 24-hour times into minutes after midnight', () => {
  assert.equal(getStartMinute('00:00'), 0);
  assert.equal(getStartMinute('18:30'), 1110);
  assert.equal(getStartMinute('23:59'), 1439);
  assert.equal(getStartMinute('24:00'), null);
  assert.equal(getStartMinute('6:30 PM'), null);
});

test('interprets event date and time in Philippine local time', () => {
  assert.equal(getEventInstant('2026-11-07', '18:30').toISOString(), '2026-11-07T10:30:00.000Z');
  assert.equal(getEventInstant('2026-11-07', '18:30', 'UTC'), null);
});

test('detects overlapping intervals while allowing back-to-back bookings', () => {
  assert.equal(isOverlapping(600, 2, 690, 1), true);
  assert.equal(isOverlapping(600, 2, 720, 1), false);
  assert.equal(isOverlapping(600, 1, 540, 1), false);
});
