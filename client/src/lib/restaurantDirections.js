export function restaurantDirections(place) {
  const destination = Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
    ? `${place.latitude},${place.longitude}`
    : `${place.name}, ${place.address}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
