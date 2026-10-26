// client/src/features/restaurants/components/RestaurantMap.jsx
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { hasCoordinates } from '../../../utils/restaurantDirections.js';

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
  const select = useRef(onSelect);
  const retryTiles = useRef(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

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
      layer.on('tileerror', () => {
        if (!disposed && layer === current && ++failures >= 3) fallback();
      });
      layer.on('loading', () => {
        loaded = false;
        failures = 0;
        clearTimeout(timer);
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
      const icon = L.divIcon({
        className: 'cx-map-marker-wrapper',
        html: `<span class="cx-map-marker${active ? ' is-selected' : ''}"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i></span>`,
        iconSize: [36, 42],
        iconAnchor: [18, 40],
      });
      const label = document.createElement('span');
      label.textContent = place.name;
      L.marker([place.latitude ?? place.lat, place.longitude ?? place.lng], {
        icon,
        title: place.name,
        alt: place.name,
        zIndexOffset: active ? 1000 : 0,
      })
        .bindTooltip(label, { direction: 'top', offset: [0, -36] })
        .on('click', () => select.current(place))
        .addTo(group);
    }

    return () => group.remove();
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
