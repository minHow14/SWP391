// client/src/pages/Restaurants.jsx
// Trang Quán chay: danh sách và bản đồ quán chay (catalog + tìm kiếm gần đây + tìm kiếm từ server),
// lọc/sắp xếp, xem chi tiết, chỉ đường, đánh giá và đề xuất quán mới.
import { useEffect, useMemo, useRef, useState } from 'react';
import { restaurantTypes } from '../constants/restaurantLabels.js';
import { useDatabase } from '../hooks/useDatabase.js';
import { workspaceService } from '../services/workspaceService.js';
import { placeService } from '../services/placeService.js';
import { normalizeSearch } from '../utils/recipeFilters.js';
import { formatDistance } from '../utils/aiHelpers.js';
import RestaurantImage from '../features/restaurants/components/RestaurantImage.jsx';
import ContentDialog from '../components/common/ContentDialog.jsx';
import RestaurantDetail from '../features/restaurants/components/RestaurantDetail.jsx';
import RestaurantProposalForm from '../features/restaurants/components/RestaurantProposalForm.jsx';
import NearbyPlaces from '../features/restaurants/components/NearbyPlaces.jsx';
import RestaurantMap from '../features/restaurants/components/RestaurantMap.jsx';
import { hasCoordinates, restaurantDirections } from '../utils/restaurantDirections.js';
import { resolveRestaurantPhoto, isVegetarianPlace } from '../features/restaurants/utils/nearbyHelpers.js';
import { compareRestaurantPrices } from '../features/restaurants/utils/restaurantSort.js';

// Nhãn loại quán; quán lấy từ nguồn ngoài hiển thị tên nguồn.
const typeName = (type) =>
  type === 'external'
    ? 'Quán từ ZIOMAP'
    : restaurantTypes.find((item) => item.id === type)?.name || type;
const directions = restaurantDirections;

