const test = require('node:test');
const assert = require('node:assert/strict');
const { getDistanceKm } = require('../services/locationGeocoding');

test('calculates zero distance for the same coordinates', () => {
  const point = { latitude: 14.5547, longitude: 121.0244 };
  assert.equal(getDistanceKm(point, point), 0);
});

test('calculates approximate distance between Manila and Quezon City', () => {
  const manila = { latitude: 14.5995, longitude: 120.9842 };
  const quezonCity = { latitude: 14.676, longitude: 121.0437 };
  const distance = getDistanceKm(manila, quezonCity);
  assert.ok(distance > 10 && distance < 12, `Expected roughly 11 km, got ${distance}`);
});

test('distance is symmetric', () => {
  const makati = { latitude: 14.5547, longitude: 121.0244 };
  const taguig = { latitude: 14.5176, longitude: 121.0509 };
  assert.equal(getDistanceKm(makati, taguig), getDistanceKm(taguig, makati));
});
