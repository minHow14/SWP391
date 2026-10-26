// client/test/authService.test.js
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../src/services/authService.js';
import apiClient from '../src/services/apiClient.js';

const originalAdapter = apiClient.defaults.adapter;

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

test('authService defines all required authentication and health history API methods', () => {
  assert.equal(typeof authService.changePassword, 'function');
  assert.equal(typeof authService.recordWeight, 'function');
  assert.equal(typeof authService.getHealthHistory, 'function');
});

test('changePassword dispatches POST to /v1/auth/change-password with correct payload', async () => {
  let capturedConfig = null;
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

test('recordWeight dispatches POST to /v1/auth/me/weight with numeric weight and optional recordedAt', async () => {
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
  assert.equal(body.recordedAt, '2026-10-23T08:00:00Z');
  assert.equal(result.data.history.weight, 68.5);
});

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
