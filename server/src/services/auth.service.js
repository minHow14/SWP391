// d:\Projects\FPT\SWP391\server\src\services\auth.service.js
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { userRepository } from '../repositories/user.repository.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyToken,
} from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';
import { ROLES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/status.js';

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

export function normalizeGender(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim().toUpperCase();
  if (!s) return null;
  if (['MALE', 'NAM', 'M'].includes(s)) return 'MALE';
  if (['FEMALE', 'NỮ', 'NU', 'F'].includes(s)) return 'FEMALE';
  if (['OTHER', 'KHÁC', 'KHAC', 'O'].includes(s)) return 'OTHER';
  throw ApiError.badRequest('Giới tính không hợp lệ (chấp nhận: Nam, Nữ, Khác hoặc MALE, FEMALE, OTHER)');
}

async function syncHealthProfileWeightHistory(userId, profile, tx) {
  if (profile.weight == null) return;
  const numericWeight = Number(profile.weight);
  if (numericWeight < 20 || numericWeight > 350) return;

  const latestHistories = await userRepository.getHealthHistories(userId, tx);
  const latest = latestHistories[0];
  if (latest && Number(latest.weight) === numericWeight) return;

  let calculatedBmi = null;
  const currentHeight = profile.height != null
    ? Number(profile.height)
    : (await userRepository.findHealthProfile(userId, tx))?.height;

  if (currentHeight && currentHeight > 0) {
    const heightMeters = currentHeight / 100;
    calculatedBmi = Number((numericWeight / (heightMeters * heightMeters)).toFixed(1));
  }

  await userRepository.addHealthHistory(
    userId,
    { weight: numericWeight, bmi: calculatedBmi, recorded_date: new Date() },
    tx
  );
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
          await userRepository.upsertProfilePreference(user_id, profile.health_goal, tx);
        }

        await syncHealthProfileWeightHistory(user_id, profile, tx);
      }

      if (allergy_ids !== undefined) {
        await userRepository.replaceAllergies(user_id, allergy_ids, tx);
      }
    });

    return this.getMe(user_id);
  },

  /**
   * Xác thực JWT Bearer token và trả về thông tin danh tính từ database
   */
  async authenticate(authorization) {
    if (!authorization) throw ApiError.unauthorized('Vui lòng đăng nhập để thực hiện chức năng này');
    const user = await userRepository.findAuthIdentityById(verifiedUserId(authorization));
    if (!user) throw ApiError.unauthorized('Tài khoản không tồn tại trên hệ thống');
    if (user.status !== USER_STATUS.ACTIVE || user.deleted_at) {
      throw ApiError.forbidden('Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động');
    }
    // Role lấy trực tiếp từ DB để đảm bảo việc phân quyền có hiệu lực ngay cả với token đã cấp
    return {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
    };
  },

  /**
   * Thay đổi mật khẩu tài khoản người dùng
   */
  async changePassword(userId, { old_password, oldPassword, current_password, currentPassword, new_password, newPassword }) {
    const user_id = Number(userId);
    const oldPass = currentPassword || current_password || oldPassword || old_password;
    const newPass = newPassword || new_password;

    if (!oldPass || !newPass) {
      throw ApiError.badRequest('Mật khẩu hiện tại và mật khẩu mới là bắt buộc');
    }

    if (newPass.length < 8) {
      throw ApiError.badRequest('Mật khẩu mới phải có tối thiểu 8 ký tự');
    }

    const user = await userRepository.findWithPasswordById(user_id);
    if (!user) {
      throw ApiError.notFound('Không tìm thấy tài khoản người dùng');
    }

    const isMatch = await comparePassword(oldPass, user.password_hash);
    if (!isMatch) {
      throw ApiError.badRequest('Mật khẩu hiện tại không chính xác');
    }

    if (oldPass === newPass) {
      throw ApiError.badRequest('Mật khẩu mới không được trùng với mật khẩu hiện tại');
    }

    const newHash = await hashPassword(newPass);
    await userRepository.updatePassword(user_id, newHash);

    return { message: 'Đổi mật khẩu thành công' };
  },

  /**
   * Ghi nhận cân nặng mới và lưu vào lịch sử theo dõi sức khỏe
   */
  async recordWeight(userId, { weight, recorded_date, recordedDate }) {
    const user_id = Number(userId);
    const numericWeight = Number(weight);
    if (!numericWeight || numericWeight < 20 || numericWeight > 350) {
      throw ApiError.badRequest('Cân nặng phải từ 20kg đến 350kg');
    }

    const dateVal = recorded_date || recordedDate || new Date();

    return prisma.$transaction(async (tx) => {
      // 1. Đọc chiều cao từ health_profile để tự động tính chỉ số BMI
      const profile = await userRepository.findHealthProfile(user_id, tx);
      let calculatedBmi = null;
      if (profile?.height && profile.height > 0) {
        const heightMeters = profile.height / 100;
        calculatedBmi = Number((numericWeight / (heightMeters * heightMeters)).toFixed(1));
      }

      // 2. Thêm vào bảng health_histories qua repository
      const record = await userRepository.addHealthHistory(
        user_id,
        { weight: numericWeight, bmi: calculatedBmi, recorded_date: dateVal },
        tx
      );

      // 3. Cập nhật cân nặng mới nhất vào bảng health_profiles qua repository
      await userRepository.upsertHealthProfile(user_id, { weight: numericWeight }, tx);

      return {
        ...record,
        height: profile?.height || null,
        bmi: calculatedBmi,
      };
    });
  },

  /**
   * Lấy lịch sử theo dõi cân nặng và chỉ số BMI của người dùng
   */
  async getHealthHistory(userId) {
    const user_id = Number(userId);
    const [profile, histories] = await Promise.all([
      userRepository.findHealthProfile(user_id),
      userRepository.getHealthHistories(user_id),
    ]);

    return {
      currentProfile: profile ? {
        height: profile.height,
        weight: profile.weight,
        diet_type: profile.diet_type?.name || null,
        health_goal: profile.health_goal,
      } : null,
      histories: histories.map((h) => ({
        history_id: h.history_id,
        weight: h.weight,
        bmi: h.bmi,
        recorded_date: h.recorded_date,
      })),
    };
  },
};

export const authenticationService = authService;
