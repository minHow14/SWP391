// client/src/features/restaurants/components/NearbyPlacesList.jsx
import { formatDistance } from '../../../utils/aiHelpers.js';
import { restaurantDirections } from '../../../utils/restaurantDirections.js';
import ContentImage from '../../../components/common/ContentImage.jsx';
import { checkIsOpenNow, getSampleRestaurantPhoto } from '../utils/nearbyHelpers.js';

export default function NearbyPlacesList({
  status,
  places,
  message,
  mode,
  radiusKm,
  userLocation,
  onSelect,
  onRadiusSelect,
  onFallbackHub,
}) {
  if (status === 'denied') {
    return (
      <p className="cx-nearby-note" role="alert">
        {message} Bạn có thể{' '}
        <button type="button" onClick={() => onFallbackHub('hcm_q1', 'hcm')}>
          dùng vị trí mặc định ở TP.HCM
        </button>
        .
      </p>
    );
  }

  if (status === 'error') {
    return (
      <p className="cx-nearby-note is-error" role="alert">
        {message}{' '}
        <button type="button" onClick={() => onFallbackHub('hcm_q1', 'hcm')}>
          Thử lại với khu vực TP.HCM
        </button>
      </p>
    );
  }

  if (status !== 'done') {
    return null;
  }

  return (
    <>
      {message && <p className="cx-nearby-note">{message}</p>}
      {places.length === 0 ? (
        <p className="cx-nearby-note" role="status">
          Chưa có quán nào trong bán kính {radiusKm} km quanh vị trí này. Bạn có thể{' '}
          <button type="button" onClick={() => onRadiusSelect(10)}>
            mở rộng bán kính 10 km
          </button>{' '}
          hoặc chọn khu vực / tỉnh thành khác.
        </p>
      ) : (
        <ul className="cx-nearby-list">
          {places.map((place) => {
            const directionsUrl = restaurantDirections(place, userLocation);
            const isOpen = checkIsOpenNow(place.hours);
            return (
              <li key={place.id} className="cx-nearby-item">
                <div className="cx-nearby-thumb-wrap">
                  <ContentImage
                    src={place.image || place.image_url}
                    fallbackSrc={getSampleRestaurantPhoto(place.name || place.id)}
                    alt={place.name}
                    className="cx-place-thumb"
                  />
                </div>
                <div className="cx-nearby-info">
                  <div className="cx-nearby-header-row">
                    <strong>{place.name}</strong>
                    {isOpen === true && (
                      <span className="cx-status-open">🟢 Đang mở cửa</span>
                    )}
                    {isOpen === false && (
                      <span className="cx-status-closed">🔴 Đã đóng cửa</span>
                    )}
                  </div>
                  <span className="cx-nearby-address">{place.address}</span>
                  {place.hours && place.hours !== 'Chưa cập nhật' && (
                    <span className="cx-nearby-hours">
                      <i className="bi bi-clock" aria-hidden="true" /> {place.hours}
                    </span>
                  )}
                </div>
                <div className="cx-nearby-meta">
                  {Number.isFinite(place.distance_m) && (
                    <span>
                      <i className="bi bi-geo" aria-hidden="true" />{' '}
                      {mode === 'nearby'
                        ? formatDistance(place.distance_m)
                        : `Cách tâm ${formatDistance(place.distance_m)}`}
                    </span>
                  )}

                  {/* Hiển thị khoảng cách từ vị trí thực của người dùng khi đang xem khu vực tỉnh/thành */}
                  {mode === 'city' && Number.isFinite(place.user_distance_m) && (
                    <span
                      className="cx-user-dist-badge"
                      title="Khoảng cách tính từ vị trí GPS hiện tại của bạn"
                    >
                      <i className="bi bi-person-fill" aria-hidden="true" /> Cách bạn{' '}
                      {formatDistance(place.user_distance_m)}
                    </span>
                  )}

                  {place.rating > 0 && <span>★ {place.rating}</span>}
                  <button type="button" onClick={() => onSelect?.(place)}>
                    <i className="bi bi-crosshair" aria-hidden="true" /> Xem bản đồ
                  </button>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    title="Mở chỉ đường Google Maps từ vị trí của bạn"
                  >
                    <i className="bi bi-sign-turn-right-fill" aria-hidden="true" /> Chỉ đường
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
