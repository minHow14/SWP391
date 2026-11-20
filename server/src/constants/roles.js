// d:\Projects\FPT\SWP391\server\src\constants\roles.js
// Định nghĩa mã vai trò người dùng và hàm tra tên vai trò.
/**
 * Định nghĩa vai trò người dùng (Roles) trong hệ thống
 */
export const ROLES = Object.freeze({
  ADMIN: 1,
  USER: 2,
});

// Ánh xạ mã vai trò sang tên để hiển thị/trả về API.
export const ROLE_NAMES = Object.freeze({
  [ROLES.ADMIN]: 'ADMIN',
  [ROLES.USER]: 'USER',
});

/**
 * Lấy tên vai trò từ mã số role
 * @param {number} roleId Mã vai trò
 * @returns {string}
 */
export const getRoleName = (roleId) => {
  return ROLE_NAMES[roleId] || 'UNKNOWN';
};
