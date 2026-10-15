import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { hasCoordinates } from '../lib/restaurantDirections.js';

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

export default function RestaurantMap({ places, selected, onSelect }) {
  const container = useRef(null);
  const instance = useRef(null);
  const select = useRef(onSelect);
  const retryTiles = useRef(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const map = L.map(container.current, { scrollWheelZoom: false }).setView(
      [10.7769, 106.7009],
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
    const group = L.layerGroup().addTo(instance.current);
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
      L.marker([place.latitude, place.longitude], {
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
  }, [places, selected?.id]);

  useEffect(() => {
    if (hasCoordinates(selected))
      instance.current.setView([selected.latitude, selected.longitude], 15);
  }, [selected]);

  return (
    <div className="cx-live-map">
      <div
        ref={container}
        className="cx-live-map-canvas"
        aria-label="Bản đồ tương tác vị trí quán chay"
      />
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
