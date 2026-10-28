// client/src/features/restaurants/components/NearbyPlacesToolbar.jsx
import { RADIUS_OPTIONS, DIET_OPTIONS } from '../utils/nearbyHelpers.js';

export default function NearbyPlacesToolbar({
  mode,
  status,
  radiusKm,
  selectedDiet,
  userLocation,
  onNearbySearch,
  onCitySearch,
  onRadiusSelect,
  onDietSelect,
}) {
  return (
    <>
      <div className="cx-nearby-head">
        <div>
          <h2 id="nearby-title">
            <i className="bi bi-compass-fill" aria-hidden="true" /> Quán chay quanh bạn
          </h2>
          <p>
            Tìm quán chay dựa trên tọa độ GPS người dùng hoặc tại các khu vực trọng điểm toàn quốc.
          </p>
        </div>
        <div className="cx-nearby-actions">
          <button
            type="button"
            className={mode === 'nearby' ? 'is-active' : ''}
            onClick={() => onNearbySearch(false)}
            disabled={status === 'loading'}
          >
            {status === 'loading' && mode === 'nearby' ? (
              <>
                <i className="bi bi-hourglass-split" aria-hidden="true" /> Đang tìm…
              </>
            ) : (
              <>
                <i className="bi bi-geo-alt-fill" aria-hidden="true" /> Quán gần tôi
              </>
            )}
          </button>
          <button
            type="button"
            className={mode === 'city' ? 'is-active' : ''}
            onClick={onCitySearch}
            disabled={status === 'loading'}
          >
            <i className="bi bi-buildings-fill" aria-hidden="true" /> Tìm theo tỉnh / thành
          </button>
          {userLocation && (
            <button
              type="button"
              className="cx-btn-refresh-gps"
              title="Định vị lại GPS chính xác"
              onClick={() => onNearbySearch(true)}
              disabled={status === 'loading'}
            >
              <i className="bi bi-arrow-repeat" aria-hidden="true" /> Cập nhật GPS
            </button>
          )}
        </div>
      </div>

      {/* Thanh tùy chọn bán kính & Chế độ ăn chay */}
      <div className="cx-nearby-toolbar">
        <div className="cx-nearby-filter-group">
          <div className="cx-nearby-radius">
            <i className="bi bi-broadcast" aria-hidden="true" />
            <span>Bán kính:</span>
            <div className="cx-nearby-radius-chips" role="group" aria-label="Chọn bán kính quét">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={radiusKm === r ? 'is-active' : ''}
                  onClick={() => onRadiusSelect(r)}
                  disabled={status === 'loading'}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          <div className="cx-nearby-diet">
            <i className="bi bi-funnel-fill" aria-hidden="true" />
            <span>Chế độ:</span>
            <div className="cx-nearby-diet-chips" role="group" aria-label="Lọc theo chế độ ăn">
              {DIET_OPTIONS.map((d) => (
                <button
                  key={d.id ?? 'all'}
                  type="button"
                  className={selectedDiet === d.id ? 'is-active' : ''}
                  onClick={() => onDietSelect(d.id)}
                  disabled={status === 'loading'}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {userLocation && (
          <div className="cx-nearby-user-status">
            <span className="cx-gps-badge">
              <i className="bi bi-check-circle-fill" aria-hidden="true" /> Đã nhận vị trí của bạn
            </span>
          </div>
        )}
      </div>
    </>
  );
}
