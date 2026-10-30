// client/src/context/DatabaseProvider.jsx
import { useEffect, useState, useCallback } from 'react';
import { workspaceService } from '../services/workspaceService.js';
import { authService } from '../services/authService.js';
import { getSession, setSession } from '../utils/session.js';
import { DatabaseContext } from './databaseContext.js';
import { subscribeSyncEvent } from '../utils/syncEvents.js';

export function DatabaseProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState(() => getSession()?.user || null);

  const reload = useCallback(async () => {
    try {
      const catalog = await workspaceService.getCatalog();
      setData(catalog);
      setError('');
      return catalog;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    workspaceService
      .getCatalog({ signal: controller.signal })
      .then((catalog) => {
        setData(catalog);
        setError('');
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);

  // Hồ sơ trong session có thể cũ (đăng nhập, sửa ở tab khác) nên lấy lại từ server khi cần.
  const refreshUser = useCallback(async () => {
    const session = getSession();
    if (!session?.token) return;
    try {
      const result = await authService.getMe();
      const fetchedUser = result?.user || result?.data?.user;
      if (fetchedUser && getSession()?.token === session.token) setSession({ ...session, user: fetchedUser });
    } catch {
      // Giữ nguyên hồ sơ hiện có nếu không tải lại được.
    }
  }, []);

  useEffect(() => {
    const sync = () => setUser(getSession()?.user || null);
    window.addEventListener('chayxanh-session', sync);
    refreshUser();
    return () => window.removeEventListener('chayxanh-session', sync);
  }, [refreshUser]);

  useEffect(() => subscribeSyncEvent('USER_CHANGED', refreshUser), [refreshUser]);

  // Lắng nghe sự kiện đồng bộ để tự động cập nhật catalog ngay khi có thay đổi (cross-tab / cross-component)
  useEffect(() => {
    const unsubscribe = subscribeSyncEvent('*', async () => {
      try {
        await reload();
      } catch {
        // Tự động bỏ qua lỗi nền nếu có
      }
    });
    return unsubscribe;
  }, [reload]);

  return (
    <DatabaseContext.Provider value={{ data, error, user, reload, refreshUser }}>
      {children}
    </DatabaseContext.Provider>
  );
}
