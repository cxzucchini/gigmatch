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
    image: profile.profileImageUrl || profile.image || '',
    gallery: Array.isArray(profile.gallery)
      ? profile.gallery.filter((url) => typeof url === 'string' && url.trim())
      : [],
    playlist: Array.isArray(profile.playlist)
      ? profile.playlist
        .filter((track) => track && typeof track.url === 'string' && track.url.trim())
        .map((track) => ({
          title: typeof track.title === 'string' ? track.title : '',
          url: track.url,
          publicId: typeof track.publicId === 'string' ? track.publicId : '',
          duration: Number.isFinite(track.duration) ? track.duration : 0,
        }))
      : [],
    location: profile.serviceArea || profile.location || 'Location available on request',
    verificationStatus: profile.verificationStatus,
  };
}

export function isMongoId(id) {
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
}
