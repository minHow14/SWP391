// client/src/utils/restaurantDirections.js
export function hasCoordinates(place) {
  const lat = place?.latitude ?? place?.lat;
  const lng = place?.longitude ?? place?.lng;
  return Number.isFinite(lat) && Math.abs(lat) <= 90
    && Number.isFinite(lng) && Math.abs(lng) <= 180;
}

export function restaurantDirections(place, origin = null) {
  // Google Maps đổi tọa độ thành địa điểm gần nhất (có thể là quán khác cùng tòa nhà),
  // nên ưu tiên tên + địa chỉ; chỉ dùng tọa độ khi quán không có địa chỉ.
  const destination = !place.address && hasCoordinates(place)
    ? `${place.latitude ?? place.lat},${place.longitude ?? place.lng}`
    : [place.name, place.address].filter(Boolean).join(', ');
  const originParam = hasCoordinates(origin)
    ? `&origin=${encodeURIComponent(`${origin.latitude ?? origin.lat},${origin.longitude ?? origin.lng}`)}`
    : '';
  return `https://www.google.com/maps/dir/?api=1${originParam}&destination=${encodeURIComponent(destination)}`;
}
