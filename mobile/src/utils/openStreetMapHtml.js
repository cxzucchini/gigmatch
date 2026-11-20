const isValidCoordinate = (latitude, longitude) => (
  Number.isFinite(latitude)
  && Number.isFinite(longitude)
  && Math.abs(latitude) <= 90
  && Math.abs(longitude) <= 180
);

const escapeForScript = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

const createOpenStreetMapHtml = (origin, musicians, eventLabel = 'Your event') => {
  const points = [];
  if (origin && isValidCoordinate(origin.latitude, origin.longitude)) {
    points.push({
      latitude: origin.latitude,
      longitude: origin.longitude,
      name: eventLabel,
      kind: 'event',
    });
  }

  for (const musician of musicians) {
    const coordinates = musician.mapCoordinates;
    if (!coordinates || !isValidCoordinate(coordinates.latitude, coordinates.longitude)) continue;
    points.push({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      name: musician.name,
      distanceKm: musician.distanceKm,
      genres: musician.genre || (Array.isArray(musician.genres) ? musician.genres.join(' / ') : ''),
      rate: musician.price ?? musician.hourlyRate,
      serviceArea: musician.location || musician.serviceArea || '',
      profileUrl: /^[a-f\d]{24}$/i.test(String(musician.id || musician._id || ''))
        ? `/artist/${encodeURIComponent(musician.id || musician._id)}`
        : '',
      kind: 'musician',
    });
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html, body, #map { width: 100%; height: 100%; min-height: 320px; margin: 0; }
    body { font-family: Arial, sans-serif; background: #f2efe9; }
    #map-message { position: absolute; z-index: 500; top: 45%; left: 12px; right: 12px; color: #5a3b2d; text-align: center; }
    .gigmatch-marker { width: 18px; height: 18px; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 1px 5px #3338; }
    .gigmatch-marker.event { background: #365b73; }
    .gigmatch-marker.musician { background: #9a5c38; }
    .leaflet-popup-content, .leaflet-tooltip { line-height: 1.5; }
    .leaflet-tooltip { border: 1px solid #d5c9bb; background: #f7f2eb; color: #38251d; box-shadow: 0 2px 8px #0003; }
    .profile-link { display: inline-block; margin-top: 5px; color: #6a4030; font-weight: 700; }
  </style>
</head>
<body>
  <div id="map-message">Map tiles need an internet connection to load.</div>
  <div id="map" aria-label="Map of the event location and nearby musicians"></div>
  <script id="map-data" type="application/json">${escapeForScript(points)}</script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const points = JSON.parse(document.getElementById('map-data').textContent);
    const map = L.map('map', { scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
    const bounds = [];
    for (const point of points) {
      const location = [point.latitude, point.longitude];
      bounds.push(location);
      const marker = L.marker(location, {
        icon: L.divIcon({
          className: '',
          html: '<div class="gigmatch-marker ' + point.kind + '"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      });
      let popup = '<strong>' + escapeHtml(point.name) + '</strong>';
      if (point.kind === 'musician') {
        if (point.genres) popup += '<br>' + escapeHtml(point.genres);
        if (Number.isFinite(point.rate) && point.rate > 0) popup += '<br>₱' + point.rate.toLocaleString() + '+ per set';
        if (point.serviceArea) popup += '<br>' + escapeHtml(point.serviceArea);
        if (point.profileUrl) popup += '<br><a class="profile-link" href="' + escapeHtml(point.profileUrl) + '" target="_top">View musician profile</a>';
      }
      if (point.kind === 'musician' && Number.isFinite(point.distanceKm)) {
        popup += '<br>' + point.distanceKm.toFixed(1) + ' km from your event';
      }
      marker.bindPopup(popup);
      if (point.kind === 'musician')      marker.bindTooltip(popup, { direction: 'top', sticky: false, interactive: true });
      marker.addTo(map);
    }
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    } else {
      map.setView([14.5995, 120.9842], 11);
    }
    document.getElementById('map-message').style.display = 'none';
  </script>
</body>
</html>`;
};

module.exports = { createOpenStreetMapHtml };
