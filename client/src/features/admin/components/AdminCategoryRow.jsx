// client/src/features/admin/components/AdminCategoryRow.jsx
import { Button, Badge } from 'react-bootstrap';
import AdminCategoryDetailRow from './AdminCategoryDetailRow.jsx';

export default function AdminCategoryRow({
  cat,
  index,
  isFood,
  isExpanded,
  recipeTotal,
  postTotal,
  onToggle,
  onEdit,
  onDelete,
  onPreview,
}) {
  return (
    <>
      <tr className={isExpanded ? 'table-light' : ''}>
        <td className="ps-3 text-center">
          <button
            type="button"
            className="admin-stt-toggle"
            onClick={onToggle}
            title={isExpanded ? 'Thu gọn chi tiết' : 'Sổ xuống xem chi tiết các bài viết và công thức'}
            aria-expanded={isExpanded}
          >
            <i
              className={`bi bi-chevron-right admin-stt-arrow ${isExpanded ? 'is-rotated' : ''}`}
              aria-hidden="true"
            />
            <span>{index + 1}</span>
          </button>
        </td>
        <td>
          <span
            className="fw-semibold text-dark cursor-pointer"
            onClick={onToggle}
            title="Bấm để mở rộng xem chi tiết"
          >
            {cat.name}
          </span>
        </td>
        <td>
          <span className={`cx-badge ${isFood ? 'cx-badge-active' : 'cx-badge-info'}`}>
            {isFood ? 'Món ăn & Công thức' : 'Blog (Bài viết)'}
          </span>
        </td>
        <td>
          <Badge
            bg={recipeTotal > 0 ? 'success-subtle' : 'light'}
            className={`cursor-pointer ${recipeTotal > 0 ? 'text-success border border-success-subtle' : 'text-muted border'}`}
            onClick={onToggle}
            title="Bấm để xem danh sách công thức"
          >
            {recipeTotal} công thức
          </Badge>
        </td>
        <td>
          <Badge
            bg={postTotal > 0 ? 'primary-subtle' : 'light'}
            className={`cursor-pointer ${postTotal > 0 ? 'text-primary border border-primary-subtle' : 'text-muted border'}`}
            onClick={onToggle}
            title="Bấm để xem danh sách bài viết"
          >
            {postTotal} bài viết
          </Badge>
        </td>
        <td className="text-end pe-3">
          <Button variant="outline-primary" size="sm" className="me-1 rounded-3" onClick={onEdit} title="Chỉnh sửa tên danh mục">
            <i className="bi bi-pencil" />
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            className="rounded-3"
            onClick={onDelete}
            disabled={postTotal > 0 || recipeTotal > 0}
            title={postTotal > 0 || recipeTotal > 0 ? 'Không thể xóa khi đang có bài viết hoặc công thức liên kết' : 'Xóa danh mục'}
          >
            <i className="bi bi-trash" />
          </Button>
        </td>
      </tr>
      {isExpanded && <AdminCategoryDetailRow cat={cat} onPreview={onPreview} />}
    </>
  );
}
