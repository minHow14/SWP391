// client/src/features/community/components/CommunitySearchBar.jsx
import { Button, Form } from 'react-bootstrap';

export default function CommunitySearchBar({
  searchQuery = '',
  onSearchChange,
  filterType = 'ALL',
  onFilterChange,
  totalCount = 0,
  blogCount = 0,
  videoCount = 0,
  onClear,
}) {
  return (
    <div className="cx-community-search-bar my-3">
      <Form
        className="cx-community-search-form"
        onSubmit={(e) => e.preventDefault()}
        role="search"
        aria-label="Tìm kiếm Video và Bài viết"
      >
        <div className="cx-search-field">
          <i className="bi bi-search text-success" aria-hidden="true" />
          <Form.Label htmlFor="community-search" className="visually-hidden">
            Tìm kiếm bài viết hoặc video theo tiêu đề, nội dung
          </Form.Label>
          <input
            id="community-search"
            type="search"
            className="cx-search-input"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm bài viết, video theo tiêu đề, nội dung, tác giả..."
            autoComplete="off"
            style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
          />
          {searchQuery && (
            <Button
              type="button"
              variant="link"
              className="btn-clear p-0 text-secondary"
              aria-label="Xóa từ khóa tìm kiếm"
              onClick={onClear}
            >
              <i className="bi bi-x-circle-fill" aria-hidden="true" />
            </Button>
          )}
        </div>
      </Form>

      {/* Bộ lọc loại nội dung: Tất cả, Bài viết, Video */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3" aria-label="Lọc theo loại nội dung">
        <div className="d-flex flex-wrap gap-2">
          <Button
            type="button"
            variant={filterType === 'ALL' ? 'success' : 'light'}
            size="sm"
            className="rounded-pill px-3"
            aria-pressed={filterType === 'ALL'}
            onClick={() => onFilterChange('ALL')}
          >
            Tất cả ({totalCount})
          </Button>
          <Button
            type="button"
            variant={filterType === 'BLOG' ? 'success' : 'light'}
            size="sm"
            className="rounded-pill px-3"
            aria-pressed={filterType === 'BLOG'}
            onClick={() => onFilterChange('BLOG')}
          >
            <i className="bi bi-journal-richtext me-1" aria-hidden="true" /> Bài viết ({blogCount})
          </Button>
          <Button
            type="button"
            variant={filterType === 'VIDEO' ? 'success' : 'light'}
            size="sm"
            className="rounded-pill px-3"
            aria-pressed={filterType === 'VIDEO'}
            onClick={() => onFilterChange('VIDEO')}
          >
            <i className="bi bi-play-circle-fill me-1" aria-hidden="true" /> Video ({videoCount})
          </Button>
        </div>

        {searchQuery.trim() && (
          <span className="small text-muted">
            Khớp <strong>{totalCount}</strong> kết quả
          </span>
        )}
      </div>
    </div>
  );
}
