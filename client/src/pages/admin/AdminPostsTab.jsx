// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminPostsTab.jsx
import { useEffect, useState } from 'react';
import { Table, Button, Form, Row, Col, Spinner, Alert, Modal } from 'react-bootstrap';
import { adminService } from '../../services/adminService.js';

export default function AdminPostsTab() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [actionMsg, setActionMsg] = useState('');

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getPosts({ postType: typeFilter, status: statusFilter, search, limit: 50 });
      setPosts(res.data);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách bài viết');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [typeFilter, statusFilter]);

  const handleUpdateStatus = async (postId, status) => {
    try {
      await adminService.updatePostStatus(postId, status);
      setActionMsg(`Đã cập nhật trạng thái bài viết thành công`);
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài viết vi phạm này?')) return;
    try {
      await adminService.deletePost(postId);
      setActionMsg('Đã xóa bài viết vi phạm');
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartEdit = (post) => {
    setEditingPost(post);
    setEditForm({
      title: post.blog?.title || post.video?.title || '',
      content: post.blog?.content || post.video?.transcript || '',
    });
  };

  const handleSaveEdit = async () => {
    try {
      await adminService.updatePost(editingPost.post_id, editForm);
      setActionMsg('Đã chỉnh sửa nội dung bài viết vi phạm thành công');
      setEditingPost(null);
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Quản Lý Bài Viết & Video Nấu Ăn</h4>
          <p className="text-muted small mb-0">Xem xét bài đăng cộng đồng, phê duyệt, chỉnh sửa từ ngữ vi phạm hoặc gỡ bỏ</p>
        </div>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="py-2 small rounded-3">
          <i className="bi bi-check-circle-fill me-2" />{actionMsg}
        </Alert>
      )}

      {/* Bộ lọc */}
      <div className="admin-card mb-3 p-3">
        <Row className="g-2">
          <Col xs={12} md={5}>
            <Form.Control
              size="sm"
              className="rounded-3"
              placeholder="Tìm theo tiêu đề hoặc tác giả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchPosts()}
            />
          </Col>
          <Col xs={6} md={3}>
            <Form.Select size="sm" className="rounded-3" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Tất cả thể loại</option>
              <option value="BLOG">Bài viết Blog chia sẻ</option>
              <option value="VIDEO">Video nấu ăn chay</option>
            </Form.Select>
          </Col>
          <Col xs={6} md={3}>
            <Form.Select size="sm" className="rounded-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="PUBLISHED">Đã phê duyệt</option>
              <option value="PENDING">Chờ phê duyệt</option>
              <option value="HIDDEN_BY_AI">AI đã ẩn do nghi vấn</option>
              <option value="DELETED">Đã xóa</option>
            </Form.Select>
          </Col>
          <Col xs={12} md={1}>
            <Button variant="success" size="sm" className="w-100 rounded-3" onClick={fetchPosts}>Lọc</Button>
          </Col>
        </Row>
      </div>

      {/* Danh sách */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="success" />
          <p className="mt-2 text-muted small">Đang nạp bài viết & video...</p>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center rounded-3">
          <span><i className="bi bi-exclamation-triangle me-2" />{error}</span>
          <Button variant="outline-danger" size="sm" onClick={fetchPosts}>Thử lại</Button>
        </Alert>
      ) : posts.length === 0 ? (
        <div className="text-center py-5 border rounded-4 bg-light">
          <i className="bi bi-file-earmark-x text-muted display-4" />
          <p className="mt-2 text-muted">Không có bài viết nào phù hợp điều kiện lọc</p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <Table responsive hover className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th className="stt-col">STT</th>
                <th>Tiêu đề & Tác giả</th>
                <th>Phân loại</th>
                <th>Trạng thái</th>
                <th>Phản hồi</th>
                <th className="text-end">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p, index) => {
                const title = p.blog?.title || p.video?.title || 'Không có tiêu đề';
                return (
                  <tr key={p.post_id}>
                    <td className="stt-col">{index + 1}</td>
                    <td>
                      <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: 320 }}>{title}</div>
                      <div className="text-muted small">Tác giả: {p.author?.full_name}</div>
                    </td>
                    <td>
                      <span className={`cx-badge ${p.post_type === 'BLOG' ? 'cx-badge-info' : 'cx-badge-active'}`}>
                        {p.post_type === 'BLOG' ? 'Blog chia sẻ' : 'Video nấu ăn'}
                      </span>
                    </td>
                    <td>
                      <span className={`cx-badge ${
                        p.status === 'PUBLISHED' ? 'cx-badge-active' :
                        p.status === 'HIDDEN_BY_AI' ? 'cx-badge-locked' : 'cx-badge-neutral'
                      }`}>
                        {p.status === 'PUBLISHED' ? 'Đã phê duyệt' : p.status === 'HIDDEN_BY_AI' ? 'AI đã ẩn' : p.status === 'DELETED' ? 'Đã xóa' : 'Chờ duyệt'}
                      </span>
                    </td>
                    <td className="small text-muted">{p._count.comments} bình luận · {p._count.reports} báo cáo</td>
                    <td className="text-end">
                      {p.status !== 'PUBLISHED' && (
                        <Button variant="outline-success" size="sm" className="me-1 rounded-3" onClick={() => handleUpdateStatus(p.post_id, 'PUBLISHED')} title="Duyệt xuất bản">
                          <i className="bi bi-check-lg" />
                        </Button>
                      )}
                      <Button variant="outline-primary" size="sm" className="me-1 rounded-3" onClick={() => handleStartEdit(p)} title="Chỉnh sửa nội dung vi phạm">
                        <i className="bi bi-pencil" />
                      </Button>
                      <Button variant="outline-danger" size="sm" className="rounded-3" onClick={() => handleDeletePost(p.post_id)} disabled={p.status === 'DELETED'} title="Gỡ bỏ bài viết">
                        <i className="bi bi-trash" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      {/* Modal Chỉnh sửa bài viết vi phạm */}
      <Modal show={!!editingPost} onHide={() => setEditingPost(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Chỉnh sửa nội dung vi phạm tiêu chuẩn</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="editPostTitle">
            <Form.Label className="small fw-semibold">Tiêu đề bài viết / video</Form.Label>
            <Form.Control
              className="rounded-3"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="editPostContent">
            <Form.Label className="small fw-semibold">Nội dung chi tiết / Lời thuyết minh</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              className="rounded-3"
              value={editForm.content}
              onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" className="rounded-3" onClick={() => setEditingPost(null)}>Đóng</Button>
          <Button variant="success" size="sm" className="rounded-3" onClick={handleSaveEdit}>Lưu cập nhật</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
