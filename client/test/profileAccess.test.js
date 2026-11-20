// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/profileAccess.test.js
// Kiểm thử (node:test) điều hướng sau đăng nhập/đăng ký và điều kiện số đo để bật tính năng BMI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAuthDestination } from '../src/features/auth/utils/authRedirect.js';
import { hasBodyMeasurements } from '../src/features/profile/utils/healthProfile.js';
import { profileValues } from '../src/features/profile/utils/profileValues.js';

// Đăng ký xong mở trang thiết lập hồ sơ (không bắt buộc), đăng nhập thì về trang chủ; admin luôn vào trang quản trị.
test('registration opens optional profile setup while login keeps its destination', () => {
  const user = { role: 0 };
  assert.equal(getAuthDestination({ user, isRegister: true }), '/ho-so?setup=1');
  assert.equal(getAuthDestination({ user, isRegister: false }), '/');
  assert.equal(getAuthDestination({ user: { role: 1 }, isRegister: false }), '/admin');
  assert.equal(getAuthDestination({ user: { role: 1 }, isRegister: true }), '/admin');
});

// Thiếu hoặc sai số đo (0, âm, NaN, chuỗi rỗng...) thì không được bật tính năng BMI.
test('missing or invalid measurements cannot enable BMI features', () => {
  for (const profile of [null, undefined, {}, { height: 170 }, { weight: 65 }]) {
    assert.equal(hasBodyMeasurements(profile), false);
  }
  for (const invalid of [null, undefined, '', ' ', 0, -1, NaN, Infinity, 'invalid', true, []]) {
    assert.equal(hasBodyMeasurements({ height: invalid, weight: 65 }), false);
    assert.equal(hasBodyMeasurements({ height: 170, weight: invalid }), false);
  }
});

// BMI chỉ cần chiều cao và cân nặng (kể cả dạng chuỗi số), không cần dị ứng hay các trường tùy chọn khác.
test('BMI needs measurements without requiring an allergy or all optional fields', () => {
  assert.equal(hasBodyMeasurements({ height: 170, weight: 65 }), true);
  assert.equal(hasBodyMeasurements({ height: '170', weight: '65' }), true);
});

// Tài khoản mới có hồ sơ rỗng, không tự điền giá trị sức khỏe hay dị ứng giả.
test('new account profile stays empty without fabricated health values or allergies', () => {
  const values = profileValues({ full_name: '', health_profile: null, allergies: [] });
  assert.equal(values.height, '');
  assert.equal(values.weight, '');
  assert.equal(values.dob, '');
  assert.equal(values.gender, '');
  assert.deepEqual(values.allergy_ids, []);
});
