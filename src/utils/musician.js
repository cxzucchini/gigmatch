import { artists } from '../data/artists';

const demoImage = 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80';

export function normalizeMusician(profile) {
  const genres = Array.isArray(profile.genres)
    ? profile.genres
    : String(profile.genre || '').split('/').map((genre) => genre.trim()).filter(Boolean);
  const coordinates = profile.mapCoordinates;
  const mapCoordinates = coordinates
    && Number.isFinite(coordinates.latitude)
    && Number.isFinite(coordinates.longitude)
    && Math.abs(coordinates.latitude) <= 90
    && Math.abs(coordinates.longitude) <= 180
    ? coordinates
    : null;

  return {
    ...profile,
    id: profile._id || profile.id,
    name: profile.name,
    genre: genres.join(' / ') || 'Live music',
    description: profile.bio || profile.description || 'Musician available for live event bookings.',
    price: profile.hourlyRate ?? profile.price ?? 0,
    rating: profile.rating ?? null,
    distanceKm: profile.distanceKm ?? null,
    mapCoordinates,
    image: profile.profileImageUrl || profile.image || demoImage,
    location: profile.serviceArea || profile.location || 'Location available on request',
  };
}

export function getDemoMusician(id) {
  const demo = artists.find((artist) => String(artist.id) === String(id));
  return demo ? normalizeMusician(demo) : null;
}

export function isMongoId(id) {
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
}
