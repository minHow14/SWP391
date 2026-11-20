// D:/SWP391/SWP391/client/src/features/admin/hooks/useAdminPagination.js
// Hook phân trang dùng chung cho các bảng quản trị: quản lý trang hiện tại,
// gọi API theo trang và tự reset về trang 1 khi bộ lọc thay đổi.
import { useCallback, useEffect, useState } from 'react';

/**
 * Quản lý trạng thái phân trang và tải dữ liệu cho một danh sách admin.
 * @param {object} options
 * @param {Function} options.fetchPage Hàm gọi API nhận `{ page, limit }`, trả về `{ data, meta }`.
 * @param {string} options.filterKey Khóa đại diện bộ lọc hiện tại; đổi khóa sẽ quay về trang 1.
 * @param {number} options.limit Số bản ghi mỗi trang.
 * @param {string} options.errorMessage Thông báo lỗi mặc định khi API không trả message.
 * @returns {object} Dữ liệu trang, trạng thái tải/lỗi, thông tin phân trang và hàm `refresh`/`setPage`.
 */
export function useAdminPagination({ fetchPage, filterKey, limit, errorMessage }) {
  const [position, setPosition] = useState({ filterKey, page: 1 });
  const [revision, setRevision] = useState(0);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Gắn trang với filterKey để khi bộ lọc đổi thì tự quay về trang 1 ngay trong lần render này,
  // tránh gọi API với số trang cũ không còn hợp lệ.
  const page = position.filterKey === filterKey ? position.page : 1;
  if (position.filterKey !== filterKey) setPosition({ filterKey, page: 1 });
  const total = response?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const setPage = useCallback((nextPage) => setPosition({ filterKey, page: nextPage }), [filterKey]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  // Tải dữ liệu mỗi khi trang/bộ lọc/revision đổi; cờ `active` bỏ qua kết quả của request cũ đã lỗi thời.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchPage({ page, limit }).then((result) => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil((result.meta?.total ?? 0) / limit));
      // Khi bản ghi bị xóa làm trang hiện tại vượt quá trang cuối, lùi về trang cuối thay vì hiển thị trang rỗng.
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setResponse(result);
    }).catch((failure) => {
      if (active) setError(failure.message || errorMessage);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [fetchPage, page, limit, revision, setPage, errorMessage]);

  return { data: response?.data ?? [], response, loading, error, setError, refresh, page, limit, total, totalPages, setPage };
}
