// d:\Projects\FPT\SWP391\server\tests/authAndNotification.test.js
import './loadTestEnvironment.js';
import { describe, test, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

describe('Giai đoạn 1 & 2: Đổi mật khẩu, Lịch sử cân nặng & Hệ thống Thông báo', () => {
  let userToken;
  let testUserId;
  let anotherUserToken;
  let anotherUserId;
  let testPostId;

  test('setup test users and tokens', async () => {
    // 1. Đăng ký user chính
    const regUser1 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `test_auth_phase_${Date.now()}@test.com`,
        password: 'Password123!',
        full_name: 'Test Phase User 1',
      });
    expect(regUser1.status).toBe(201);
    userToken = regUser1.body.data.token || regUser1.body.data.accessToken;
    testUserId = regUser1.body.data.user.user_id;

    // Thiết lập chiều cao cho user1 để test tính BMI
    await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        health_profile: {
          height: 170,
          weight: 65,
        },
      });

    // 2. Đăng ký user thứ hai
    const regUser2 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `test_auth_phase2_${Date.now()}@test.com`,
        password: 'Password123!',
        full_name: 'Test Phase User 2',
      });
    expect(regUser2.status).toBe(201);
    anotherUserToken = regUser2.body.data.token || regUser2.body.data.accessToken;
    anotherUserId = regUser2.body.data.user.user_id;

    // User 1 đăng 1 bài blog
    const blogRes = await request(app)
      .post('/api/v1/blogs')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Bài viết kiểm thử thông báo',
        content: 'Nội dung kiểm thử thông báo hệ thống',
      });
    expect(blogRes.status).toBe(201);
    testPostId = blogRes.body.data.blog.post_id;
  });

  // --- KIỂM THỬ ĐỔI MẬT KHẨU ---
  test('rejects change password when old password is wrong', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        old_password: 'WrongPassword123!',
        new_password: 'NewValidPassword123!',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects change password when new password is too short', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        old_password: 'Password123!',
        new_password: 'short',
      });
    expect(res.status).toBe(400);
  });

  test('rejects change password when new password is same as old password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        old_password: 'Password123!',
        new_password: 'Password123!',
      });
    expect(res.status).toBe(400);
  });

  test('successfully changes password and allows login with new password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        old_password: 'Password123!',
        new_password: 'BrandNewPassword123!',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Lấy email user1
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userToken}`);
    const email = meRes.body.data.user.email;

    // Đăng nhập lại bằng mật khẩu mới
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email,
        password: 'BrandNewPassword123!',
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
  });

  // --- KIỂM THỬ LỊCH SỬ CÂN NẶNG & BMI ---
  test('records weight and calculates BMI automatically based on user height', async () => {
    const res = await request(app)
      .post('/api/v1/auth/me/weight')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        weight: 68.5,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // height = 170cm -> BMI = 68.5 / (1.7^2) = 23.7
    expect(res.body.data.record.bmi).toBe(23.7);
    expect(res.body.data.record.weight).toBe(68.5);
  });

  test('retrieves health history and current profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me/health-history')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.histories)).toBe(true);
    expect(res.body.data.histories.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.currentProfile.weight).toBe(68.5);
  });

  // --- KIỂM THỬ HỆ THỐNG THÔNG BÁO ---
  test('auto-triggers notification when another user comments on post', async () => {
    // User 2 bình luận vào bài viết của User 1
    const commentRes = await request(app)
      .post('/api/v1/comments')
      .set('Authorization', `Bearer ${anotherUserToken}`)
      .send({
        post_id: testPostId,
        content: 'Bài viết chia sẻ rất hữu ích, cảm ơn bạn!',
      });
    expect(commentRes.status).toBe(201);

    // Chờ 100ms để tác vụ notify hoàn tất
    await new Promise((r) => setTimeout(r, 100));

    // User 1 kiểm tra danh sách thông báo
    const notifRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userToken}`);
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.success).toBe(true);
    expect(notifRes.body.data.notifications.length).toBeGreaterThanOrEqual(1);
    expect(notifRes.body.data.unreadCount).toBeGreaterThanOrEqual(1);

    const firstNotif = notifRes.body.data.notifications[0];
    expect(firstNotif.content).toContain('đã bình luận vào bài viết của bạn');
    expect(firstNotif.is_read).toBe(false);

    // Đánh dấu 1 thông báo là đã đọc
    const readRes = await request(app)
      .patch(`/api/v1/notifications/${firstNotif.notification_id}/read`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.success).toBe(true);

    // Đánh dấu tất cả là đã đọc
    const readAllRes = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${userToken}`);
    expect(readAllRes.status).toBe(200);
    expect(readAllRes.body.success).toBe(true);
  });
});
