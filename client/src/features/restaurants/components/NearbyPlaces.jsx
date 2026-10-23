// client/src/features/restaurants/components/NearbyPlaces.jsx
import { useEffect, useRef, useState } from 'react';
import { api } from '../../../services/api.js';
import { formatDistance } from '../../../utils/aiHelpers.js';

// TP.HCM (Quận 1) khi người dùng không cho phép lấy vị trí hoặc bấm "Tìm tại TP.HCM"
const DEFAULT_POSITION = { lat: 10.7769, lng: 106.7009 };
const RADIUS_KM = 10;

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Trình duyệt không hỗ trợ định vị GPS.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (result) => resolve({ lat: result.coords.latitude, lng: result.coords.longitude }),
      (err) => {
        let msg = 'Không lấy được vị trí của bạn.';
        if (err.code === 1) {
          msg = 'Bạn đã từ chối quyền truy cập vị trí trên trình duyệt.';
        } else if (err.code === 2) {
          msg = 'Vị trí hiện tại không khả dụng.';
        } else if (err.code === 3) {
          msg = 'Quá thời gian xác định vị trí.';
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

/**
 * Tìm quán chay quanh vị trí người dùng qua /api/places/nearby.
 * Hiển thị tất cả quán trong bán kính (cả quán trong hệ thống và quán từ bản đồ trực tuyến nếu có).
 */
export default function NearbyPlaces({ onResults, onSelect }) {
  const [state, setState] = useState({ status: 'idle', places: [], message: '', origin: null });
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  async function search(useDefault = false) {
    request.current?.abort();
    const current = new AbortController();
    request.current = current;
    setState({ status: 'loading', places: [], message: '', origin: null });
    onResults?.([]);
    let origin = DEFAULT_POSITION;
    if (!useDefault) {
      try {
        origin = await getPosition();
      } catch (error) {
        if (current.signal.aborted) return;
        setState({ status: 'denied', places: [], message: error.message, origin: null });
        return;
      }
    }
    try {
      if (current.signal.aborted) return;
      const response = await api(
        `/places/nearby?lat=${origin.lat}&lng=${origin.lng}&radius_km=${RADIUS_KM}&limit=10`,
        { signal: current.signal, includeMeta: true }
      );
      if (current.signal.aborted) return;
      const result = response?.data ?? response;
      const rawPlaces = Array.isArray(result?.places) ? result.places : Array.isArray(result) ? result : [];
      
      const places = rawPlaces.map((place) => {
        const isExternal = place.source === 'ziomap';
        return {
          ...place,
          id: place.id || (place.restaurant_id ? `local_${place.restaurant_id}` : `place_${Math.random()}`),
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
      if (places.length > 0) {
        note = useDefault
          ? `Đã tìm thấy ${places.length} quán chay quanh khu vực TP.HCM.`
          : `Đã tìm thấy ${places.length} quán chay trong bán kính ${RADIUS_KM} km gần bạn.`;
      } else {
        note = `Chưa tìm thấy quán chay nào trong bán kính ${RADIUS_KM} km quanh vị trí này.`;
        if (response?.meta?.ziomap === 'not_configured') {
          note += ' (Dịch vụ bản đồ ZIOMAP chưa cấu hình API key).';
        }
      }

      setState({ status: 'done', places, message: note, origin });
      onResults?.(places);
    } catch (error) {
      if (!current.signal.aborted) {
        setState({ status: 'error', places: [], message: error.message, origin });
      }
    }
  }

  const { status, places, message } = state;
  return (
    <section className="cx-nearby" aria-labelledby="nearby-title">
      <div className="cx-nearby-head">
        <div>
          <h2 id="nearby-title"><i className="bi bi-compass-fill" aria-hidden="true" /> Quán chay quanh bạn</h2>
          <p>Tìm quán chay trong bán kính {RADIUS_KM} km sắp xếp từ gần đến xa.</p>
        </div>
        <div className="cx-nearby-actions">
          <button type="button" onClick={() => search(false)} disabled={status === 'loading'}>
            {status === 'loading' ? 'Đang tìm…' : 'Quán gần tôi'}
          </button>
          <button type="button" onClick={() => search(true)} disabled={status === 'loading'}>
            Tìm tại TP.HCM
          </button>
        </div>
      </div>
      {status === 'denied' && (
        <p className="cx-nearby-note" role="alert">
          {message} Bạn có thể{' '}
          <button type="button" onClick={() => search(true)}>
            dùng vị trí mặc định ở TP.HCM
          </button>.
        </p>
      )}
      {status === 'error' && (
        <p className="cx-nearby-note is-error" role="alert">
          {message}{' '}
          <button type="button" onClick={() => search(true)}>
            Thử lại với vị trí TP.HCM
          </button>
        </p>
      )}
      {status === 'done' && (
        <>
          {message && <p className="cx-nearby-note">{message}</p>}
          {places.length === 0 ? (
            <p className="cx-nearby-note" role="status">
              Chưa có quán nào quanh vị trí này. Bạn có thể{' '}
              <button type="button" onClick={() => search(true)}>
                xem quán tại TP.HCM
              </button>{' '}
              hoặc xem danh sách bên dưới.
            </p>
          ) : (
            <ul className="cx-nearby-list">
              {places.map((place) => (
                <li key={place.id}>
                  <div>
                    <strong>{place.name}</strong>
                    <span>{place.address}</span>
                  </div>
                  <div className="cx-nearby-meta">
                    {Number.isFinite(place.distance_m) && <span>{formatDistance(place.distance_m)}</span>}
                    {place.rating > 0 && <span>★ {place.rating}</span>}
                    <button type="button" onClick={() => onSelect?.(place)}>Xem bản đồ</button>
                    {place.maps_url && (
                      <a href={place.maps_url} target="_blank" rel="noreferrer noopener">
                        <i className="bi bi-sign-turn-right-fill" aria-hidden="true" /> Chỉ đường
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
