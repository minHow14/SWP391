import prisma from '../config/prisma.js';
import { hashPassword, comparePassword, generateToken } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';
import { ROLES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/status.js';

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

    if (password.length < 6) {
      throw ApiError.badRequest('Mật khẩu phải có độ dài tối thiểu 6 ký tự');
    }

    // Kiểm tra email trùng lặp
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      throw ApiError.conflict('Email này đã được đăng ký trong hệ thống');
    }

    // Mã hóa mật khẩu
    const password_hash = await hashPassword(password);

    // Tạo người dùng mới trong database
    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        password_hash,
        full_name: cleanName,
        role: ROLES.USER,
        status: USER_STATUS.ACTIVE,
      },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        created_at: true,
      },
    });

    // Tạo JWT token
    const token = generateToken({
      user_id: newUser.user_id,
      email: newUser.email,
      role: newUser.role,
    });

    return {
      user: newUser,
      token,
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

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

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
    };
  },

  /**
   * Lấy thông tin hồ sơ người dùng đang đăng nhập
   */
  async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { user_id: Number(userId) },
      select: {
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
      },
    });

    if (!user) {
      throw ApiError.notFound('Không tìm thấy thông tin người dùng');
    }

    return user;
  },

  async updateMe(userId, { full_name, health_profile, allergy_ids }) {
    const user_id = Number(userId);
    await prisma.$transaction(async tx => {
      if (health_profile?.diet_type_id != null && !await tx.dietType.findUnique({ where: { diet_type_id: health_profile.diet_type_id } })) {
        throw ApiError.badRequest('Chế độ ăn không tồn tại');
      }
      if (allergy_ids !== undefined) {
        const count = await tx.ingredient.count({ where: { ingredient_id: { in: allergy_ids } } });
        if (count !== allergy_ids.length) throw ApiError.badRequest('Nguyên liệu dị ứng không tồn tại');
      }
      if (full_name !== undefined) await tx.user.update({ where: { user_id }, data: { full_name } });
      if (health_profile !== undefined) {
        const profile = { ...health_profile };
        if (profile.dob !== undefined) profile.dob = profile.dob === null ? null : new Date(profile.dob);
        await tx.healthProfile.upsert({ where: { user_id }, create: { user_id, ...profile }, update: profile });
        if (profile.health_goal !== undefined) await tx.$executeRaw`UPDATE profile_preferences SET goal=${profile.health_goal} WHERE user_id=${user_id}`;
      }
      if (allergy_ids !== undefined) {
        await tx.userAllergy.deleteMany({ where: { user_id } });
        if (allergy_ids.length) await tx.userAllergy.createMany({ data: allergy_ids.map(ingredient_id => ({ user_id, ingredient_id })) });
      }
    });
    return this.getMe(user_id);
  },
};

