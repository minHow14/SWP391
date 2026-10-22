// client/src/features/restaurants/components/RestaurantDetail.jsx
import { useState } from 'react';
import ContentDialog from '../../../components/common/ContentDialog.jsx';
import ContentImage from '../../../components/common/ContentImage.jsx';
import { restaurantTypes } from '../../../constants/restaurantLabels.js';
import { restaurantDirections } from '../../../utils/restaurantDirections.js';

const money = (value) => `${value.toLocaleString('vi-VN')}đ`;

export default function RestaurantDetail({ place, user, onReview, onClose }) {
  const [stars, setStars] = useState(5);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const allReviews = place.reviews;
  const menu = place.menu;
  const priceRange = place.price_range;
  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(place.address);
      setNotice('Đã sao chép địa chỉ.');
    } catch {
      setNotice('Không thể sao chép tự động. Bạn có thể chọn và sao chép dòng địa chỉ phía trên.');
    }
  }
  async function submitReview(event) {
    event.preventDefault();
    if (!text.trim()) { setNotice('Vui lòng nhập nội dung đánh giá.'); return; }
    try{await onReview({stars,text:text.trim()});setText('');setNotice('Đã gửi đánh giá của bạn.');}catch(e){setNotice(e.message);}
  }
  return <ContentDialog title={`Chi tiết ${place.name}`} onClose={onClose} className="cx-restaurant-detail-dialog" hideHeader>
    <div className="cx-restaurant-detail-hero"><ContentImage src={place.image} alt="Ảnh minh họa không gian hoặc món ăn của quán" /><button type="button" className="cx-detail-close" onClick={onClose} aria-label="Đóng chi tiết quán">×</button><div><span>{restaurantTypes.find((item) => item.id === place.type)?.name}</span><h2>{place.name}</h2></div></div>
    <div className="cx-restaurant-detail-body">
      <div className="cx-detail-stats">{[['star-fill', 'Đánh giá chung', place.rating ? `${place.rating} / 5.0` : 'Chưa đánh giá'], ['clock-fill', 'Giờ mở cửa', place.hours], ['tag-fill', 'Mức giá trung bình', place.proposed ? 'Chưa cập nhật' : priceRange]].map(([icon, label, value]) => <div key={label}><i className={`bi bi-${icon}`} aria-hidden="true" /><span><small>{label}</small><strong>{value}</strong></span></div>)}</div>
      <div className="cx-detail-address"><div><i className="bi bi-geo-alt-fill" aria-hidden="true" /><p><strong>Địa chỉ:</strong><span>{place.address}</span></p></div><div className="cx-detail-address-actions"><a href={restaurantDirections(place)} target="_blank" rel="noreferrer"><i className="bi bi-sign-turn-right-fill" aria-hidden="true" /> Chỉ Đường Google Maps</a><span><i className="bi bi-telephone-fill" aria-hidden="true" /> {place.phone || 'Chưa có số liên hệ'}</span><button type="button" onClick={copyAddress}><i className="bi bi-copy" aria-hidden="true" /> Sao Chép Địa Chỉ</button></div></div>
      <section className="cx-detail-menu"><h3><i className="bi bi-fork-knife" aria-hidden="true" /> {place.type === 'shop' ? 'Sản Phẩm Nổi Bật' : 'Món Ăn Nổi Bật Được Đề Xuất'}</h3><div>{menu.map((item) => <div key={item.name}><strong>{item.name}</strong><span>{item.price ? money(item.price) : 'Chưa cập nhật giá'}</span></div>)}</div>{!menu.length && <p>Quán chưa cập nhật thực đơn.</p>}</section>
      <section className="cx-detail-reviews"><div className="cx-detail-reviews-title"><h3><i className="bi bi-chat-fill" aria-hidden="true" /> Đánh Giá Từ Cộng Đồng ({allReviews.length})</h3><span>Trải nghiệm thực tế</span></div>{allReviews.map((review) => <article key={review.id}><span className="cx-review-avatar"><i className="bi bi-person-fill" aria-hidden="true" /></span><div><header><strong>{review.name}</strong><span>★ {review.stars}/5</span></header><p>{review.text}</p><small>{new Date(review.date).toLocaleDateString("vi-VN")}</small></div></article>)}{!allReviews.length && <p>Chưa có đánh giá. Thêm trải nghiệm đầu tiên của bạn.</p>}</section>
      <form className="cx-detail-review-form" onSubmit={submitReview}><h3>Viết Đánh Giá Của Bạn</h3><label>Số sao:<select value={stars} onChange={(event) => setStars(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{'★'.repeat(value)} ({value}/5)</option>)}</select></label><label className="visually-hidden" htmlFor="restaurant-review">Nội dung đánh giá</label><textarea id="restaurant-review" value={text} onChange={(event) => setText(event.target.value)} required maxLength={1000} placeholder="Chia sẻ trải nghiệm về không gian, thái độ phục vụ và hương vị món ăn..." rows={3} /><div><button type="submit" disabled={!user}>Gửi Đánh Giá</button></div></form>
      {notice && <p className="cx-detail-notice" role="status">{notice}</p>}
      <p className="cx-detail-disclaimer">Liên hệ quán để biết thực đơn và giờ mở cửa mới nhất.</p>
    </div><footer className="cx-restaurant-detail-footer"><button type="button" onClick={onClose}>Đóng</button></footer>
  </ContentDialog>;
}
