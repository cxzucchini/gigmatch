const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const MIN_REQUEST_INTERVAL_MS = 1100;
const CACHE_LIMIT = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const EARTH_RADIUS_KM = 6371.0088;

const cache = new Map();
let requestQueue = Promise.resolve();
let lastRequestAt = 0;

const cacheResult = (key, coordinates) => {
  if (cache.size >= CACHE_LIMIT) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, { coordinates, expiresAt: Date.now() + CACHE_TTL_MS });
};

const geocodeLocation = (location) => {
  const key = location.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.coordinates);
  if (cached) cache.delete(key);

  const request = requestQueue.then(async () => {
    const queuedCache = cache.get(key);
    if (queuedCache && queuedCache.expiresAt > Date.now()) return queuedCache.coordinates;

    const waitMs = Math.max(0, MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastRequestAt = Date.now();

    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'ph');
    url.searchParams.set('q', location.trim());

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en',
          'User-Agent': 'Gigmatch/1.0',
        },
        signal: controller.signal,
      });
    } catch (error) {
      const serviceError = new Error(error.name === 'AbortError'
        ? 'Location lookup timed out; please try again.'
        : 'Location lookup is unavailable; please try again.');
      serviceError.status = 503;
      throw serviceError;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const serviceError = new Error('Location lookup is unavailable; please try again.');
      serviceError.status = 503;
      throw serviceError;
    }

    const results = await response.json();
    const first = results[0];
    const latitude = first ? Number(first.lat) : NaN;
    const longitude = first ? Number(first.lon) : NaN;
    const coordinates = Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude }
      : null;
    cacheResult(key, coordinates);
    return coordinates;
  });

  requestQueue = request.catch(() => undefined);
  return request;
};

const getDistanceKm = (origin, destination) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDifference = radians(destination.latitude - origin.latitude);
  const longitudeDifference = radians(destination.longitude - origin.longitude);
  const originLatitude = radians(origin.latitude);
  const destinationLatitude = radians(destination.latitude);
  const haversine = (
    Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(destinationLatitude)
      * Math.sin(longitudeDifference / 2) ** 2
  );
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
};

module.exports = { geocodeLocation, getDistanceKm };
