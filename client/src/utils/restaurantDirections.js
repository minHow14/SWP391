// client/src/utils/restaurantDirections.js
export function hasCoordinates(place) {
  const lat = place?.latitude ?? place?.lat;
  const lng = place?.longitude ?? place?.lng;
  return Number.isFinite(lat) && Math.abs(lat) <= 90
    && Number.isFinite(lng) && Math.abs(lng) <= 180;
}

export function restaurantDirections(place, origin = null) {
  const destination = hasCoordinates(place)
    ? `${place.latitude ?? place.lat},${place.longitude ?? place.lng}`
    : `${place.name}, ${place.address}`;
  const originParam = hasCoordinates(origin)
    ? `&origin=${encodeURIComponent(`${origin.latitude ?? origin.lat},${origin.longitude ?? origin.lng}`)}`
    : '';
  return `https://www.google.com/maps/dir/?api=1${originParam}&destination=${encodeURIComponent(destination)}`;
}
