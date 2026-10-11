/**
 * Định nghĩa vai trò người dùng (Roles) trong hệ thống
 */
export const ROLES = Object.freeze({
  ADMIN: 1,
  USER: 2,
});

export const ROLE_NAMES = Object.freeze({
  [ROLES.ADMIN]: 'ADMIN',
  [ROLES.USER]: 'USER',
});

/**
 * Lấy tên vai trò từ mã số role
 * @param {number} roleId 
 * @returns {string}
 */
export const getRoleName = (roleId) => {
  return ROLE_NAMES[roleId] || 'UNKNOWN';
};
