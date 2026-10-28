// client/src/features/restaurants/components/NearbyPlacesCitySelector.jsx
import { CITY_HUBS } from '../utils/nearbyHelpers.js';

export default function NearbyPlacesCitySelector({
  selectedCity,
  selectedHub,
  status,
  onCityTabChange,
  onHubSelect,
}) {
  const currentCityObj = CITY_HUBS.find((item) => item.id === selectedCity) || CITY_HUBS[0];

  return (
    <div className="cx-nearby-city-section">
      <div className="cx-nearby-city-tabs" role="tablist" aria-label="Chọn tỉnh thành">
        {CITY_HUBS.map((city) => (
          <button
            key={city.id}
            type="button"
            role="tab"
            aria-selected={selectedCity === city.id}
            className={`cx-city-tab-btn ${selectedCity === city.id ? 'is-active' : ''}`}
            onClick={() => onCityTabChange(city.id)}
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
            onClick={() => onHubSelect(hub.id, selectedCity)}
            disabled={status === 'loading'}
          >
            {hub.name}
          </button>
        ))}
      </div>
    </div>
  );
}
