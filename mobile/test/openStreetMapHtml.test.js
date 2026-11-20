const test = require('node:test');
const assert = require('node:assert/strict');
const { createOpenStreetMapHtml } = require('../src/utils/openStreetMapHtml');

test('creates an attributed map with an event pin and approximate musician pins', () => {
  const html = createOpenStreetMapHtml(
    { latitude: 14.6, longitude: 121.0 },
    [
      {
        name: 'Acoustic Duo',
        mapCoordinates: { latitude: 14.55, longitude: 121.02 },
        distanceKm: 6.4,
      },
      {
        name: 'Unmapped Musician',
        mapCoordinates: null,
      },
    ],
  );

  assert.match(html, /OpenStreetMap contributors/);
  assert.match(html, /Your event/);
  assert.match(html, /Acoustic Duo/);
  assert.doesNotMatch(html, /Unmapped Musician/);
  assert.match(html, /"distanceKm":6\.4/);
});

test('escapes musician names before embedding them in the map document', () => {
  const html = createOpenStreetMapHtml(null, [
    {
      name: '</script><img src=x onerror=alert(1)>',
      mapCoordinates: { latitude: 14.55, longitude: 121.02 },
    },
  ]);

  assert.match(html, /\\u003c\/script\\u003e/);
  assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
});

test('shows musician details on hover and links to the profile from the map', () => {
  const html = createOpenStreetMapHtml(null, [{
    id: '6aef0f38ce1c303f1473f49b',
    name: 'Iloilo Musician',
    genre: 'Acoustic / OPM',
    price: 5000,
    location: 'Jaro, Iloilo',
    mapCoordinates: { latitude: 10.72, longitude: 122.56 },
  }]);

  assert.match(html, /bindTooltip\(popup/);
  assert.match(html, /Iloilo Musician/);
  assert.match(html, /Acoustic \/ OPM/);
  assert.match(html, /₱/);
  assert.match(html, /\/artist\/6aef0f38ce1c303f1473f49b/);
  assert.match(html, /target="_top"/);
});

test('omits invalid map coordinates', () => {
  const html = createOpenStreetMapHtml(
    { latitude: 100, longitude: 121 },
    [{ name: 'Invalid Location', mapCoordinates: { latitude: 14, longitude: 181 } }],
  );

  assert.doesNotMatch(html, /Invalid Location/);
  assert.doesNotMatch(html, /"name":"Your event"/);
});
