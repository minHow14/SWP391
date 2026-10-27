// d:\Projects\FPT\SWP391\server\src\utils\jwt.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';

/**
 * Sinh chuỗi JSON Web Token truy cập (Access Token)
 * @param {object} payload - Dữ liệu nhúng vào token (user_id, email, role)
 * @returns {string} token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Sinh chuỗi Refresh Token dài hạn
 * @param {object} payload
 * @returns {string}
 */
export const generateRefreshToken = (payload) => {
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET || `${config.jwt.secret}_refresh`;
  return jwt.sign(payload, refreshSecret, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  });
};

/**
 * Xác thực và giải mã JSON Web Token
 * @param {string} token
 * @returns {object} decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

/**
 * Xác thực Refresh Token
 * @param {string} token
 * @returns {object}
 */
export const verifyRefreshToken = (token) => {
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET || `${config.jwt.secret}_refresh`;
  return jwt.verify(token, refreshSecret);
};

/**
 * Băm mật khẩu người dùng bằng bcrypt
 * @param {string} password
 * @returns {Promise<string>}
 */
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * So sánh mật khẩu người dùng với chuỗi băm
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

