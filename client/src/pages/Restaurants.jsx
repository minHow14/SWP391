import { useRef, useState } from 'react';
import { restaurantTypes } from '../lib/restaurantLabels.js';
import { useDatabase } from '../lib/databaseContext.js';
import { api } from '../lib/api.js';
import { normalizeSearch } from '../lib/recipeFilters.js';
import ContentImage from '../components/ContentImage.jsx';
import ContentDialog from '../components/ContentDialog.jsx';
import RestaurantDetail from '../components/RestaurantDetail.jsx';
import NearbyPlaces from '../components/NearbyPlaces.jsx';
import RestaurantMap from '../components/RestaurantMap.jsx';
import { hasCoordinates, restaurantDirections } from '../lib/restaurantDirections.js';
import '../Discovery.css';

const typeName = (type) => type === 'external' ? 'Quán từ ZIOMAP' : restaurantTypes.find((item) => item.id === type)?.name || type;
const directions = restaurantDirections;

export default function Restaurants() {
  const {data,user,reload}=useDatabase();
  const places=data.restaurants;
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [city, setCity] = useState('all');
  const [sort, setSort] = useState('rating');
  const [selectedId, setSelectedId] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [popupOpen, setPopupOpen] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState(null);
  const map = useRef(null);
  const search = normalizeSearch(query.trim());
  const filtered = places.filter((place) => (type === 'all' || place.type === type) && (city === 'all' || place.city === city) && normalizeSearch(`${place.name} ${place.address} ${place.dishes}`).includes(search)).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'vi') : sort === 'price' ? a.price.length - b.price.length : b.rating - a.rating);
  const visibleNearby = nearbyPlaces.filter(place => (type === 'all' || place.type === type) && (city === 'all' || place.city === city) && normalizeSearch(`${place.name} ${place.address}`).includes(search));
  const mapPlaces = [...filtered, ...visibleNearby];
  const selected = mapPlaces.find((place) => place.id === selectedId) || mapPlaces[0];
  const hasLocation = mapPlaces.some(hasCoordinates);
  const mapSelection = hasCoordinates(selected) ? selected : mapPlaces.find(hasCoordinates);

  function selectPlace(place) {
    if (place.source === 'ziomap') { setQuery(''); setType('all'); setCity('all'); }
    setSelectedId(place.id);
    setPopupOpen(true);
    map.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function addProposal(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const proposalCity = values.get('city');
    const name = values.get('name').trim();
    const address = values.get('address').trim();
    if (!name || !address) return;
    try{const place=await api('/workspace/restaurants',{method:'POST',body:{name,address,city:proposalCity,diet_type_id:values.get('type')==='buddhist'?5:values.get('type')==='separate'?4:1,latitude:values.get('latitude')?Number(values.get('latitude')):null,longitude:values.get('longitude')?Number(values.get('longitude')):null}});await reload();setQuery('');setType('all');setCity('all');setSelectedId(place.restaurant_id);setPopupOpen(true);setProposing(false);setNotice('Đã thêm địa điểm mới.');}catch(e){setNotice(e.message);}
  }

  return (
    <main className="cx-discovery-page cx-restaurants-page flex-grow-1">
      <section className="cx-restaurant-toolbar" aria-labelledby="restaurants-title">
        <div className="cx-restaurant-heading"><span className="cx-restaurant-heading-icon"><i className="bi bi-map-fill" aria-hidden="true" /></span><div><h1 id="restaurants-title">Bản Đồ Quán Chay & Nhà Hàng Minh Bạch</h1><p>Phân loại: Thuần Chay, Chay Phật Giáo, Bếp Chay Riêng & Cửa Hàng Nguyên Liệu.</p></div><button className="cx-propose-button" type="button" disabled={!user} onClick={() => setProposing(true)}><i className="bi bi-plus-circle-fill" aria-hidden="true" /> Đề Xuất Quán Chay Mới</button></div>
        <div className="cx-restaurant-controls">
          <div className="cx-discovery-search"><i className="bi bi-search" aria-hidden="true" /><label className="visually-hidden" htmlFor="restaurant-search">Tìm quán chay</label><input id="restaurant-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên quán, địa chỉ, món ăn..." /></div>
          <label><span className="visually-hidden">Phân loại quán</span><select value={type} onChange={(event) => { setType(event.target.value); setPopupOpen(true); }}><option value="all">☀ Tất Cả Nhãn Minh Bạch</option>{restaurantTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span className="visually-hidden">Khu vực</span><select value={city} onChange={(event) => { setCity(event.target.value); setPopupOpen(true); }}><option value="all">📍 Tất Cả Khu Vực</option>{Array.from(new Set(places.map(place=>place.city))).map(city=><option key={city}>{city}</option>)}</select></label>
          <label><span className="visually-hidden">Sắp xếp quán</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="rating">⭐ Đánh Giá Cao Nhất</option><option value="price">💵 Giá Thấp Trước</option><option value="name">🔤 Tên Quán A – Z</option></select></label>
        </div>
        <p className="cx-restaurant-demo-note"><i className="bi bi-info-circle" aria-hidden="true" /> Khám phá quán chay theo khu vực. Đăng nhập để đề xuất địa điểm hoặc chia sẻ đánh giá.</p>
      </section>
      <NearbyPlaces onResults={setNearbyPlaces} onSelect={selectPlace} />
      {notice && <div className="cx-restaurant-notice" role="status">{notice}<button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}
      <div className="cx-restaurant-workspace">
        <section className="cx-restaurant-list" aria-label="Danh sách quán chay"><p className="visually-hidden" role="status">Hiển thị {filtered.length} địa điểm phù hợp.</p>{filtered.map((place) => <article className={`cx-restaurant-card ${selected?.id === place.id ? 'is-selected' : ''}`} key={place.id}>
          <div className="cx-restaurant-summary"><ContentImage src={place.image} alt="Ảnh không gian hoặc món ăn minh họa" /><div><span className={`cx-restaurant-type is-${place.type}`}>{typeName(place.type)}</span><h2>{place.name}</h2><p><i className="bi bi-geo-alt-fill" aria-hidden="true" /> {place.address}</p><div className="cx-restaurant-meta"><span><i className="bi bi-star-fill" aria-hidden="true" /> {place.rating ? `${place.rating} (${place.reviews.length})` : 'Chưa đánh giá'}</span><span>▣ {place.price}</span><span>{place.proposed ? 'Đề xuất mới' : place.city}</span></div></div></div>
          <div className="cx-restaurant-kitchen"><div><span>🍳 Dụng cụ nấu riêng: <strong>{place.separate ? '✓ Có bếp riêng' : place.type === 'shop' ? 'Cửa hàng' : 'Chưa xác minh'}</strong></span><span>⏰ {place.hours}</span></div><p><strong>{place.type === 'shop' ? 'Sản phẩm:' : 'Món nổi bật:'}</strong> {place.dishes}</p></div>
          <div className="cx-restaurant-card-actions"><button className="cx-restaurant-detail-button" type="button" onClick={() => setDetail(place)}><i className="bi bi-info-circle" aria-hidden="true" /> Chi Tiết</button><a href={directions(place)} target="_blank" rel="noreferrer"><i className="bi bi-sign-turn-right-fill" aria-hidden="true" /> Chỉ Đường</a><button type="button" onClick={() => selectPlace(place)}><i className="bi bi-crosshair" aria-hidden="true" /> Xem Bản Đồ</button></div>
        </article>)}{!filtered.length && <div className="cx-discovery-empty"><i className="bi bi-shop" aria-hidden="true" /><h2>Chưa tìm thấy quán phù hợp</h2><p>Thử đổi từ khóa hoặc khu vực.</p><button type="button" onClick={() => { setQuery(''); setCity('all'); setType('all'); }}>Xóa bộ lọc</button></div>}</section>
        <section className="cx-restaurant-map" ref={map} aria-label="Bản đồ quán chay"><div className="cx-restaurant-map-heading"><strong><i className="bi bi-crosshair" aria-hidden="true" /> Bản Đồ Quán Chay</strong><span>{selected?.city || 'Không có địa điểm'} · {mapPlaces.length} kết quả</span></div>
          {hasLocation ? <><RestaurantMap places={mapPlaces} selected={mapSelection} onSelect={selectPlace} /><button type="button" className="cx-map-reopen" onClick={() => setPopupOpen(!popupOpen)} aria-expanded={popupOpen}><i className="bi bi-geo-alt-fill" aria-hidden="true" /> {popupOpen ? 'Ẩn thông tin quán' : 'Xem thông tin quán'}</button>{popupOpen && <article className="cx-map-place-popup"><button type="button" className="cx-map-popup-close" aria-label="Đóng thông tin trên bản đồ" onClick={() => setPopupOpen(false)}>×</button><div className="cx-map-popup-photo"><ContentImage src={selected.image} alt="Ảnh minh họa quán đang chọn" />{selected.rating > 0 && <span>⭐ {selected.rating}</span>}</div><div className="cx-map-popup-body"><small>{typeName(selected.type)}</small><h2>{selected.name}</h2><p>📍 {selected.address}</p><div><span>◷ {selected.hours}</span><span>Địa điểm</span></div><a href={directions(selected)} target="_blank" rel="noreferrer">🧭 Chỉ đường tới quán</a></div></article>}</> : <div className="cx-map-no-results"><i className="bi bi-map" aria-hidden="true" /><p>Chọn bộ lọc khác để hiển thị địa điểm trên bản đồ.</p></div>}
        </section>
      </div>
      {detail && <RestaurantDetail key={detail.id} place={places.find(p=>p.id===detail.id)||detail} user={user} onClose={() => setDetail(null)} onReview={async(review)=>{await api(`/workspace/restaurants/${detail.id}/reviews`,{method:'POST',body:{stars:review.stars,text:review.text}});await reload();}} />}
      {proposing && <ContentDialog title="Đề Xuất Quán Chay Mới" onClose={() => setProposing(false)}><form className="cx-proposal-form" onSubmit={addProposal}><p>Chia sẻ địa điểm bạn yêu thích với cộng đồng. Có thể để trống tọa độ nếu chưa xác định.</p><label>Tên quán<input name="name" required maxLength={120} placeholder="Tên quán chay" /></label><label>Địa chỉ<input name="address" required maxLength={220} placeholder="Số nhà, đường, quận..." /></label><div><label>Khu vực<select name="city">{Array.from(new Set(places.map(place=>place.city))).map(city=><option key={city}>{city}</option>)}</select></label><label>Phân loại<select name="type">{restaurantTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><label>Vĩ độ<input name="latitude" type="number" min="-90" max="90" step="any" /></label><label>Kinh độ<input name="longitude" type="number" min="-180" max="180" step="any" /></label><button type="submit">Lưu Quán Chay</button></form></ContentDialog>}
    </main>
  );
}
