// client/src/features/chat/components/ChatMessage.jsx
import { Link } from 'react-router';
import MarkdownMessage from './MarkdownMessage.jsx';

export default function ChatMessage({ message, busy, actions }) {
  const { ask, openMealPlan, askAboutPlan } = actions;
  return (
    <div
      className={`cx-chat-message ${message.role}`}
    >
      {message.role === 'assistant' && (
        <span className="cx-chat-avatar">
          <i className="bi bi-leaf-fill" aria-hidden="true" />
        </span>
      )}
      <div className={`cx-chat-bubble ${message.error ? 'is-error' : ''}`}>
        <span className="visually-hidden">
          {message.role === 'user' ? 'Bạn: ' : 'Trợ lý: '}
        </span>
        {message.image && (
          <img
            src={message.image}
            className="cx-chat-attachment"
            alt="Ảnh nguyên liệu bạn đã chọn"
          />
        )}
        {message.title && (
          <strong className="d-block mb-2">{message.title}</strong>
        )}
        {message.pending && !message.text && (
          <p className="cx-chat-typing" role="status" aria-label="Trợ lý đang trả lời" />
        )}
        {message.text &&
          (message.kind === 'chat' && message.role === 'assistant' && !message.error ? (
            <div className={message.pending ? 'cx-chat-typing' : undefined}>
              <MarkdownMessage>{message.text}</MarkdownMessage>
            </div>
          ) : (
            <p>{message.text}</p>
          ))}
        {message.items && (
          <ul>
            {message.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}
        {message.footer && (
          <p className="cx-chat-message-note">{message.footer}</p>
        )}
        {message.error && message.requestId && <small>Mã yêu cầu: {message.requestId}</small>}
        {message.error && (
          <div className="cx-chat-actions">
            {message.retryQuestion && !busy && (
              <button type="button" onClick={() => ask(message.retryQuestion, { retry: true })}>Thử lại</button>
            )}
            {message.quota && <Link to="/dang-nhap">Đăng nhập</Link>}
          </div>
        )}
        {message.kind === 'plan' && (
          <div className="cx-chat-actions">
            <button type="button" onClick={() => openMealPlan(message.plan)}>Xem chi tiết</button>
            <button type="button" onClick={() => askAboutPlan(message.plan)}>Hỏi về thực đơn này</button>
          </div>
        )}
      </div>
    </div>
  );
}
