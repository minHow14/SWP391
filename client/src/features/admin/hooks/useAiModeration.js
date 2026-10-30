// D:/SWP391/SWP391/client/src/features/admin/hooks/useAiModeration.js
import { useCallback, useEffect, useState } from 'react';
import { adminService } from '../../../services/adminService.js';
import { subscribeSyncEvent } from '../../../utils/syncEvents.js';

const POLL_MS = 5_000;

export function useAiModeration() {
  const [data, setData] = useState({ posts: [], comments: [], totalFlagged: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    async function load() {
      try {
        const response = await adminService.getAiFlaggedContent(controller.signal);
        if (controller.signal.aborted) return;
        if (!Array.isArray(response.data?.posts) || !Array.isArray(response.data?.comments)) throw new Error('Dữ liệu kiểm duyệt không hợp lệ.');
        setData(response.data); setError(''); setLoading(false);
        timer = setTimeout(load, POLL_MS);
      } catch (failure) {
        if (!controller.signal.aborted) { setError(failure.message || 'Không thể tải hàng chờ kiểm duyệt.'); setLoading(false); }
      }
    }
    load();
    const unsubscribe = subscribeSyncEvent(['MODERATION_CHANGED', 'POST_CHANGED', 'COMMENT_CHANGED'], refresh);
    return () => { controller.abort(); clearTimeout(timer); unsubscribe(); };
  }, [revision, refresh]);
  return { data, loading, error, refresh };
}
