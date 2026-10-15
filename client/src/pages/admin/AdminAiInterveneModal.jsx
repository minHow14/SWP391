// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminAiInterveneModal.jsx
import { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { adminService } from '../../services/adminService.js';
import { emitSyncEvent } from '../../lib/syncEvents.js';

export default function AdminAiInterveneModal({ show, onHide, onSuccess, defaultLog = null }) {
  const [modelName, setModelName] = useState(defaultLog?.model_name || 'deepseek-chat');
  const [action, setAction] = useState(defaultLog?.action || 'SPAM_DETECTION');
  const [correctionType, setCorrectionType] = useState('Phát hiện spam nhầm');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      await adminService.interveneAi({
        logId: defaultLog?.log_id || null,
        modelName,
        action,
        correctionType,
        feedback: feedback.trim(),
      });
      emitSyncEvent('AI_CHANGED');
      onSuccess?.('Đã lưu thông tin can thiệp thủ công kết quả AI thành công');
      onHide();
    } catch (err) {
      setError(err.message || 'Không thể gửi can thiệp thủ công');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold text-dark">
            <i className="bi bi-tools me-2 text-warning" />
            Can Thiệp Thủ Công Kết Quả AI
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2 small rounded-3">{error}</Alert>}

          <Form.Group className="mb-3" controlId="aiInterveneModel">
            <Form.Label className="small fw-semibold">Mô hình AI can thiệp</Form.Label>
            <Form.Select className="rounded-3" value={modelName} onChange={(e) => setModelName(e.target.value)}>
              <option value="deepseek-chat">Trợ lý DeepSeek Chat (Tư vấn Dinh dưỡng & Kiểm duyệt)</option>
              <option value="recommendation-engine">Mô hình Gợi ý Thực đơn (Recommendation Engine)</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3" controlId="aiInterveneAction">
            <Form.Label className="small fw-semibold">Tác vụ AI cần can thiệp</Form.Label>
            <Form.Select className="rounded-3" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="SPAM_DETECTION">Kiểm duyệt Spam & Nội dung vi phạm (SPAM_DETECTION)</option>
              <option value="CHATBOT_GUEST_QUERY">Tư vấn dinh dưỡng Chatbot (CHATBOT_GUEST_QUERY)</option>
              <option value="NUTRIENT_ANALYSIS">Phân tích chỉ số dưỡng chất món ăn (NUTRIENT_ANALYSIS)</option>
              <option value="RECOMMENDATION">Gợi ý món ăn & quán chay (RECOMMENDATION)</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3" controlId="aiInterveneType">
            <Form.Label className="small fw-semibold">Phân loại sai lệch phát hiện</Form.Label>
            <Form.Select className="rounded-3" value={correctionType} onChange={(e) => setCorrectionType(e.target.value)}>
              <option value="Phát hiện spam nhầm">Phát hiện spam nhầm (Bình luận chuẩn bị khóa oan)</option>
              <option value="Bỏ lọt nội dung độc hại">Bỏ lọt nội dung quảng cáo / lừa đảo</option>
              <option value="Sai lệch thông số dinh dưỡng">Sai lệch thông số calo / đạm thực vật</option>
              <option value="Gợi ý món vi phạm chế độ ăn">Gợi ý món không đúng chế độ ăn (có trứng/ngũ vị tân...)</option>
              <option value="Khác">Sai lệch khác</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3" controlId="aiInterveneFeedback">
            <Form.Label className="small fw-semibold">Ghi chú điều chỉnh / Hướng dẫn khắc phục</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              className="rounded-3"
              placeholder="VD: Cần bỏ gắn cờ cụm từ 'trà thảo mộc', bổ sung kiểm tra alliums đối với chế độ thuần chay Phật giáo..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" className="rounded-3" onClick={onHide} disabled={submitting}>Hủy bỏ</Button>
          <Button variant="warning" size="sm" className="rounded-3 text-dark fw-semibold" type="submit" disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Lưu can thiệp'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
