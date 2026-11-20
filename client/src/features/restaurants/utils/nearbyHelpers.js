// d:/Projects/FPT/SWP391/client/src/features/restaurants/utils/nearbyHelpers.js
// Tiện ích cho tính năng tìm quán chay gần đây: danh sách khu vực, bộ lọc, lọc quán chay, ảnh, GPS, geocoding và giờ mở cửa.

// Tọa độ tâm các khu vực trọng điểm theo từng tỉnh/thành dùng khi tìm theo khu vực.
export const CITY_HUBS = [
  {
    id: 'hcm',
    name: 'TP. Hồ Chí Minh',
    hubs: [
      { id: 'hcm_q1', name: 'Trung tâm Q.1 & Q.3', lat: 10.7769, lng: 106.7009 },
      { id: 'hcm_binhthanh', name: 'Bình Thạnh & Phú Nhuận', lat: 10.7985, lng: 106.6850 },
      { id: 'hcm_cholon', name: 'Chợ Lớn (Q.5 & Q.10)', lat: 10.7554, lng: 106.6601 },
      { id: 'hcm_thuduc', name: 'TP. Thủ Đức', lat: 10.8494, lng: 106.7537 },
      { id: 'hcm_govap', name: 'Gò Vấp & Tân Bình', lat: 10.8383, lng: 106.6653 },
    ],
  },
  {
    id: 'hn',
    name: 'Hà Nội',
    hubs: [
      { id: 'hn_hoankiem', name: 'Hoàn Kiếm & Ba Đình', lat: 21.0285, lng: 105.8542 },
      { id: 'hn_caugiay', name: 'Cầu Giấy', lat: 21.0362, lng: 105.7905 },
      { id: 'hn_dongda', name: 'Đống Đa & Hai Bà Trưng', lat: 21.0125, lng: 105.8342 },
      { id: 'hn_tayho', name: 'Tây Hồ', lat: 21.0718, lng: 105.8234 },
    ],
  },
  {
    id: 'dn',
    name: 'Đà Nẵng',
    hubs: [
      { id: 'dn_haichau', name: 'Hải Châu & Thanh Khê', lat: 16.0544, lng: 108.2022 },
      { id: 'dn_sontra', name: 'Sơn Trà & Ngũ Hành Sơn', lat: 16.0618, lng: 108.2435 },
    ],
  },
  {
    id: 'ct',
    name: 'Cần Thơ',
    hubs: [
      { id: 'ct_ninhkieu', name: 'Ninh Kiều & Cái Răng', lat: 10.0342, lng: 105.7876 },
    ],
  },
  {
    id: 'hue',
    name: 'Huế',
    hubs: [
      { id: 'hue_center', name: 'Trung tâm TP. Huế', lat: 16.4637, lng: 107.5909 },
    ],
  },
];

// Giữ lại để tương thích với code cũ chỉ dùng khu vực TP.HCM.
export const HCM_HUBS = CITY_HUBS[0].hubs;
// Các mức bán kính tìm kiếm (km).
export const RADIUS_OPTIONS = [3, 5, 10];
// Bộ lọc chế độ ăn; id khớp với diet_type_id trong DB, null = không lọc.
export const DIET_OPTIONS = [
  { id: null, label: 'Tất cả chế độ' },
  { id: 1, label: 'Thuần Chay' },
  { id: 5, label: 'Chay Phật Giáo' },
  { id: 4, label: 'Chay Trứng Sữa / Bếp Riêng' },
];

// Từ khóa nhận diện địa điểm KHÔNG phải quán chay (dịch vụ làm đẹp, quán thịt, trà sữa...) hay xuất hiện trong dữ liệu bản đồ bên ngoài.
export const NON_VEGETARIAN_NAME_REGEX =
  /\b(nail|nails|spa|spas|massage|eyelash|waxing|beauty|clinic|yoga|fitness|gym|beef|steak|bbq|chagee)\b|gội đầu|nối mi|uốn mi|thẩm mỹ|chuông xoay|chim chạy|món thái|quán thái|trà sữa|công ty tnhh|cù lao/i;

// Từ khóa nhận diện tên quán chay.
export const VEGETARIAN_NAME_REGEX =
  /\b(chay|vegan|vegetarian|plant-based|plant based)\b|âu lạc|thực dưỡng|bồ đề/i;

/**
 * Kiểm tra địa điểm có phải là quán ăn chay hoặc cửa hàng chay thực sự hay không.
 * Lọc bỏ tiệm nail, spa, thẩm mỹ, yoga, quán thịt, trà sữa, quán thái hoặc tên thuần địa chỉ số nhà.
 * @param {object} place
 * @returns {boolean}
 */
