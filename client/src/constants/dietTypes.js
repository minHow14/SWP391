// client/src/constants/dietTypes.js
// Hằng số ánh xạ mã chế độ ăn (slug) sang ID trong cơ sở dữ liệu.
// Object.freeze để tránh vô tình sửa đổi giá trị dùng chung.
export const DIET_TYPE_IDS = Object.freeze({
  vegan: 1,
  lacto: 2,
  ovo: 3,
  'lacto-ovo': 4,
  buddhist: 5,
  explore: 6,
});
