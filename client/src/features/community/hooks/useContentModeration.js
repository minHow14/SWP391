// D:/SWP391/SWP391/client/src/features/community/hooks/useContentModeration.js
// Hook theo dõi các job kiểm duyệt nội dung của người dùng, tự động polling khi còn job đang xử lý.
import { useCallback, useEffect, useRef, useState } from 'react';
import { getContentModerationJobs } from '../../../services/communityService.js';

// Chu kỳ polling 3 giây khi còn job chờ kiểm duyệt.
const POLL_MS = 3_000;
const PAGE_SIZE = 5;
const EMPTY_META = { total: 0, pending: 0, limit: PAGE_SIZE };
const emptyView = (userId, page) => ({ userId, page, items: [], meta: EMPTY_META, loading: false, error: '' });

// Kiểm tra có job nào vừa hoàn tất/thất bại so với lần tải trước để báo trang cha tải lại nội dung.
function hasSettled(previous, items, meta) {
  const statuses = new Map(previous.items.map((job) => [job.id, job.status]));
  return previous.pending > meta.pending || items.some((job) =>
    statuses.has(job.id) && statuses.get(job.id) !== job.status && ['COMPLETED', 'FAILED'].includes(job.status));
}

// Tải một trang job kiểm duyệt; nếu còn job PENDING/PROCESSING thì lên lịch tải lại sau POLL_MS.
async function loadModeration(context) {
  const { userId, page, signal, previous } = context;
  try {
    const response = await getContentModerationJobs({ page, limit: PAGE_SIZE }, signal);
    if (signal.aborted) return;
    const items = response.data?.items;
    const meta = response.meta;
    if (!Array.isArray(items) || !Number.isInteger(meta?.pending)) throw new Error('Không thể đọc trạng thái kiểm duyệt.');
    const settled = previous.current.userId === userId && hasSettled(previous.current, items, meta);
    previous.current = { userId, items, pending: meta.pending };
    context.setView({ userId, page, items, meta, loading: false, error: '' });
    if (settled) context.onSettled();
    if (meta.pending > 0 || items.some((job) => ['PENDING', 'PROCESSING'].includes(job.status))) {
      context.schedule(() => loadModeration(context));
    }
  } catch (error) {
    if (signal.aborted) return;
    context.setView((current) => ({ ...(current.userId === userId ? current : emptyView(userId, page)),
      loading: false, error: error.message || 'Không thể tải trạng thái kiểm duyệt.' }));
  }
}

// Hook kiểm duyệt; onSettled được gọi khi có job vừa xử lý xong.
export function useContentModeration({ userId, onSettled }) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState(() => emptyView(null, 1));
  const previous = useRef({ userId: null, items: [], pending: 0 });
  // Giữ callback trong ref để effect polling không phải chạy lại mỗi khi trang cha tạo hàm mới.
  const callback = useRef(onSettled);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => { callback.current = onSettled; }, [onSettled]);
  // Đổi tài khoản thì quay về trang 1.
  useEffect(() => { setPage(1); }, [userId]);
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    let timer;
    setView((current) => ({ ...(current.userId === userId && current.page === page ? current : emptyView(userId, page)),
      loading: true, error: '' }));
    loadModeration({ userId, page, signal: controller.signal, previous, setView,
      onSettled: () => callback.current?.(), schedule: (load) => { timer = setTimeout(load, POLL_MS); } });
    return () => { controller.abort(); clearTimeout(timer); };
  }, [userId, page, revision]);
  // Chỉ trả dữ liệu thuộc đúng người dùng và trang hiện tại, tránh hiển thị dữ liệu cũ của tài khoản khác.
  const visible = userId && view.userId === userId && view.page === page ? view : { ...emptyView(userId, page), loading: Boolean(userId) };
  return { ...visible, page, setPage, refresh };
}
