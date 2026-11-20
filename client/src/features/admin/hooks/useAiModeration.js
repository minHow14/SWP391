// D:/SWP391/SWP391/client/src/features/admin/hooks/useAiModeration.js
// Hook lấy hàng chờ kiểm duyệt nội dung do AI gắn cờ, có polling và đồng bộ theo sự kiện.
import { useCallback, useEffect, useState } from 'react';
import { adminService } from '../../../services/adminService.js';
import { subscribeSyncEvent } from '../../../utils/syncEvents.js';

// Chu kỳ polling hàng chờ kiểm duyệt: job AI chạy bất đồng bộ nên cần cập nhật định kỳ.
const POLL_MS = 5_000;

/**
 * Tải và tự động làm mới danh sách bài viết/bình luận bị AI gắn cờ cần Admin xem xét.
 * @returns {{ data: object, loading: boolean, error: string, refresh: Function }}
 */
export function useAiModeration() {
  const [data, setData] = useState({ posts: [], comments: [], totalFlagged: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    // Gọi API rồi hẹn lần tải tiếp theo chỉ khi thành công; dùng setTimeout thay vì setInterval
    // để các request không chồng lên nhau khi mạng chậm.
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
    // Làm mới ngay khi tab khác thay đổi nội dung/kiểm duyệt, không cần chờ đến chu kỳ polling.
    const unsubscribe = subscribeSyncEvent(['MODERATION_CHANGED', 'POST_CHANGED', 'COMMENT_CHANGED'], refresh);
    return () => { controller.abort(); clearTimeout(timer); unsubscribe(); };
  }, [revision, refresh]);
  return { data, loading, error, refresh };
}
