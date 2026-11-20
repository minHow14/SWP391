// D:/SWP391/SWP391/client/test/authService.test.js
// Kiểm thử (node:test) authService: đổi mật khẩu, ghi nhận cân nặng, lấy lịch sử sức khỏe và các hàm định dạng liên quan.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../src/services/authService.js';
import apiClient from '../src/services/apiClient.js';

// Lưu adapter gốc của axios để khôi phục sau mỗi test.
const originalAdapter = apiClient.defaults.adapter;

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

// authService phải có đủ các hàm mà màn hình tài khoản và theo dõi cân nặng đang sử dụng.
test('authService defines all required authentication and health history API methods', () => {
  assert.equal(typeof authService.changePassword, 'function');
  assert.equal(typeof authService.recordWeight, 'function');
  assert.equal(typeof authService.getHealthHistory, 'function');
});

// changePassword gửi POST đúng route; body kèm cả currentPassword và oldPassword để tương thích với backend.
test('changePassword dispatches POST to /v1/auth/change-password with correct payload', async () => {
  let capturedConfig = null;
  // Thay adapter để bắt cấu hình request và trả response giả.
  apiClient.defaults.adapter = async (config) => {
    capturedConfig = config;
    return {
      data: { success: true, message: 'Đổi mật khẩu thành công.' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  const result = await authService.changePassword({
    currentPassword: 'oldPassword123',
    newPassword: 'newPassword456',
  });

  assert.equal(capturedConfig.method.toLowerCase(), 'post');
  assert.equal(capturedConfig.url, '/v1/auth/change-password');
  const body = JSON.parse(capturedConfig.data);
  assert.equal(body.currentPassword, 'oldPassword123');
  assert.equal(body.oldPassword, 'oldPassword123');
  assert.equal(body.newPassword, 'newPassword456');
  assert.equal(result.message, 'Đổi mật khẩu thành công.');
});

// Mốc thời gian recordedAt do nơi gọi truyền vào phải được gửi dưới tên chuẩn recordedDate mà backend chấp nhận.
test('recordWeight preserves a recordedAt caller timestamp through the backend recordedDate contract', async () => {
  let capturedConfig = null;
  apiClient.defaults.adapter = async (config) => {
    capturedConfig = config;
    return {
      data: {
        success: true,
        data: {
          history: { weight: 68.5, bmi: 22.4 },
          profile: { weight: 68.5, bmi: 22.4 },
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  const result = await authService.recordWeight({ weight: 68.5, recordedAt: '2026-10-23T08:00:00Z' });

  assert.equal(capturedConfig.method.toLowerCase(), 'post');
  assert.equal(capturedConfig.url, '/v1/auth/me/weight');
  const body = JSON.parse(capturedConfig.data);
  assert.equal(body.weight, 68.5);
  assert.equal(body.recordedDate, '2026-10-23T08:00:00Z');
  assert.equal('recordedAt' in body, false);
  assert.equal(result.data.history.weight, 68.5);
});

// Gửi một lần ghi nhận cân nặng qua adapter giả và trả về body đã gửi đi.
async function submittedWeight(values) {
  let body;
  apiClient.defaults.adapter = async (config) => {
    body = JSON.parse(config.data);
    return { config, status: 200, headers: {}, data: { success: true, data: {} } };
  };
  await authService.recordWeight(values);
  return body;
}

// Cả recordedDate và recorded_date đều phải được chuẩn hóa thành recordedDate để không bị backend validate loại bỏ.
for (const field of ['recordedDate', 'recorded_date']) {
  test(`recordWeight sends ${field} input as canonical recordedDate without losing it in BE validation`, async () => {
    const timestamp = '2026-10-23T08:00:00Z';
    const body = await submittedWeight({ weight: 68.5, [field]: timestamp });
    assert.deepEqual(body, { weight: 68.5, recordedDate: timestamp });
  });
}

// Khi có nhiều tên trường thời gian, recordedDate (tên chuẩn) được ưu tiên hơn các tên cũ.
test('recordWeight prefers canonical recordedDate over legacy timestamp aliases', async () => {
  const body = await submittedWeight({ weight: 68.5, recordedDate: '2026-11-03T08:00:00Z',
    recordedAt: '2026-10-23T08:00:00Z', recorded_date: '2026-10-22T08:00:00Z' });
  assert.deepEqual(body, { weight: 68.5, recordedDate: '2026-11-03T08:00:00Z' });
});

// Ghi nhận cho hôm nay thì không gửi mốc thời gian, để backend tự dùng thời điểm hiện tại.
test('recordWeight omits the timestamp when the caller records today', async () => {
  assert.deepEqual(await submittedWeight({ weight: 68.5 }), { weight: 68.5 });
});

// getHealthHistory gửi GET đúng route kèm tham số phân trang.
test('getHealthHistory dispatches GET to /v1/auth/me/health-history with params', async () => {
  let capturedConfig = null;
  apiClient.defaults.adapter = async (config) => {
    capturedConfig = config;
    return {
      data: {
        success: true,
        data: {
          histories: [{ history_id: 1, weight: 70, bmi: 23.1 }],
          currentProfile: { weight: 70, bmi: 23.1 },
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  const result = await authService.getHealthHistory({ limit: 10, offset: 0 });

  assert.equal(capturedConfig.method.toLowerCase(), 'get');
  assert.equal(capturedConfig.url, '/v1/auth/me/health-history');
  assert.equal(capturedConfig.params.limit, 10);
  assert.equal(result.data.histories.length, 1);
});

// Bản sao logic tách mảng lịch sử từ nhiều dạng envelope khác nhau của WeightTracker để kiểm tra độc lập.
test('WeightTracker extracts history array accurately from API response envelopes', () => {
  const envelopeWithHistories = {
    success: true,
    data: {
      histories: [{ history_id: 1, weight: 58, bmi: 19.4, recorded_date: '2026-10-25' }],
      currentProfile: { height: 173, weight: 58 },
    },
  };

  const extractHistory = (response) => {
    return Array.isArray(response?.data?.histories)
      ? response.data.histories
      : Array.isArray(response?.histories)
      ? response.histories
      : Array.isArray(response?.data?.history)
      ? response.data.history
      : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
      ? response
      : [];
  };

  const extracted = extractHistory(envelopeWithHistories);
  assert.equal(extracted.length, 1);
  assert.equal(extracted[0].weight, 58);
});

// formatRecordedDateTime hiển thị giờ địa phương cho timestamp thật, còn bản ghi chỉ có ngày thì không hiện giờ 07:00 giả.
test('formatRecordedDateTime handles pure date and timestamp correctly without bogus 07:00', async () => {
  const { formatRecordedDateTime } = await import('../src/utils/formatters.js');

  // Timestamp thực tế (04:25 UTC -> 11:25 Asia/Bangkok)
  const formattedTimestamp = formatRecordedDateTime('2026-10-25T04:25:00.000Z');
  assert.ok(formattedTimestamp.includes('11:25'));
  assert.ok(formattedTimestamp.includes('25/10/2026'));

  // Bản ghi cũ thuần DATE (00:00:00 UTC) -> chỉ hiển thị ngày, không hiện 07:00
  const formattedPureDate = formatRecordedDateTime('2026-10-25T00:00:00.000Z');
  assert.equal(formattedPureDate, '25/10/2026');
  assert.ok(!formattedPureDate.includes('07:00'));
});
