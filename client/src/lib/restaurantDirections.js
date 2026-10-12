export function hasCoordinates(place) {
  return Number.isFinite(place?.latitude) && Math.abs(place.latitude) <= 90
    && Number.isFinite(place?.longitude) && Math.abs(place.longitude) <= 180;
}

export function restaurantDirections(place) {
  const destination = hasCoordinates(place)
    ? `${place.latitude},${place.longitude}`
    : `${place.name}, ${place.address}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
