// D:/SWP391/SWP391/client/src/context/DatabaseProvider.jsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { workspaceService } from '../services/workspaceService.js';
import { authService } from '../services/authService.js';
import { getSession, getSessionSnapshot, setSession } from '../utils/session.js';
import { DatabaseContext } from './databaseContext.js';
import { subscribeSyncEvent } from '../utils/syncEvents.js';

export function DatabaseProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState(() => getSession()?.user || null);
  const [profileState, setProfileState] = useState(null);
  const identityRevision = getSessionSnapshot().identityRevision;
  const profileRead = useRef(0);

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
    const snapshot = getSessionSnapshot();
    const read = ++profileRead.current;
    setProfileState({ identityRevision: snapshot.identityRevision, loading: true, error: '' });
    try {
      const result = await authService.getMe();
      const fetchedUser = result?.user || result?.data?.user;
      const current = getSession();
      if (read !== profileRead.current || getSessionSnapshot().identityRevision !== snapshot.identityRevision) return;
      if (!fetchedUser || fetchedUser.user_id !== current?.user?.user_id) throw new Error('Không thể xác minh hồ sơ tài khoản.');
      // A delayed read must not overwrite a profile saved after this request started.
      if (JSON.stringify(current.user) === JSON.stringify(session.user)) setSession({ ...current, user: fetchedUser });
      setProfileState({ identityRevision: snapshot.identityRevision, loading: false, error: '' });
    } catch (failure) {
      if (read === profileRead.current && getSessionSnapshot().identityRevision === snapshot.identityRevision) {
        setProfileState({ identityRevision: snapshot.identityRevision, loading: false,
          error: failure.message || 'Không thể tải hồ sơ. Vui lòng thử lại.' });
      }
    }
  }, []);

  useEffect(() => {
    const sync = () => setUser(getSession()?.user || null);
    window.addEventListener('chayxanh-session', sync);
    return () => window.removeEventListener('chayxanh-session', sync);
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser, identityRevision]);

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
    <DatabaseContext.Provider value={{ data, error, user, reload, refreshUser,
      userLoading: Boolean(user && (profileState?.identityRevision !== identityRevision || profileState.loading)),
      userError: profileState?.identityRevision === identityRevision ? profileState.error : '' }}>
      {children}
    </DatabaseContext.Provider>
  );
}
