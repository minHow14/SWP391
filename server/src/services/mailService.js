// D:/SWP391/SWP391/server/src/services/mailService.js
import nodemailer from 'nodemailer';
import { getPasswordResetConfig } from '../config/passwordResetConfig.js';
import { ApiError } from '../utils/apiError.js';
import { createPasswordResetEmail } from '../templates/passwordResetEmail.js';

const SMTP_TIMEOUT_MS = 10000;

function unavailable() {
  return Object.assign(new ApiError(503, 'Dịch vụ đặt lại mật khẩu chưa sẵn sàng. Vui lòng thử lại sau.'), {
    errorCode: 'PASSWORD_RESET_UNAVAILABLE',
  });
}

export const mailService = {
  async ensureAvailable() {
    try {
      const config = getPasswordResetConfig();
      const transport = nodemailer.createTransport({
        host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE,
        requireTLS: true, auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
        connectionTimeout: SMTP_TIMEOUT_MS, greetingTimeout: SMTP_TIMEOUT_MS,
        socketTimeout: SMTP_TIMEOUT_MS, dnsTimeout: SMTP_TIMEOUT_MS,
        disableFileAccess: true, disableUrlAccess: true,
      });
      await transport.verify();
      return { transport, from: config.SMTP_FROM, clientUrl: config.CLIENT_URL, ttlMinutes: config.PASSWORD_RESET_TTL_MINUTES };
    } catch {
      throw unavailable();
    }
  },

  async sendPasswordReset({ delivery, to, otp }) {
    const result = await delivery.transport.sendMail({
      from: { name: 'ChayXanh', address: delivery.from }, to,
      ...createPasswordResetEmail({ otp }),
    });
    if (!result.accepted?.some((address) => String(address).toLowerCase() === to.toLowerCase())) throw unavailable();
  },
};
