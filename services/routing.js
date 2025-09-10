const geolib = require('geolib');

// Placeholder for external providers (Google, Here, OSM/OSRM)
// For now uses geodesic distance and a heuristic speed for ETA

function haversineKm(from, to) {
  const meters = geolib.getDistance(
    { latitude: from.latitude, longitude: from.longitude },
    { latitude: to.latitude, longitude: to.longitude }
  );
  return meters / 1000;
}

async function getRoute({ from, to, vehicle = 'car' }) {
  const distanceKm = haversineKm(from, to);
  // heuristic average speed in km/h based on vehicle
  const speedKph = vehicle === 'van' ? 28 : vehicle === 'sedan' ? 32 : 30;
  const durationMinutes = Math.max(1, Math.round((distanceKm / speedKph) * 60));
  // Simple straight-line geometry as GeoJSON LineString for map display
  const geometry = {
    type: 'LineString',
    coordinates: [
      [from.longitude, from.latitude],
      [to.longitude, to.latitude]
    ]
  };
  return { distanceKm, durationMinutes, geometry };
}

async function getEta({ from, to, vehicle = 'car' }) {
  const distanceKm = haversineKm(from, to);
  // Use a slightly different heuristic tuned for quick ETA estimation (no geometry)
  const speedKph = vehicle === 'van' ? 27 : vehicle === 'sedan' ? 33 : 31;
  const durationMinutes = Math.max(1, Math.round((distanceKm / speedKph) * 60));
  return { distanceKm, durationMinutes };
}

module.exports = { getRoute, getEta };