// Component trang quán chay.
export default function Restaurants() {
  const { data, user, reload } = useDatabase();
  const catalogPlaces = useMemo(
    () => (data.restaurants || []).filter(isVegetarianPlace),
    [data.restaurants]
  );

  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [city, setCity] = useState('all');
  const [sort, setSort] = useState('rating');
  const [selectedId, setSelectedId] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [serverSearchResults, setServerSearchResults] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [searchContext, setSearchContext] = useState(null);
  const [proposing, setProposing] = useState(false);
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState(null);
  const map = useRef(null);
  const list = useRef(null);

  // Tìm kiếm mờ từ Back-end có trễ (debounce) khi người dùng nhập từ khóa
  useEffect(() => {
    // Chỉ gọi server khi từ khóa có ít nhất 2 ký tự; đợi 350ms sau lần gõ cuối để tránh gửi quá nhiều request.
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setServerSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await placeService.searchPlaces({
          q: trimmed,
          lat: userLocation?.lat,
          lng: userLocation?.lng,
        });
        const resData = response?.data?.places ?? response?.places ?? [];
        if (Array.isArray(resData)) {
          setServerSearchResults(resData.filter(isVegetarianPlace));
        }
      } catch {
        // Tìm kiếm ngoài không thành công thì giữ tìm kiếm bộ lọc nội bộ
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, userLocation]);

  // Hợp nhất danh mục hệ thống, kết quả tìm kiếm GPS lân cận và tìm kiếm mờ Backend
  const allPlaces = useMemo(() => {
    const list = [...catalogPlaces];
    const seenIds = new Set(list.map((p) => p.restaurant_id || p.id));
    const seenPlaceIds = new Set(list.map((p) => p.place_id).filter(Boolean));

    // Loại trùng theo ID, place_id hoặc cặp tên + địa chỉ giống nhau.
    const candidates = [...nearbyPlaces, ...serverSearchResults];
    for (const item of candidates) {
      if (!isVegetarianPlace(item)) continue;
      const idKey = item.restaurant_id || item.id;
      const isDuplicate =
        seenIds.has(idKey) ||
        (item.place_id && seenPlaceIds.has(item.place_id)) ||
        list.some(
          (c) =>
            c.name.toLowerCase() === item.name.toLowerCase() &&
            c.address.toLowerCase() === item.address.toLowerCase()
        );

      if (!isDuplicate) {
        list.push(item);
        if (idKey) seenIds.add(idKey);
        if (item.place_id) seenPlaceIds.add(item.place_id);
      }
    }
    return list;
  }, [catalogPlaces, nearbyPlaces, serverSearchResults]);

  // Lọc theo loại, khu vực và từ khóa (tên, địa chỉ, món ăn), rồi sắp xếp theo tiêu chí đã chọn (mặc định đánh giá cao nhất).
  const search = normalizeSearch(query.trim());
  const sorted = useMemo(() => {
    return allPlaces
      .filter((place) => {
        const matchesType = type === 'all' || place.type === type;
        const matchesCity = city === 'all' || place.city === city;
        const dishesText = place.dishes || (Array.isArray(place.menu) ? place.menu.map((m) => m.name).join(' ') : '');
        const matchedDishesText = Array.isArray(place.matched_dishes) ? place.matched_dishes.join(' ') : '';
        const matchesSearch =
          !search ||
          normalizeSearch(`${place.name} ${place.address} ${dishesText} ${matchedDishesText}`).includes(search);
        return matchesType && matchesCity && matchesSearch;
      })
      .sort((a, b) => {
        if (sort === 'name') {
          return a.name.localeCompare(b.name, 'vi');
        }
        if (sort === 'price') {
          return compareRestaurantPrices(a, b);
        }
        if (sort === 'distance') {
          const distA = a.user_distance_m ?? a.distance_m ?? Infinity;
          const distB = b.user_distance_m ?? b.distance_m ?? Infinity;
          return distA - distB;
        }
        return (b.rating || 0) - (a.rating || 0);
      });
  }, [allPlaces, type, city, search, sort]);

  // Quán đang được chọn sẽ được đưa lên đầu danh sách để quan sát
  const pinned = sorted.find((place) => place.id === selectedId || place.restaurant_id === selectedId);
  const filtered = pinned ? [pinned, ...sorted.filter((place) => place !== pinned)] : sorted;

  // Bản đồ hiển thị kết quả lọc, nếu không có kết quả thì hiển thị toàn bộ địa điểm.
  const mapPlaces = filtered.length > 0 ? filtered : allPlaces;
  const selected = mapPlaces.find((p) => p.id === selectedId || p.restaurant_id === selectedId) || mapPlaces[0];
  const hasLocation = mapPlaces.some(hasCoordinates);
  const mapSelection = hasCoordinates(selected) ? selected : mapPlaces.find(hasCoordinates);

  // Chọn quán trên bản đồ hoặc danh sách mà không làm mất bộ lọc của người dùng
  function selectPlace(place) {
    const matched = allPlaces.find((p) => p.restaurant_id === place.restaurant_id || p.id === place.id);
    setSelectedId(matched ? matched.id : place.id);
    list.current?.scrollTo({ top: 0, behavior: 'smooth' });
    map.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Gửi đề xuất quán mới, tải lại catalog rồi chọn quán vừa thêm.
  async function addProposal(proposal) {
    const place = await workspaceService.suggestRestaurant(proposal);
    await reload();
    setSelectedId(place.restaurant_id || place.id);
    setProposing(false);
    setNotice('Đã thêm địa điểm mới vào danh mục quán chay.');
  }

  // Danh sách khu vực có trong dữ liệu để dùng cho bộ lọc.
  const distinctCities = Array.from(new Set(allPlaces.map((p) => p.city).filter(Boolean)));

  return (
    <main className="cx-discovery-page cx-restaurants-page flex-grow-1">
      <section className="cx-restaurant-toolbar" aria-labelledby="restaurants-title">
        <div className="cx-restaurant-heading">
          <span className="cx-restaurant-heading-icon">
            <i className="bi bi-map-fill" aria-hidden="true" />
          </span>
          <div>
            <h1 id="restaurants-title">Bản Đồ Quán Chay & Nhà Hàng Minh Bạch</h1>
            <p>
              Phân loại: Thuần Chay, Chay Phật Giáo, Bếp Chay Riêng & Cửa Hàng Nguyên Liệu.
            </p>
          </div>
          <button
            className="cx-propose-button"
            type="button"
            disabled={!user}
            onClick={() => setProposing(true)}
            title={user ? 'Đề xuất quán mới' : 'Vui lòng đăng nhập để đề xuất quán'}
          >
            <i className="bi bi-plus-circle-fill" aria-hidden="true" /> Đề Xuất Quán Chay Mới
          </button>
        </div>
        <div className="cx-restaurant-controls">
          <div className="cx-discovery-search">
            <i className="bi bi-search" aria-hidden="true" />
            <label className="visually-hidden" htmlFor="restaurant-search">
              Tìm quán chay
            </label>
            <input
              id="restaurant-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên quán, món ăn (phở, lẩu, nấm)..."
              style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
            />
          </div>
          <label>
            <span className="visually-hidden">Phân loại quán</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="all">☀ Tất Cả Nhãn Minh Bạch</option>
              {restaurantTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">Khu vực</span>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              <option value="all">📍 Tất Cả Khu Vực ({distinctCities.length})</option>
              {distinctCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">Sắp xếp quán</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="rating">⭐ Đánh Giá Cao Nhất</option>
              {userLocation && <option value="distance">📍 Gần Vị Trí Của Bạn Nhất</option>}
              <option value="price">💵 Giá Món Thấp Nhất Trước</option>
              <option value="name">🔤 Tên Quán A – Z</option>
            </select>
          </label>
        </div>
        <p className="cx-restaurant-demo-note">
          <i className="bi bi-info-circle" aria-hidden="true" /> Khám phá quán chay theo khu vực.
          Đăng nhập để đề xuất địa điểm hoặc chia sẻ đánh giá.
        </p>
      </section>

      <NearbyPlaces
        onResults={setNearbyPlaces}
        onSelect={selectPlace}
        onUserLocationChange={setUserLocation}
        onSearchContextChange={setSearchContext}
      />

      {notice && (
        <div className="cx-restaurant-notice" role="status">
          {notice}
          <button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}

      <div className="cx-restaurant-workspace">
        <section className="cx-restaurant-list" aria-label="Danh sách quán chay" ref={list}>
          <p className="visually-hidden" role="status">
            Hiển thị {filtered.length} địa điểm phù hợp.
          </p>
          {filtered.map((place) => {
            const distance = place.user_distance_m ?? place.distance_m;
            return (
              <article
                className={`cx-restaurant-card ${selected?.id === place.id ? 'is-selected' : ''}`}
                key={place.id}
              >
                <div className="cx-restaurant-summary">
                  <RestaurantImage
                    src={resolveRestaurantPhoto(place)}
                    name={place.name}
                    alt={`Ảnh quán ${place.name}`}
                    type={place.type}
                    dietTypeId={place.diet_type_id}
                    isShop={place.isIngredientShop}
                    variant="card"
                  />
                  <div>
                    <span className={`cx-restaurant-type is-${place.type}`}>
                      {typeName(place.type)}
                    </span>
                    <h2>{place.name}</h2>
                    <p>
                      <i className="bi bi-geo-alt-fill" aria-hidden="true" /> {place.address}
                    </p>
                    <div className="cx-restaurant-meta">
                      <span>
                        <i className="bi bi-star-fill" aria-hidden="true" />{' '}
                        {place.rating ? `${Number(place.rating).toFixed(1)} (${place.reviews?.length || 0})` : 'Chưa đánh giá'}
                      </span>
                      <span>▣ {place.price_range || place.price || 'Theo thời giá'}</span>
                      <span>{place.city || 'Việt Nam'}</span>
                      {Number.isFinite(distance) && (
                        <span className="cx-dist-tag">
                          <i className="bi bi-geo" aria-hidden="true" /> {formatDistance(distance)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="cx-restaurant-kitchen">
                  <div>
                    <span>
                      🍳 Dụng cụ nấu riêng:{' '}
                      <strong>
                        {place.separate
                          ? '✓ Có bếp riêng'
                          : place.type === 'shop' || place.isIngredientShop
                            ? 'Cửa hàng'
                            : 'Chưa xác minh'}
                      </strong>
                    </span>
                    <span>⏰ {place.hours || 'Chưa cập nhật'}</span>
                  </div>
                  {(place.dishes || place.menu?.length > 0) && (
                    <p>
                      <strong>{place.type === 'shop' || place.isIngredientShop ? 'Sản phẩm:' : 'Món nổi bật:'}</strong>{' '}
                      {place.dishes || place.menu?.map((m) => m.name).join(', ')}
                    </p>
                  )}
                </div>
                <div className="cx-restaurant-card-actions">
                  <button
                    className="cx-restaurant-detail-button"
                    type="button"
                    onClick={() => setDetail(place)}
                  >
                    <i className="bi bi-info-circle" aria-hidden="true" /> Chi Tiết
                  </button>
                  <a
                    href={directions(place, userLocation)}
                    target="_blank"
                    rel="noreferrer"
                    title="Chỉ đường từ vị trí của bạn"
                  >
                    <i className="bi bi-sign-turn-right-fill" aria-hidden="true" /> Chỉ Đường
                  </a>
                  <button type="button" onClick={() => selectPlace(place)}>
                    <i className="bi bi-crosshair" aria-hidden="true" /> Xem Bản Đồ
                  </button>
                </div>
              </article>
            );
          })}
          {!filtered.length && (
            <div className="cx-discovery-empty">
              <i className="bi bi-shop" aria-hidden="true" />
              <h2>Chưa tìm thấy quán phù hợp</h2>
              <p>Thử đổi từ khóa hoặc mở rộng khu vực tìm kiếm.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCity('all');
                  setType('all');
                }}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </section>

        <section className="cx-restaurant-map" ref={map} aria-label="Bản đồ quán chay">
          <div className="cx-restaurant-map-heading">
            <strong>
              <i className="bi bi-crosshair" aria-hidden="true" /> Bản Đồ Quán Chay
            </strong>
            <span>
              {selected?.city || 'Toàn quốc'} · {mapPlaces.length} địa điểm hiển thị
            </span>
          </div>
          {hasLocation ? (
            <RestaurantMap
              places={mapPlaces}
              selected={mapSelection}
              onSelect={selectPlace}
              userLocation={userLocation}
              searchCenter={searchContext?.center}
              searchRadius={searchContext?.radius}
            />
          ) : (
            <div className="cx-map-no-results">
              <i className="bi bi-map" aria-hidden="true" />
              <p>Chọn bộ lọc khác hoặc dùng tính năng định vị để hiển thị địa điểm trên bản đồ.</p>
            </div>
          )}
        </section>
      </div>

      {detail && (
        <RestaurantDetail
          key={detail.id || detail.restaurant_id}
          place={allPlaces.find((p) => p.id === detail.id || p.restaurant_id === detail.restaurant_id) || detail}
          user={user}
          onClose={() => setDetail(null)}
          onReview={async (review) => {
            const targetId = detail.restaurant_id || detail.id;
            await workspaceService.reviewRestaurant(targetId, {
              stars: review.stars,
              text: review.text,
            });
            await reload();
          }}
        />
      )}

      {proposing && (
        <ContentDialog title="Đề Xuất Quán Chay Mới" onClose={() => setProposing(false)}>
          <RestaurantProposalForm onSubmit={addProposal} />
        </ContentDialog>
      )}
    </main>
  );
}
