const test = require('node:test');
const assert = require('node:assert/strict');
const {
  formatDateInput,
  toApiDate,
  formatTimeInput,
  toApiTime,
  formatTimeFromMinute,
} = require('../src/utils/bookingDateTime');

test('auto-formats typed dates and preselected ISO dates for display', () => {
  assert.equal(formatDateInput('01052027'), '01/05/2027');
  assert.equal(formatDateInput('2027-01-05'), '01/05/2027');
  assert.equal(formatDateInput('0105'), '01/05');
});

test('converts only real MM/DD/YYYY dates to the API date format', () => {
  assert.equal(toApiDate('01/05/2027'), '2027-01-05');
  assert.equal(toApiDate('02/29/2027'), null);
  assert.equal(toApiDate('13/05/2027'), null);
});

test('auto-formats 12-hour time input and converts AM/PM to API time', () => {
  assert.equal(formatTimeInput('0730'), '07:30');
  assert.equal(toApiTime('07:30', 'AM'), '07:30');
  assert.equal(toApiTime('07:30', 'PM'), '19:30');
  assert.equal(toApiTime('12:15', 'AM'), '00:15');
  assert.equal(toApiTime('12:15', 'PM'), '12:15');
  assert.equal(toApiTime('13:00', 'PM'), null);
});

test('formats booking list times as 12-hour time', () => {
  assert.equal(formatTimeFromMinute(0), '12:00 AM');
  assert.equal(formatTimeFromMinute(750), '12:30 PM');
  assert.equal(formatTimeFromMinute(1410), '11:30 PM');
  assert.equal(formatTimeFromMinute(1440), '');
});
