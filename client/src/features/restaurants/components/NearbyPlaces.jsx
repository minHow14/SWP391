// client/src/features/restaurants/components/NearbyPlaces.jsx
import { useEffect, useRef, useState } from 'react';
import { placeService } from '../../../services/placeService.js';
import { formatDistance } from '../../../utils/aiHelpers.js';
import { restaurantDirections } from '../../../utils/restaurantDirections.js';
import ContentImage from '../../../components/common/ContentImage.jsx';
import {
  CITY_HUBS,
  HCM_HUBS,
  RADIUS_OPTIONS,
  DIET_OPTIONS,
  checkIsOpenNow,
  getPosition,
} from '../utils/nearbyHelpers.js';

export { CITY_HUBS, HCM_HUBS, RADIUS_OPTIONS, DIET_OPTIONS, checkIsOpenNow, getPosition };

/**
 * Tìm quán chay quanh vị trí người dùng hoặc tại các khu vực trọng điểm đa tỉnh thành.
 * Hỗ trợ chọn bán kính (3km - 20km), lọc theo chế độ ăn chay, tính khoảng cách thực tế và ghim vị trí lên bản đồ.
 */
export default function NearbyPlaces({
  onResults,
  onSelect,
  onUserLocationChange,
  onSearchContextChange,
}) {
  const [mode, setMode] = useState('idle'); // 'idle' | 'nearby' | 'city'
  const [selectedCity, setSelectedCity] = useState('hcm');
  const [selectedHub, setSelectedHub] = useState('hcm_q1');
  const [radiusKm, setRadiusKm] = useState(10);
  const [selectedDiet, setSelectedDiet] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [state, setState] = useState({
    status: 'idle',
    places: [],
    message: '',
    origin: null,
  });

  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  // Tự động kiểm tra quyền vị trí nếu người dùng đã cho phép trước đó
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((permission) => {
          if (permission.state === 'granted') {
            getPosition()
              .then((loc) => {
                setUserLocation(loc);
                onUserLocationChange?.(loc);
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [onUserLocationChange]);

  // Thực hiện tìm kiếm tại vị trí tâm (targetOrigin) với bán kính (targetRadius) và chế độ ăn (targetDiet)
  async function executeSearch(
    targetOrigin,
    targetRadius,
    searchMode,
    currentUserLoc = userLocation,
    targetDiet = selectedDiet
  ) {
    request.current?.abort();
    const current = new AbortController();
    request.current = current;

    setState({ status: 'loading', places: [], message: '', origin: targetOrigin });
    onResults?.([]);
    onSearchContextChange?.({ center: targetOrigin, radius: targetRadius, mode: searchMode });

    try {
      const response = await placeService.getNearbyPlaces(
        {
          lat: targetOrigin.lat,
          lng: targetOrigin.lng,
          userLat: currentUserLoc?.lat,
          userLng: currentUserLoc?.lng,
          radiusKm: targetRadius,
          limit: 12,
          dietTypeId: targetDiet,
        },
        { signal: current.signal }
      );

      if (current.signal.aborted) return;
      const result = response?.data ?? response;
      const rawPlaces = Array.isArray(result?.places)
        ? result.places
        : Array.isArray(result)
          ? result
          : [];

      const places = rawPlaces.map((place) => {
        const isExternal = place.source === 'ziomap';
        return {
          ...place,
          id:
            place.id ||
            (place.restaurant_id ? `local_${place.restaurant_id}` : `place_${Math.random()}`),
          city: place.city || (place.address?.includes('Hà Nội') ? 'Hà Nội' : 'Hồ Chí Minh'),
          hours: place.hours || 'Chưa cập nhật',
          type: isExternal
            ? 'external'
            : place.diet_type_id === 5
              ? 'buddhist'
              : place.diet_type_id === 1
                ? 'vegan'
                : 'separate',
          image: place.image || place.image_url,
        };
      });

      let note = '';
      const dietLabel = DIET_OPTIONS.find((d) => d.id === targetDiet)?.label;
      const dietSuffix = targetDiet ? ` (${dietLabel})` : '';

      if (places.length > 0) {
        if (searchMode === 'nearby') {
          note = `Đã tìm thấy ${places.length} quán chay${dietSuffix} trong bán kính ${targetRadius} km quanh vị trí của bạn.`;
        } else {
          const currentCityObj = CITY_HUBS.find((c) => c.id === selectedCity) || CITY_HUBS[0];
          const currentHubObj = currentCityObj.hubs.find((h) => h.id === selectedHub) || currentCityObj.hubs[0];
          note = `Đã tìm thấy ${places.length} quán chay${dietSuffix} quanh ${currentHubObj.name} - ${currentCityObj.name} (bán kính ${targetRadius} km).`;
          if (currentUserLoc) {
            note += ' Đã tính khoảng cách thực tế từ vị trí của bạn.';
          }
        }
      } else {
        note = `Chưa tìm thấy quán chay${dietSuffix} nào trong bán kính ${targetRadius} km quanh khu vực này.`;
        if (response?.meta?.ziomap === 'not_configured') {
          note += ' (Dịch vụ bản đồ ZIOMAP chưa cấu hình API key).';
        }
      }

      setState({ status: 'done', places, message: note, origin: targetOrigin });
      onResults?.(places);
    } catch (error) {
      if (!current.signal.aborted) {
        setState({ status: 'error', places: [], message: error.message, origin: targetOrigin });
      }
    }
  }

  // Xử lý khi bấm "Quán gần tôi"
  async function handleNearbySearch(forceRefresh = false) {
    setMode('nearby');
    let loc = userLocation;
    if (!loc || forceRefresh) {
      setState({ status: 'loading', places: [], message: 'Đang xác định vị trí GPS...', origin: null });
      try {
        loc = await getPosition();
        setUserLocation(loc);
        onUserLocationChange?.(loc);
      } catch (error) {
        setState({ status: 'denied', places: [], message: error.message, origin: null });
        return;
      }
    }
    await executeSearch(loc, radiusKm, 'nearby', loc, selectedDiet);
  }

  // Xử lý khi chọn tỉnh/thành hoặc khu vực quận/huyện
  async function handleHubSearch(hubId, cityId = selectedCity, customRadius = radiusKm, customDiet = selectedDiet) {
    setMode('city');
    setSelectedCity(cityId);
    setSelectedHub(hubId);
    const cityObj = CITY_HUBS.find((item) => item.id === cityId) || CITY_HUBS[0];
    const hub = cityObj.hubs.find((item) => item.id === hubId) || cityObj.hubs[0];
    const hubOrigin = { lat: hub.lat, lng: hub.lng };
    await executeSearch(hubOrigin, customRadius, 'city', userLocation, customDiet);
  }

  // Chuyển đổi thành phố
  function handleCityTabChange(cityId) {
    setSelectedCity(cityId);
    const cityObj = CITY_HUBS.find((item) => item.id === cityId) || CITY_HUBS[0];
    const firstHub = cityObj.hubs[0];
    if (firstHub) {
      handleHubSearch(firstHub.id, cityId, radiusKm, selectedDiet);
    }
  }

  // Thay đổi bán kính tìm kiếm
  function handleRadiusSelect(r) {
    setRadiusKm(r);
    if (mode === 'nearby' && userLocation) {
      executeSearch(userLocation, r, 'nearby', userLocation, selectedDiet);
    } else if (mode === 'city') {
      handleHubSearch(selectedHub, selectedCity, r, selectedDiet);
    }
  }

  // Thay đổi bộ lọc chế độ ăn
  function handleDietSelect(dietId) {
    setSelectedDiet(dietId);
    if (mode === 'nearby' && userLocation) {
      executeSearch(userLocation, radiusKm, 'nearby', userLocation, dietId);
    } else if (mode === 'city') {
      handleHubSearch(selectedHub, selectedCity, radiusKm, dietId);
    }
  }

  const { status, places, message } = state;
  const currentCityObj = CITY_HUBS.find((item) => item.id === selectedCity) || CITY_HUBS[0];

  return (
    <section className="cx-nearby" aria-labelledby="nearby-title">
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
            onClick={() => handleNearbySearch(false)}
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
            onClick={() => handleHubSearch(selectedHub, selectedCity)}
            disabled={status === 'loading'}
          >
            <i className="bi bi-buildings-fill" aria-hidden="true" /> Tìm theo tỉnh / thành
          </button>
          {userLocation && (
            <button
              type="button"
              className="cx-btn-refresh-gps"
              title="Định vị lại GPS chính xác"
              onClick={() => handleNearbySearch(true)}
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
                  onClick={() => handleRadiusSelect(r)}
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
                  onClick={() => handleDietSelect(d.id)}
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

      {/* Thanh chọn nhanh Tỉnh/Thành & Quận/Huyện */}
      {mode === 'city' && (
        <div className="cx-nearby-city-section">
          <div className="cx-nearby-city-tabs" role="tablist" aria-label="Chọn tỉnh thành">
            {CITY_HUBS.map((city) => (
              <button
                key={city.id}
                type="button"
                role="tab"
                aria-selected={selectedCity === city.id}
                className={`cx-city-tab-btn ${selectedCity === city.id ? 'is-active' : ''}`}
                onClick={() => handleCityTabChange(city.id)}
                disabled={status === 'loading'}
              >
                {city.name}
              </button>
            ))}
          </div>

          <div className="cx-nearby-hubs" role="group" aria-label={`Khu vực tại ${currentCityObj.name}`}>
            <span className="cx-nearby-hubs-title">
              <i className="bi bi-pin-map-fill" aria-hidden="true" /> Khu vực:
            </span>
            {currentCityObj.hubs.map((hub) => (
              <button
                key={hub.id}
                type="button"
                className={`cx-nearby-hub-btn ${selectedHub === hub.id ? 'is-active' : ''}`}
                onClick={() => handleHubSearch(hub.id, selectedCity)}
                disabled={status === 'loading'}
              >
                {hub.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {status === 'denied' && (
        <p className="cx-nearby-note" role="alert">
          {message} Bạn có thể{' '}
          <button type="button" onClick={() => handleHubSearch('hcm_q1', 'hcm')}>
            dùng vị trí mặc định ở TP.HCM
          </button>
          .
        </p>
      )}

      {status === 'error' && (
        <p className="cx-nearby-note is-error" role="alert">
          {message}{' '}
          <button type="button" onClick={() => handleHubSearch('hcm_q1', 'hcm')}>
            Thử lại với khu vực TP.HCM
          </button>
        </p>
      )}

      {status === 'done' && (
        <>
          {message && <p className="cx-nearby-note">{message}</p>}
          {places.length === 0 ? (
            <p className="cx-nearby-note" role="status">
              Chưa có quán nào trong bán kính {radiusKm} km quanh vị trí này. Bạn có thể{' '}
              <button type="button" onClick={() => handleRadiusSelect(20)}>
                mở rộng bán kính 20 km
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
      )}
    </section>
  );
}