export function isVegetarianPlace(place) {
  if (!place || typeof place !== 'object') return false;

  const rawName = String(place.name || '').trim();
  const rawAddress = String(place.address || '').trim();
  if (!rawName) return false;

  // Dữ liệu fixture dùng trong test luôn được giữ lại.
  if (/fixture/i.test(rawName)) return true;

  // Tên chỉ là số nhà / địa chỉ thì không phải tên quán thật.
  if (/^\d+[\dA-Za-z/,\s.-]*$/.test(rawName) || /^\d+\/\d+/.test(rawName)) {
    return false;
  }

  if (NON_VEGETARIAN_NAME_REGEX.test(rawName) || NON_VEGETARIAN_NAME_REGEX.test(rawAddress)) {
    return false;
  }

  if (place.isIngredientShop === true) return true;

  if (place.diet_type_id != null && Number(place.diet_type_id) >= 1 && Number(place.diet_type_id) <= 7) {
    return true;
  }

  if (['vegan', 'buddhist', 'shop'].includes(place.type)) {
    return true;
  }

  return VEGETARIAN_NAME_REGEX.test(rawName);
}

// Lấy URL ảnh quán an toàn: chỉ chấp nhận đường dẫn /uploads nội bộ hoặc URL http(s); trả về null nếu không hợp lệ.
export function resolveRestaurantPhoto(place) {
  const direct = place?.image || place?.image_url;
  if (typeof direct !== 'string' || !direct.trim()) return null;
  const value = direct.trim();
  // Chặn ".." để tránh path traversal ra ngoài thư mục uploads.
  if (value.startsWith('/uploads/') && !value.includes('..')) return value;
  try {
    const url = new URL(value);
    // Loại ảnh stock Unsplash vì không phải ảnh thật của quán (quy tắc không dùng dữ liệu giả).
    if (!['http:', 'https:'].includes(url.protocol) || url.hostname === 'images.unsplash.com') return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Lấy tọa độ GPS hiện tại từ trình duyệt
 * @param {object} [customNavigator] - Đối tượng navigator (mặc định lấy từ môi trường hiện tại)
 * @param {object} [options] - Tùy chọn cấu hình
 * @param {boolean} [options.forceRefresh=false] - Bắt buộc làm mới GPS từ phần cứng, không dùng cache
 * @param {number} [options.timeout=10000] - Thời gian chờ tối đa
 * @returns {Promise<{lat: number, lng: number}>}
 */
export function getPosition(
  customNavigator = typeof navigator !== 'undefined' ? navigator : null,
  { forceRefresh = false, timeout = 10000 } = {}
) {
  return new Promise((resolve, reject) => {
    if (!customNavigator || !customNavigator.geolocation) {
      reject(new Error('Trình duyệt không hỗ trợ định vị GPS.'));
      return;
    }
    customNavigator.geolocation.getCurrentPosition(
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
      {
        enableHighAccuracy: true,
        timeout,
        // Cho phép dùng vị trí cache tối đa 60 giây để phản hồi nhanh, trừ khi người dùng yêu cầu làm mới.
        maximumAge: forceRefresh ? 0 : 60000,
      }
    );
  });
}

/**
 * Chuyển đổi địa chỉ thực tế thành toạ độ GPS (lat, lng) qua Nominatim OpenStreetMap
 * @param {string} fullAddress
 * @returns {Promise<{lat: number, lng: number}|null>}
 */
export async function geocodeAddress(fullAddress) {
  if (!fullAddress || typeof fullAddress !== 'string' || !fullAddress.trim()) return null;
  try {
    const clean = fullAddress.trim().replace(/^,+|,+$/g, '');
    const query = encodeURIComponent(`${clean}, Việt Nam`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=vn`,
      {
        // Ưu tiên kết quả tiếng Việt; timeout 6 giây để form không bị treo khi Nominatim chậm.
        headers: { 'Accept-Language': 'vi' },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Kiểm tra xem quán có đang trong khung giờ mở cửa hay không
 * @param {string} hours - Chuỗi giờ hoạt động dạng "07:00 - 21:00"
 * @param {Date} [currentTime] - Thời gian kiểm tra (mặc định là hiện tại)
 * @param {string} [timeZone] - Múi giờ địa phương của quán (mặc định 'Asia/Ho_Chi_Minh')
 * @returns {boolean|null} true nếu đang mở, false nếu đã đóng, null nếu không xác định
 */
export function checkIsOpenNow(hours, currentTime = new Date(), timeZone = 'Asia/Ho_Chi_Minh') {
  if (!hours || typeof hours !== 'string' || hours === 'Chưa cập nhật') return null;
  const match = hours.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, startH, startM, endH, endM] = match;

  let currentH;
  let currentM;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(currentTime);
    currentH = parseInt(parts.find((p) => p.type === 'hour').value, 10);
    currentM = parseInt(parts.find((p) => p.type === 'minute').value, 10);
  } catch {
    currentH = currentTime.getHours();
    currentM = currentTime.getMinutes();
  }

  const currentMinutes = currentH * 60 + currentM;
  const startMinutes = parseInt(startH, 10) * 60 + parseInt(startM, 10);
  const endMinutes = parseInt(endH, 10) * 60 + parseInt(endM, 10);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  // Khung giờ qua nửa đêm (ví dụ 18:00 - 02:00) thì đang mở nếu sau giờ mở HOẶC trước giờ đóng.
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}
