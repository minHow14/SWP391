// D:/SWP391/SWP391/server/src/templates/passwordResetEmail.js
import { PASSWORD_RESET_OTP_DIGITS, PASSWORD_RESET_OTP_TTL_MINUTES } from '../constants/passwordReset.js';

const EMAIL_HTML = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Xác minh email | ChayXanh</title>
<style>@media only screen and (max-width:600px){.email-shell{padding:20px 12px!important}.email-body{padding:28px 24px!important}.otp-code{font-size:30px!important;letter-spacing:8px!important}}</style></head>
<body style="margin:0;padding:0;background:#f4f6f2;color:#20372b;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">Mã xác minh ChayXanh của bạn có hiệu lực trong ${PASSWORD_RESET_OTP_TTL_MINUTES} phút.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f2"><tr><td align="center" class="email-shell" style="padding:48px 20px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #dce5dc;border-top:4px solid #237447;border-radius:16px;overflow:hidden">
<tr><td class="email-body" style="padding:40px 44px">
<p style="margin:0 0 32px;color:#237447;font-size:23px;font-weight:700;letter-spacing:-0.6px">ChayXanh<span style="color:#8ba792">.</span></p>
<p style="margin:0 0 12px;color:#586f60;font-size:11px;font-weight:700;letter-spacing:1.8px">KHÔI PHỤC TÀI KHOẢN</p>
<h1 style="margin:0 0 18px;color:#20372b;font-size:28px;line-height:1.25;letter-spacing:-0.5px">Đặt lại mật khẩu</h1>
<p style="margin:0 0 26px;color:#526458;font-size:15px;line-height:1.7">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản ChayXanh của bạn. Nhập mã dưới đây trên màn hình xác minh để tiếp tục.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f6ef;border:1px solid #d7e5d6;border-radius:12px"><tr><td align="center" style="padding:24px 12px">
<p style="margin:0 0 12px;color:#526458;font-size:12px">Mã xác minh của bạn</p>
<p class="otp-code" dir="ltr" style="margin:0;color:#205f3b;font-family:'Courier New',monospace;font-size:36px;line-height:1.4;letter-spacing:10px;font-weight:700">{{otp}}</p>
</td></tr></table>
<p style="margin:18px 0 30px;color:#526458;font-size:13px;line-height:1.7">Có hiệu lực trong <strong style="color:#20372b">${PASSWORD_RESET_OTP_TTL_MINUTES} phút</strong> và chỉ dùng được một lần. Nếu yêu cầu mã mới, hãy sử dụng mã trong email mới nhất.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e6ebe4"><tr><td style="padding-top:24px">
<p style="margin:0 0 8px;color:#20372b;font-size:13px;font-weight:700">Giữ an toàn cho tài khoản</p>
<p style="margin:0;color:#65736a;font-size:13px;line-height:1.7">Không chia sẻ mã này với bất kỳ ai. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này; mật khẩu của bạn sẽ không thay đổi.</p>
</td></tr></table></td></tr></table>
<p style="max-width:480px;margin:20px auto 0;color:#65736a;font-size:12px;line-height:1.7">Email được gửi tự động từ ChayXanh. Vui lòng không trả lời email này.</p>
</td></tr></table></body></html>`;

export function createPasswordResetEmail({ otp }) {
  if (typeof otp !== 'string' || !new RegExp(`^\\d{${PASSWORD_RESET_OTP_DIGITS}}$`).test(otp)) {
    throw new TypeError('OTP phải gồm đúng sáu chữ số.');
  }
  return {
    subject: 'Mã xác minh đặt lại mật khẩu | ChayXanh',
    html: EMAIL_HTML.replace('{{otp}}', otp),
    text: [
      'ChayXanh — Đặt lại mật khẩu',
      'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản ChayXanh của bạn.',
      `Mã xác minh: ${otp}`,
      `Nhập mã trên màn hình xác minh để tiếp tục. Mã có hiệu lực trong ${PASSWORD_RESET_OTP_TTL_MINUTES} phút và chỉ dùng được một lần. Nếu yêu cầu mã mới, hãy sử dụng mã trong email mới nhất.`,
      'Không chia sẻ mã này với bất kỳ ai. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này; mật khẩu của bạn sẽ không thay đổi.',
      'Email được gửi tự động từ ChayXanh. Vui lòng không trả lời email này.',
    ].join('\n\n'),
  };
}
