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
export const RADIUS_OPTIONS = [3, 5, 10, 20];
export const DIET_OPTIONS = [
  { id: null, label: 'Tất cả chế độ' },
  { id: 1, label: 'Thuần Chay' },
  { id: 5, label: 'Chay Phật Giáo' },
  { id: 4, label: 'Chay Trứng Sữa / Bếp Riêng' },
];

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
