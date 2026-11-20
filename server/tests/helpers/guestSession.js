// D:/SWP391/SWP391/server/tests/helpers/guestSession.js
// Helper tạo phiên khách (guest) cho test: gọi /api/ai/usage để server cấp cookie guestId.
import assert from 'node:assert/strict';
import request from 'supertest';

// Tạo agent supertest giữ cookie và trả về guestId đã cấp.
// @param app ứng dụng Express cần test
// @returns {{ agent, guestId }} agent giữ cookie phiên khách và mã khách dạng "guest:..."
export async function createGuestSession(app) {
  const agent = request.agent(app);
  const response = await agent.get('/api/ai/usage');
  assert.equal(response.status, 200);
  assert.match(response.body.data.guestId, /^guest:/);
  return { agent, guestId: response.body.data.guestId };
}
