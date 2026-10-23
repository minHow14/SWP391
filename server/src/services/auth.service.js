// d:\Projects\FPT\SWP391\server\src\services\auth.service.js
import prisma from '../config/prisma.js';
import { userRepository } from '../repositories/user.repository.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';
import { ROLES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/status.js';

export function normalizeGender(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim().toUpperCase();
  if (!s) return null;
  if (['MALE', 'NAM', 'M'].includes(s)) return 'MALE';
  if (['FEMALE', 'NỮ', 'NU', 'F'].includes(s)) return 'FEMALE';
  if (['OTHER', 'KHÁC', 'KHAC', 'O'].includes(s)) return 'OTHER';
  throw ApiError.badRequest('Giới tính không hợp lệ (chấp nhận: Nam, Nữ, Khác hoặc MALE, FEMALE, OTHER)');
}

export const authService = {
  /**
   * Đăng ký tài khoản người dùng mới
   */
  async register({ email, password, full_name }) {
    const cleanEmail = email?.trim().toLowerCase();
    const cleanName = full_name?.trim();

    if (!cleanEmail || !password || !cleanName) {
      throw ApiError.badRequest('Email, mật khẩu và họ tên là bắt buộc');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw ApiError.badRequest('Định dạng email không hợp lệ');
    }

    if (password.length < 8) {
      throw ApiError.badRequest('Mật khẩu phải có độ dài tối thiểu 8 ký tự');
    }

    // Kiểm tra email trùng lặp qua repository
    const existingUser = await userRepository.findByEmail(cleanEmail);
    if (existingUser) {
      throw ApiError.conflict('Email này đã được đăng ký trong hệ thống');
    }

    // Mã hóa mật khẩu
    const password_hash = await hashPassword(password);

    // Tạo người dùng mới trong database qua repository
    const newUser = await userRepository.create(
      {
        email: cleanEmail,
        password_hash,
        full_name: cleanName,
        role: ROLES.USER,
        status: USER_STATUS.ACTIVE,
      },
      {
        user_id: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        created_at: true,
      }
    );

    // Tạo JWT Access Token và Refresh Token
    const token = generateToken({
      user_id: newUser.user_id,
      email: newUser.email,
      role: newUser.role,
    });
    const refreshToken = generateRefreshToken({
      user_id: newUser.user_id,
      email: newUser.email,
      role: newUser.role,
    });

    return {
      user: newUser,
      token,
      accessToken: token,
      refreshToken,
    };
  },

  /**
   * Đăng nhập người dùng bằng email và mật khẩu
   */
  async login({ email, password }) {
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail || !password) {
      throw ApiError.badRequest('Email và mật khẩu là bắt buộc');
    }

    const user = await userRepository.findByEmailWithPassword(cleanEmail);

    if (!user) {
      throw ApiError.unauthorized('Email hoặc mật khẩu không chính xác');
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw ApiError.forbidden('Tài khoản đã bị khóa hoặc ngừng hoạt động');
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized('Email hoặc mật khẩu không chính xác');
    }

    const token = generateToken({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
      },
      token,
      accessToken: token,
      refreshToken,
    };
  },

  /**
   * Làm mới Access Token bằng Refresh Token
   */
  async refreshToken(rawRefreshToken) {
    if (!rawRefreshToken) {
      throw ApiError.unauthorized('Refresh token không tồn tại');
    }
    let decoded;
    try {
      decoded = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw ApiError.unauthorized('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    }
    const user = await userRepository.findAuthIdentityById(decoded.user_id);
    if (!user || user.status !== USER_STATUS.ACTIVE || user.deleted_at) {
      throw ApiError.unauthorized('Tài khoản không hợp lệ hoặc đã bị khóa');
    }
    const accessToken = generateToken({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    });
    return {
      accessToken,
      token: accessToken,
    };
  },

  /**
   * Lấy thông tin hồ sơ người dùng đang đăng nhập
   */
  async getMe(userId) {
    const user = await userRepository.findById(userId, {
      user_id: true,
      email: true,
      full_name: true,
      role: true,
      status: true,
      created_at: true,
      health_profile: {
        include: {
          diet_type: true,
        },
      },
      allergies: {
        select: { ingredient_id: true, ingredient: { select: { name: true } } },
        orderBy: { ingredient_id: 'asc' },
      },
    });

    if (!user) {
      throw ApiError.notFound('Không tìm thấy thông tin người dùng');
    }

    return user;
  },

  /**
   * Cập nhật thông tin hồ sơ, sức khỏe, dị ứng có transaction
   */
  async updateMe(userId, { full_name, health_profile, allergy_ids }) {
    const user_id = Number(userId);

    await prisma.$transaction(async (tx) => {
      if (health_profile?.diet_type_id != null) {
        const diet = await userRepository.findDietTypeById(health_profile.diet_type_id, tx);
        if (!diet) {
          throw ApiError.badRequest('Chế độ ăn không tồn tại');
        }
      }

      if (allergy_ids !== undefined) {
        const count = await userRepository.countIngredients(allergy_ids, tx);
        if (count !== allergy_ids.length) {
          throw ApiError.badRequest('Nguyên liệu dị ứng không tồn tại');
        }
      }

      if (full_name !== undefined) {
        await userRepository.update(user_id, { full_name }, null, tx);
      }

      if (health_profile !== undefined) {
        const profile = { ...health_profile };
        if (profile.dob !== undefined) {
          profile.dob = profile.dob === null ? null : new Date(profile.dob);
        }
        if (profile.gender !== undefined) {
          profile.gender = normalizeGender(profile.gender);
        }
        await userRepository.upsertHealthProfile(user_id, profile, tx);

        if (profile.health_goal !== undefined) {
          await tx.profilePreference.upsert({
            where: { user_id },
            create: { user_id, goal: profile.health_goal },
            update: { goal: profile.health_goal },
          });
        }
      }

      if (allergy_ids !== undefined) {
        await userRepository.replaceAllergies(user_id, allergy_ids, tx);
      }
    });

    return this.getMe(user_id);
  },
};
