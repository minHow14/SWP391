// D:/SWP391/SWP391/client/src/features/admin/components/AdminPagination.jsx
import { Button } from 'react-bootstrap';

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
