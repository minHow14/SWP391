// client/src/features/restaurants/components/NearbyPlaces.jsx
import { useEffect, useRef, useState } from 'react';
import { api } from '../../../services/api.js';
import { formatDistance } from '../../../utils/aiHelpers.js';

// TP.HCM (Quận 1) khi người dùng không cho phép lấy vị trí.
const DEFAULT_POSITION = { lat: 10.7769, lng: 106.7009 };
const RADIUS_KM = 5;

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Trình duyệt không hỗ trợ định vị.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (result) => resolve({ lat: result.coords.latitude, lng: result.coords.longitude }),
      () => reject(new Error('Không lấy được vị trí của bạn.')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

/**
 * Tìm thêm quán chay quanh vị trí người dùng qua /api/places/nearby (nguồn bản đồ ZIOMAP).
 * Chỉ hiển thị quán lấy từ bản đồ; quán trong hệ thống đã có ở danh sách bên dưới.
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
    let note = '';
    if (!useDefault) {
      try {
        origin = await getPosition();
      } catch (error) {
        if (current.signal.aborted) return;
        setState({ status: 'denied', places: [], message: error.message, origin: null });
        return;
      }
    } else {
      note = 'Đang dùng vị trí mặc định (Quận 1, TP.HCM).';
    }
    try {
      if (current.signal.aborted) return;
      const response = await api(`/places/nearby?lat=${origin.lat}&lng=${origin.lng}&radius_km=${RADIUS_KM}&limit=10`, { signal: current.signal, includeMeta: true });
      if (current.signal.aborted) return;
      const result = response.data;
      const places = (result.places || []).filter((place) => place.source !== 'local').map(place => ({
        ...place, city: useDefault ? 'TP.HCM' : 'Quanh bạn', hours: 'Chưa cập nhật', type: 'external',
      }));
      if (response.meta?.ziomap === 'unavailable') note += ' Dịch vụ tìm quán đang gián đoạn. Các quán trong hệ thống vẫn hiển thị bên dưới.';
      if (response.meta?.ziomap === 'not_configured') note += ' Chưa cấu hình dịch vụ tìm thêm quán. Các quán trong hệ thống vẫn hiển thị bên dưới.';
      setState({ status: 'done', places, message: note, origin });
      onResults?.(places);
    } catch (error) {
      if (!current.signal.aborted) setState({ status: 'error', places: [], message: error.message, origin });
    }
  }

  const { status, places, message } = state;
  return (
    <section className="cx-nearby" aria-labelledby="nearby-title">
      <div className="cx-nearby-head">
        <div>
          <h2 id="nearby-title"><i className="bi bi-compass-fill" aria-hidden="true" /> Quán chay quanh bạn</h2>
          <p>Tìm thêm quán chay trong bán kính {RADIUS_KM} km từ bản đồ trực tuyến.</p>
        </div>
        <div className="cx-nearby-actions"><button type="button" onClick={() => search(false)} disabled={status === 'loading'}>
          {status === 'loading' ? 'Đang tìm…' : 'Quán gần tôi'}
        </button><button type="button" onClick={() => search(true)} disabled={status === 'loading'}>Tìm tại TP.HCM</button></div>
      </div>
      {status === 'denied' && (
        <p className="cx-nearby-note" role="alert">{message} Bạn có thể <button type="button" onClick={() => search(true)}>dùng vị trí mặc định ở TP.HCM</button>.</p>
      )}
      {status === 'error' && (
        <p className="cx-nearby-note is-error" role="alert">{message} <button type="button" onClick={() => search(true)}>Thử lại</button></p>
      )}
      {status === 'done' && (
        <>
          {message && <p className="cx-nearby-note">{message}</p>}
          {places.length === 0 ? (
            <p className="cx-nearby-note" role="status">Chưa có quán nào từ bản đồ quanh vị trí này. Hãy xem danh sách quán trong hệ thống bên dưới.</p>
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
                    <a href={place.maps_url} target="_blank" rel="noreferrer noopener"><i className="bi bi-sign-turn-right-fill" aria-hidden="true" /> Chỉ đường</a>
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
