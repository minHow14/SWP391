// D:/SWP391/SWP391/client/test/databaseProviderUser.test.jsx
// Kiểm thử DatabaseProvider đồng bộ hồ sơ người dùng từ server: thay hồ sơ cũ trong phiên, làm mới khi có sự kiện và không ghi đè token/phiên mới.
import { useContext } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DatabaseProvider } from '../src/context/DatabaseProvider.jsx';
import { DatabaseContext } from '../src/context/databaseContext.js';
import { authService } from '../src/services/authService.js';
import { workspaceService } from '../src/services/workspaceService.js';
import { emitSyncEvent } from '../src/utils/syncEvents.js';
import { getSession, setSession } from '../src/utils/session.js';

// Hồ sơ cũ lưu trong phiên (thiếu số đo) và hồ sơ mới từ server (đủ số đo) của cùng một người dùng.
const stale = { user_id: 10, health_profile: { height: null, weight: null } };
const fresh = { user_id: 10, health_profile: { height: 163, weight: 63 } };
// Render context của DatabaseProvider để đọc giá trị user hiện tại.
const mount = () => renderHook(() => useContext(DatabaseContext), { wrapper: DatabaseProvider });

// Mỗi test bắt đầu với phiên chứa hồ sơ cũ; server trả hồ sơ mới.
beforeEach(() => {
  setSession({ token: 'member', user: stale });
  vi.spyOn(workspaceService, 'getCatalog').mockResolvedValue({});
  vi.spyOn(authService, 'getMe').mockResolvedValue({ data: { user: fresh } });
});
afterEach(() => { cleanup(); setSession(null); vi.restoreAllMocks(); });

// Khi tải, hồ sơ cũ trong phiên phải được thay bằng hồ sơ mới nhất từ server.
it('replaces the stale session profile with the server profile on load', async () => {
  const { result } = mount();
  await waitFor(() => expect(result.current.user.health_profile.height).toBe(163));
});

// Sự kiện USER_CHANGED từ nơi khác phải kích hoạt tải lại hồ sơ.
it('refreshes the profile when the user data changes elsewhere', async () => {
  authService.getMe.mockResolvedValueOnce({ data: { user: stale } });
  const { result } = mount();
  await waitFor(() => expect(authService.getMe).toHaveBeenCalledTimes(1));
  await act(async () => { emitSyncEvent('USER_CHANGED', { userId: 10 }); });
  await waitFor(() => expect(result.current.user.health_profile.weight).toBe(63));
});

// Tải lại hồ sơ thất bại thì giữ nguyên hồ sơ hiện tại.
it('keeps the current profile when refreshing fails', async () => {
  authService.getMe.mockRejectedValue(new Error('offline'));
  const { result } = mount();
  await act(async () => { await result.current.refreshUser(); });
  expect(result.current.user).toEqual(stale);
});

// Áp dụng hồ sơ mới nhưng không khôi phục token đã hết hạn, giữ token vừa được refresh trong lúc gọi API.
it('applies a refreshed profile without restoring the expired access token', async () => {
  authService.getMe.mockImplementation(async () => {
    setSession({ ...getSession(), token: 'refreshed-access' });
    return { data: { user: fresh } };
  });
  const { result } = mount();
  await waitFor(() => expect(result.current.user.health_profile.weight).toBe(63));
  expect(getSession().token).toBe('refreshed-access');
});

// Hồ sơ đến muộn sau khi người dùng chủ động đăng nhập lại (cùng tài khoản) phải bị bỏ qua để không ghi đè phiên mới.
it('ignores a late profile after explicit login to the same account', async () => {
  let complete;
  authService.getMe.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
  const { result } = mount();
  await act(async () => {
    setSession({ token: 'new-login', user: stale }, { remember: false });
    complete({ data: { user: fresh } });
  });
  expect(result.current.user).toEqual(stale);
  expect(getSession().token).toBe('new-login');
});
