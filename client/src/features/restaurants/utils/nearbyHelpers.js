// client/src/features/restaurants/utils/nearbyHelpers.js

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

export const HCM_HUBS = CITY_HUBS[0].hubs;
export const RADIUS_OPTIONS = [3, 5, 10];
export const DIET_OPTIONS = [
  { id: null, label: 'Tất cả chế độ' },
  { id: 1, label: 'Thuần Chay' },
  { id: 5, label: 'Chay Phật Giáo' },
  { id: 4, label: 'Chay Trứng Sữa / Bếp Riêng' },
];

export const SAMPLE_RESTAURANT_PHOTOS = [
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
];

/**
 * Lấy ảnh mẫu quán chay chất lượng cao theo seed (tên hoặc ID quán)
 * @param {string|number} seed
 * @returns {string} URL ảnh mẫu
 */
export function getSampleRestaurantPhoto(seed = '') {
  const str = String(seed ?? '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return SAMPLE_RESTAURANT_PHOTOS[Math.abs(hash) % SAMPLE_RESTAURANT_PHOTOS.length];
}

/**
 * Lấy ảnh của quán chay: nếu quán có ảnh thì lấy ảnh thật của quán, nếu không có ảnh thì lấy ảnh mẫu
 * @param {object} place
 * @returns {string} URL ảnh của quán hoặc ảnh mẫu
 */
export function resolveRestaurantPhoto(place) {
  if (!place) return SAMPLE_RESTAURANT_PHOTOS[0];
  const direct = place.image || place.image_url;
  if (typeof direct === 'string' && direct.trim().length > 0) {
    return direct.trim();
  }
  return getSampleRestaurantPhoto(place.name || place.id || place.restaurant_id);
}

/**
 * Lấy tọa độ GPS hiện tại từ trình duyệt
 * @param {object} [customNavigator] - Đối tượng navigator (mặc định lấy từ môi trường hiện tại)
 * @returns {Promise<{lat: number, lng: number}>}
 */
export function getPosition(customNavigator = typeof navigator !== 'undefined' ? navigator : null) {
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
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
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}
