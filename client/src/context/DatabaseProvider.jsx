// client/src/context/DatabaseProvider.jsx
import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';
import { getSession, setSession } from '../utils/session.js';
import { DatabaseContext } from './databaseContext.js';
import { subscribeSyncEvent } from '../utils/syncEvents.js';

export function DatabaseProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState(() => getSession()?.user || null);

  const reload = useCallback(async () => {
    try {
      const catalog = await api('/workspace/catalog');
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
    api('/workspace/catalog', { signal: controller.signal })
      .then((catalog) => {
        setData(catalog);
        setError('');
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let active = true;
    const sync = () => setUser(getSession()?.user || null);
    window.addEventListener('chayxanh-session', sync);
    const session = getSession();
    if (session?.token) {
      api('/auth/me')
        .then((result) => {
          if (active && getSession()?.token === session.token) {
            setSession({ ...session, user: result.user });
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
      window.removeEventListener('chayxanh-session', sync);
    };
  }, []);

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
    <DatabaseContext.Provider value={{ data, error, user, reload }}>
      {children}
    </DatabaseContext.Provider>
  );
}
