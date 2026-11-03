// D:/SWP391/SWP391/client/src/features/admin/components/AdminAiModerationTable.jsx
import { Badge, Button, Table } from 'react-bootstrap';

function statusLabel(item) {
  const job = item.moderation;
  if (job?.status === 'FAILED') return 'Kiểm tra gặp lỗi';
  if (job?.status === 'PENDING' || job?.status === 'PROCESSING') return 'Đang kiểm duyệt';
  if (job?.result?.decision === 'REVIEW' && job.applied) return 'AI đề nghị xem xét';
  return 'Cần Admin xem xét';
}

export default function AdminAiModerationTable({ items, entityType, onAction }) {
  const isPost = entityType === 'POST';
  const act = (item, action) => onAction({ type: entityType, id: isPost ? item.post_id : item.comment_id,
    action, title: isPost ? item.blog?.title || item.video?.title : item.content, contentVersion: item.moderationVersion });
  return (
    <section className="admin-card mb-4 overflow-hidden">
      <div className="admin-card-header bg-white py-3"><h5 className="h6 mb-0">{isPost ? 'Bài viết' : 'Bình luận'} cần theo dõi ({items.length})</h5></div>
      {!items.length ? <p className="p-3 text-secondary mb-0">Không có {isPost ? 'bài viết' : 'bình luận'} đang chờ xử lý.</p> : (
        <Table responsive hover className="mb-0 align-middle admin-table">
          <thead><tr><th>Nội dung</th><th>Tác giả</th><th>Kết quả kiểm tra</th><th>Quyết định</th></tr></thead>
          <tbody>{items.map((item) => (
            <tr key={isPost ? item.post_id : item.comment_id}>
              <td className="text-break">
                {isPost && <strong className="d-block mb-1">{item.blog?.title || item.video?.title}</strong>}
                <p className="small mb-1">{isPost ? item.blog?.content || item.video?.transcript : item.content}</p>
                {!isPost && <p className="text-secondary small mb-0">{item.post?.blog?.title || item.post?.video?.title}</p>}
              </td>
              <td className="small">{(isPost ? item.author : item.user)?.full_name || 'Chưa có tên hiển thị'}</td>
              <td className="text-break">
                <Badge bg={item.moderation?.status === 'FAILED' ? 'warning' : 'secondary'} text={item.moderation?.status === 'FAILED' ? 'dark' : undefined}>{statusLabel(item)}</Badge>
                <p className="small my-2">{item.moderation?.result?.reason || item.moderation?.errorMessage || 'Chưa có kết quả kiểm duyệt tự động cho phiên bản này.'}</p>
                {!!item.moderation?.result?.evidence?.length && <ul className="small ps-3 mb-0" aria-label="Bằng chứng trong nội dung">
                  {item.moderation.result.evidence.map((quote, index) => <li key={index} className="text-break">“{quote}”</li>)}
                </ul>}
              </td>
              <td><div className="d-flex gap-2 flex-wrap">
                <Button variant="outline-success" onClick={() => act(item, 'APPROVE')}>Cho phép hiển thị</Button>
                <Button variant="outline-danger" onClick={() => act(item, 'REJECT')}>Gỡ nội dung</Button>
              </div></td>
            </tr>
          ))}</tbody>
        </Table>
      )}
    </section>
  );
}
