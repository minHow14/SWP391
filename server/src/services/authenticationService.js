// D:/SWP391/SWP391/server/src/services/authenticationService.js
import { z } from 'zod';
import { USER_STATUS } from '../constants/status.js';
import { userRepository } from '../repositories/user.repository.js';
import { ApiError } from '../utils/apiError.js';
import { verifyToken } from '../utils/jwt.js';

const MAX_USER_ID = 2_147_483_647;
const tokenClaimsSchema = z.object({ user_id: z.number().int().positive().max(MAX_USER_ID) });

function verifiedUserId(authorization) {
  const match = typeof authorization === 'string' && /^Bearer\s+(\S+)$/i.exec(authorization);
  if (!match) throw ApiError.unauthorized('Token xác thực không hợp lệ');
  let decoded;
  try {
    decoded = verifyToken(match[1]);
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw ApiError.unauthorized('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    throw ApiError.unauthorized('Token không hợp lệ hoặc đã bị chỉnh sửa');
  }
  const result = tokenClaimsSchema.safeParse(decoded);
  if (!result.success) throw ApiError.unauthorized('Token xác thực không hợp lệ');
  return result.data.user_id;
}

export const authenticationService = {
  async authenticate(authorization) {
    if (!authorization) throw ApiError.unauthorized('Vui lòng đăng nhập để thực hiện chức năng này');
    const user = await userRepository.findAuthIdentityById(verifiedUserId(authorization));
    if (!user) throw ApiError.unauthorized('Tài khoản không tồn tại trên hệ thống');
    if (user.status !== USER_STATUS.ACTIVE || user.deleted_at) {
      throw ApiError.forbidden('Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động');
    }
    // Role phải lấy từ DB để việc đổi quyền có hiệu lực với cả token đã cấp.
    return { user_id: user.user_id, email: user.email, full_name: user.full_name, role: user.role, status: user.status };
  },
};
