// D:/SWP391/SWP391/server/tests/restaurantClassification.test.js
// Kiểm thử tích hợp (cần DB test) phân loại nhà hàng chay và cửa hàng nguyên liệu khi người dùng đề xuất địa điểm.
import './loadTestEnvironment.js';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { findNearbyLocal } from '../src/services/places.service.js';

// Tiền tố tên dùng để nhận diện và dọn dữ liệu test.
const FIXTURE_PREFIX = `restaurant-classification-${randomUUID()}`;
let member;
let authorization;

// Tạo payload đề xuất địa điểm hợp lệ với tên duy nhất.
// @param overrides các trường ghi đè
// @returns payload gửi lên API
function proposal(overrides = {}) {
  return {
    name: `${FIXTURE_PREFIX}-${randomUUID()}`, address: 'Isolated test database address',
    city: 'Test fixture city', diet_type_id: 1, latitude: 10.77, longitude: 106.7,
    ...overrides,
  };
}

// Gửi đề xuất địa điểm, mặc định có đăng nhập.
// @param payload dữ liệu đề xuất
// @param options.authenticated có gửi header Authorization hay không
function submit(payload, { authenticated = true } = {}) {
  const operation = request(app).post('/api/v1/workspace/restaurants');
  return (authenticated ? operation.set('Authorization', authorization) : operation).send(payload);
}

// Lấy địa điểm theo ID từ catalog công khai để kiểm tra dữ liệu sau khi tải lại.
async function catalogPlace(id) {
  const response = await request(app).get('/api/v1/workspace/catalog');
  expect(response.status).toBe(200);
  return response.body.data.restaurants.find((place) => place.restaurant_id === id);
}

// Tạo thành viên test và header đăng nhập.
beforeAll(async () => {
  member = await prisma.user.create({ data: {
    email: `${FIXTURE_PREFIX}@example.invalid`, full_name: 'Restaurant classification test',
    password_hash: 'unused-integration-test-hash',
  } });
  authorization = `Bearer ${generateToken({ user_id: member.user_id, role: member.role })}`;
});

// Xóa địa điểm test sau mỗi test; xóa user và đóng DB khi xong.
afterEach(() => prisma.restaurant.deleteMany({ where: { name: { startsWith: FIXTURE_PREFIX } } }));
afterAll(async () => {
  if (member) await prisma.user.delete({ where: { user_id: member.user_id } });
  await prisma.$disconnect();
});

// Nhóm test: phân loại nhà hàng và cửa hàng nguyên liệu.
describe('restaurant and ingredient-shop classification', () => {
  // Cửa hàng nguyên liệu được lưu không kèm chế độ ăn bịa ra (diet_type_id = null) và hiển thị lại với type "shop".
  it('persists an ingredient shop without inventing a vegan diet and reloads it as a shop', async () => {
    const response = await submit(proposal({ isIngredientShop: true, diet_type_id: null }));
    expect(response.status).toBe(200);
    const saved = response.body.data;
    expect(saved).toMatchObject({ isIngredientShop: true, diet_type_id: null });
    const stored = await prisma.restaurant.findUnique({ where: { restaurant_id: saved.restaurant_id } });
    expect(stored).toMatchObject({ isIngredientShop: true, diet_type_id: null });
    expect(await catalogPlace(saved.restaurant_id)).toMatchObject({
      isIngredientShop: true, type: 'shop', diet_type_id: null,
    });
  });

  // Thông tin vận hành (điện thoại, giờ mở cửa, giá, bếp riêng) phải được lưu khi người dùng cung cấp.
  it('persists operational and vegan details when supplied in proposal', async () => {
    const payload = proposal({
      phone: '0901234567',
      hours: '07:00 - 21:00',
      price_range: '30.000đ - 60.000đ',
      separate_kitchen: true,
      diet_type_id: 1,
    });
    const response = await submit(payload);
    expect(response.status).toBe(200);
    const saved = response.body.data;
    const restaurant = await prisma.restaurant.findUnique({
      where: { restaurant_id: saved.restaurant_id },
    });
    expect(restaurant).toMatchObject({
      phone: '0901234567',
      city: 'Test fixture city',
      hours: '07:00 - 21:00',
      priceRange: '30.000đ - 60.000đ',
      separateKitchen: true,
    });
  });

  // Client cũ không gửi cờ cửa hàng thì địa điểm vẫn được phân loại theo chế độ ăn như trước (tương thích ngược).
  it.each([[1, 'vegan'], [5, 'buddhist'], [4, 'separate']])(
    'keeps legacy diet %s classified as %s when the caller omits the shop flag', async (dietId, type) => {
      const response = await submit(proposal({ diet_type_id: dietId }));
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ isIngredientShop: false, diet_type_id: dietId });
      expect(await catalogPlace(response.body.data.restaurant_id)).toMatchObject({
        isIngredientShop: false, type, diet_type_id: dietId,
      });
    }
  );

  // Danh sách gần đây (nearby) từ DB local phải giữ đúng nhận diện cửa hàng.
  it('preserves shop identity in the local nearby mapping', async () => {
    const response = await submit(proposal({ isIngredientShop: true, diet_type_id: null }));
    expect(response.status).toBe(200);
    const nearby = await findNearbyLocal({ lat: 10.77, lng: 106.7, radiusKm: 1 });
    expect(nearby.find((place) => place.restaurant_id === response.body.data.restaurant_id))
      .toMatchObject({ isIngredientShop: true, diet_type_id: null });
  });

  // Phân loại mâu thuẫn (cửa hàng có chế độ ăn, nhà hàng thiếu chế độ ăn, cờ kiểu chuỗi) bị từ chối trước khi ghi DB.
  it.each([
    { isIngredientShop: true, diet_type_id: 1 },
    { isIngredientShop: false, diet_type_id: null },
    { isIngredientShop: 'true', diet_type_id: null },
  ])('rejects inconsistent classification before writing: %j', async (classification) => {
    const payload = proposal(classification);
    const response = await submit(payload);
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(await prisma.restaurant.count({ where: { name: payload.name } })).toBe(0);
  });

  // Đề xuất cửa hàng yêu cầu đăng nhập.
  it('requires authentication for shop proposals', async () => {
    const response = await submit(proposal({ isIngredientShop: true, diet_type_id: null }), { authenticated: false });
    expect(response.status).toBe(401);
  });
});
