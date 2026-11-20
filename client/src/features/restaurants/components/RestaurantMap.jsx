// client/src/features/restaurants/components/RestaurantMap.jsx
// Bản đồ Leaflet hiển thị các quán chay, vị trí người dùng và vòng tròn bán kính tìm kiếm.
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { hasCoordinates } from '../../../utils/restaurantDirections.js';

// Danh sách nguồn tile bản đồ; nguồn đầu lỗi thì tự chuyển sang nguồn kế tiếp.
const layers = [
  {
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, tiles <a href="https://www.openstreetmap.fr/">OSM France</a>',
    maxZoom: 20,
  },
  {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
];

// Component bản đồ; onSelect được gọi khi người dùng chọn một quán trên bản đồ.
export default function RestaurantMap({
  places,
  selected,
  onSelect,
  userLocation = null,
  searchCenter = null,
  searchRadius = null,
}) {
  const container = useRef(null);
  const instance = useRef(null);
  // Giữ onSelect mới nhất trong ref để các handler marker (tạo một lần) luôn gọi đúng callback hiện tại.
  const select = useRef(onSelect);
  const retryTiles = useRef(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  // Khởi tạo bản đồ một lần duy nhất; mặc định căn giữa trung tâm TP.HCM khi chưa có vị trí người dùng.
  useEffect(() => {
    const initialLat = hasCoordinates(userLocation)
      ? userLocation.latitude ?? userLocation.lat
      : 10.7769;
    const initialLng = hasCoordinates(userLocation)
      ? userLocation.longitude ?? userLocation.lng
      : 106.7009;

    const map = L.map(container.current, { scrollWheelZoom: false }).setView(
      [initialLat, initialLng],
      13
    );
    instance.current = map;
    let layer;
    let timer;
    let provider = 0;
    let disposed = false;

    // Tải lớp tile theo chỉ số nguồn; theo dõi lỗi để chuyển nguồn dự phòng.
    function loadTiles(index) {
      clearTimeout(timer);
      if (layer) map.removeLayer(layer);
      provider = index;
      let loaded = false;
      let failures = 0;
      layer = L.tileLayer(layers[index].url, {
        ...layers[index],
        subdomains: 'abc',
      });
      const current = layer;
      const fallback = () => {
        if (disposed || layer !== current) return;
        if (provider + 1 < layers.length) loadTiles(provider + 1);
        else setUnavailable(true);
      };
      layer.on('tileload', () => {
        if (disposed || layer !== current) return;
        loaded = true;
        clearTimeout(timer);
        setUnavailable(false);
      });
      // Cho phép vài tile lỗi lẻ tẻ; chỉ chuyển nguồn khi lỗi liên tiếp từ 3 tile trở lên.
      layer.on('tileerror', () => {
        if (!disposed && layer === current && ++failures >= 3) fallback();
      });
      layer.on('loading', () => {
        loaded = false;
        failures = 0;
        clearTimeout(timer);
        // Quá 10 giây chưa tải được tile nào thì coi như nguồn hiện tại không dùng được.
        timer = setTimeout(() => {
          if (!loaded) fallback();
        }, 10000);
      });
      layer.addTo(map);
    }

    retryTiles.current = () => {
      setUnavailable(false);
      loadTiles(0);
    };
    loadTiles(0);
    // Bản đồ Leaflet cần invalidateSize khi khung chứa đổi kích thước, nếu không tile sẽ bị lệch/thiếu.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container.current);
    return () => {
      disposed = true;
      clearTimeout(timer);
      observer.disconnect();
      map.remove();
      instance.current = null;
      retryTiles.current = null;
    };
  }, []);

  // Vẽ lại toàn bộ lớp marker mỗi khi danh sách quán, quán đang chọn, vị trí người dùng hoặc vùng tìm kiếm thay đổi.
  useEffect(() => {
    if (!instance.current) return;
    const group = L.layerGroup().addTo(instance.current);

    // 1. Vòng tròn bán kính tìm kiếm (nếu có tâm và bán kính)
    if (hasCoordinates(searchCenter) && Number.isFinite(searchRadius) && searchRadius > 0) {
      const cLat = searchCenter.latitude ?? searchCenter.lat;
      const cLng = searchCenter.longitude ?? searchCenter.lng;
      L.circle([cLat, cLng], {
        radius: searchRadius * 1000,
        color: '#059669',
        fillColor: '#10b981',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '5, 8',
      }).addTo(group);
    }

    // 2. Marker vị trí người dùng (User Location) với hiệu ứng Radar Pulse
    if (hasCoordinates(userLocation)) {
      const uLat = userLocation.latitude ?? userLocation.lat;
      const uLng = userLocation.longitude ?? userLocation.lng;
      const userIcon = L.divIcon({
        className: 'cx-user-marker-wrapper',
        html: '<div class="cx-user-pulse-dot" title="Vị trí của bạn"><span class="cx-user-pulse-ring"></span><span class="cx-user-pulse-core"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i></span></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker([uLat, uLng], {
        icon: userIcon,
        title: 'Vị trí của bạn (GPS)',
        alt: 'Vị trí của bạn',
        zIndexOffset: 2000,
      })
        .bindTooltip('Vị trí của bạn (GPS)', { direction: 'top', offset: [0, -14] })
        .addTo(group);
    }

    // 3. Marker các quán chay
    for (const place of places.filter(hasCoordinates)) {
      const active = place.id === selected?.id;
      const typeClass = place.type ? `is-${place.type}` : 'is-vegan';
      const icon = L.divIcon({
        className: 'cx-map-marker-wrapper',
        html: `<span class="cx-map-marker ${typeClass}${active ? ' is-selected' : ''}"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i></span>`,
        iconSize: [36, 42],
        iconAnchor: [18, 40],
      });

      const pLat = place.latitude ?? place.lat;
      const pLng = place.longitude ?? place.lng;

      const popupContent = document.createElement('div');
      popupContent.className = 'cx-map-popup';
      popupContent.innerHTML = `
        <strong>${place.name}</strong>
        <p><i class="bi bi-geo-alt"></i> ${place.address || 'Chưa cập nhật địa chỉ'}</p>
        ${place.hours && place.hours !== 'Chưa cập nhật' ? `<p><i class="bi bi-clock"></i> ${place.hours}</p>` : ''}
        <div class="cx-map-popup-actions">
          <button type="button" class="cx-popup-select-btn">Xem chi tiết</button>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.name}, ${place.address}`)}" target="_blank" rel="noreferrer">
            <i class="bi bi-sign-turn-right-fill"></i> Chỉ đường
          </a>
        </div>
      `;

      popupContent.querySelector('.cx-popup-select-btn')?.addEventListener('click', () => {
        select.current(place);
      });

      const label = document.createElement('span');
      label.textContent = place.name;

      L.marker([pLat, pLng], {
        icon,
        title: place.name,
        alt: place.name,
        zIndexOffset: active ? 1000 : 0,
      })
        .bindTooltip(label, { direction: 'top', offset: [0, -36] })
        .bindPopup(popupContent, { offset: [0, -32], closeButton: true })
        .on('click', () => select.current(place))
        .addTo(group);
    }

    return () => group.remove();
  // Phụ thuộc vào từng tọa độ thay vì cả object để tránh vẽ lại khi object mới nhưng cùng giá trị.
  }, [
    places,
    selected?.id,
    userLocation?.lat,
    userLocation?.latitude,
    userLocation?.lng,
    userLocation?.longitude,
    searchCenter?.lat,
    searchCenter?.latitude,
    searchCenter?.lng,
    searchCenter?.longitude,
    searchRadius,
  ]);

  // Phóng to và căn giữa vào quán đang được chọn.
  useEffect(() => {
    if (hasCoordinates(selected) && instance.current) {
      instance.current.setView(
        [selected.latitude ?? selected.lat, selected.longitude ?? selected.lng],
        15
      );
    }
  }, [selected]);

  return (
    <div className="cx-live-map">
      <div
        ref={container}
        className="cx-live-map-canvas"
        aria-label="Bản đồ tương tác vị trí quán chay"
      />
      {hasCoordinates(userLocation) && (
        <button
          type="button"
          className="cx-map-recenter-user"
          onClick={() => {
            const uLat = userLocation.latitude ?? userLocation.lat;
            const uLng = userLocation.longitude ?? userLocation.lng;
            instance.current?.setView([uLat, uLng], 15);
          }}
          title="Căn giữa về vị trí của bạn"
        >
          <i className="bi bi-crosshair" aria-hidden="true" /> Vị trí của tôi
        </button>
      )}
      {unavailable && (
        <div className="cx-map-load-error" role="status">
          Không tải được nền bản đồ. Bạn vẫn có thể chọn quán hoặc mở chỉ đường.
          <button type="button" onClick={() => retryTiles.current?.()}>
            Thử tải lại
          </button>
        </div>
      )}
    </div>
  );
}
