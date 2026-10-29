// client/src/features/restaurants/components/NearbyPlaces.jsx
import { useEffect, useRef, useState } from 'react';
import { placeService } from '../../../services/placeService.js';
import { CITY_HUBS, getPosition } from '../utils/nearbyHelpers.js';
import NearbyPlacesToolbar from './NearbyPlacesToolbar.jsx';
import NearbyPlacesCitySelector from './NearbyPlacesCitySelector.jsx';
import NearbyPlacesList from './NearbyPlacesList.jsx';

export * from '../utils/nearbyHelpers.js';

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
  const [userAddress, setUserAddress] = useState('');
  const [state, setState] = useState({
    status: 'idle',
    places: [],
    message: '',
    origin: null,
  });

  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  async function resolveUserAddress(loc) {
    if (!loc?.lat || !loc?.lng) return;
    try {
      const response = await placeService.reverseGeocode({ lat: loc.lat, lng: loc.lng });
      const addr = response?.data?.address || response?.address;
      if (addr) setUserAddress(addr);
    } catch {
      setUserAddress(`Tọa độ (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`);
    }
  }

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
                resolveUserAddress(loc);
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
        current.signal
      );

      const items = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.places)
          ? response.data.places
          : Array.isArray(response.places)
            ? response.places
            : [];
      const hasNoResults = items.length === 0;

      setState({
        status: 'done',
        places: items,
        message: hasNoResults ? `Không tìm thấy quán chay nào trong bán kính ${targetRadius} km.` : '',
        origin: targetOrigin,
      });

      onResults?.(items);
    } catch (error) {
      if (current.signal.aborted) return;
      setState({
        status: 'error',
        places: [],
        message: error.message || 'Không thể tải danh sách quán quanh đây. Vui lòng thử lại.',
        origin: targetOrigin,
      });
      onResults?.([]);
    }
  }

  // Tìm kiếm quán gần vị trí GPS của người dùng
  async function handleNearbySearch(forceRefresh = false) {
    setMode('nearby');
    let loc = userLocation;

    if (!loc || forceRefresh) {
      setState({ status: 'loading', places: [], message: '', origin: null });
      try {
        loc = await getPosition();
        setUserLocation(loc);
        resolveUserAddress(loc);
        onUserLocationChange?.(loc);
      } catch (error) {
        setState({
          status: 'denied',
          places: [],
          message: error.message || 'Không lấy được vị trí GPS. Hãy kiểm tra quyền truy cập vị trí trên trình duyệt.',
          origin: null,
        });
        return;
      }
    }

    executeSearch(loc, radiusKm, 'nearby', loc, selectedDiet);
  }

  // Tìm kiếm theo khu vực trọng điểm (Hub) tại Tỉnh / Thành
  function handleHubSearch(
    hubId = selectedHub,
    cityId = selectedCity,
    targetRadius = radiusKm,
    targetDiet = selectedDiet
  ) {
    setMode('city');
    setSelectedCity(cityId);
    setSelectedHub(hubId);

    const city = CITY_HUBS.find((item) => item.id === cityId) || CITY_HUBS[0];
    const hub = city.hubs.find((item) => item.id === hubId) || city.hubs[0];

    executeSearch(hub.coords, targetRadius, 'city', userLocation, targetDiet);
  }

  // Đổi tab Tỉnh/Thành -> chọn ngay hub đầu tiên của tỉnh đó
  function handleCityTabChange(cityId) {
    setSelectedCity(cityId);
    const city = CITY_HUBS.find((item) => item.id === cityId);
    if (city && city.hubs.length > 0) {
      const firstHub = city.hubs[0];
      setSelectedHub(firstHub.id);
      handleHubSearch(firstHub.id, cityId, radiusKm, selectedDiet);
    }
  }

  function handleRadiusSelect(r) {
    setRadiusKm(r);
    if (mode === 'nearby' && userLocation) {
      executeSearch(userLocation, r, 'nearby', userLocation, selectedDiet);
    } else if (mode === 'city') {
      handleHubSearch(selectedHub, selectedCity, r, selectedDiet);
    }
  }

  function handleDietSelect(dietId) {
    setSelectedDiet(dietId);
    if (mode === 'nearby' && userLocation) {
      executeSearch(userLocation, radiusKm, 'nearby', userLocation, dietId);
    } else if (mode === 'city') {
      handleHubSearch(selectedHub, selectedCity, radiusKm, dietId);
    }
  }

  const { status, places, message } = state;

  return (
    <section className="cx-nearby" aria-labelledby="nearby-title">
      <NearbyPlacesToolbar
        mode={mode}
        status={status}
        radiusKm={radiusKm}
        selectedDiet={selectedDiet}
        userLocation={userLocation}
        userAddress={userAddress}
        onNearbySearch={handleNearbySearch}
        onCitySearch={() => handleHubSearch(selectedHub, selectedCity)}
        onRadiusSelect={handleRadiusSelect}
        onDietSelect={handleDietSelect}
      />

      {mode === 'city' && (
        <NearbyPlacesCitySelector
          selectedCity={selectedCity}
          selectedHub={selectedHub}
          status={status}
          onCityTabChange={handleCityTabChange}
          onHubSelect={handleHubSearch}
        />
      )}

      <NearbyPlacesList
        status={status}
        places={places}
        message={message}
        mode={mode}
        radiusKm={radiusKm}
        userLocation={userLocation}
        userAddress={userAddress}
        onSelect={onSelect}
        onRadiusSelect={handleRadiusSelect}
        onFallbackHub={handleHubSearch}
      />
    </section>
  );
}
