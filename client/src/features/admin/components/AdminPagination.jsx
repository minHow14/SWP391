// D:/SWP391/SWP391/client/src/features/admin/components/AdminPagination.jsx
// Thanh phân trang đơn giản (trang trước/sau) dùng chung cho các bảng quản trị.
import { Button } from 'react-bootstrap';

/**
 * Điều khiển phân trang; nhận trực tiếp các giá trị trả về từ `useAdminPagination`.
 * @param {object} props
 * @param {number} props.page Trang hiện tại.
 * @param {number} props.totalPages Tổng số trang.
 * @param {number} props.total Tổng số bản ghi.
 * @param {boolean} props.loading Vô hiệu nút khi đang tải.
 * @param {Function} props.setPage Chuyển trang.
 */
export default function AdminPagination({ page, totalPages, total, loading, setPage }) {
  return (
    <nav aria-label="Phân trang danh sách" className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
      <span className="small text-muted" role="status">Trang {page}/{totalPages} · {total} bản ghi</span>
      <div className="d-flex gap-2">
        <Button size="sm" variant="outline-success" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Trang trước</Button>
        <Button size="sm" variant="outline-success" disabled={loading || page >= totalPages} onClick={() => setPage(page + 1)}>Trang sau</Button>
      </div>
    </nav>
  );
}
