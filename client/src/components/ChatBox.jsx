import { useEffect, useRef, useState } from 'react';
import { getDatabaseReply, summarizeText } from '../lib/chatReplies.js';

const suggestions = [
  {
    label: 'Nguồn đạm chay',
    icon: 'leaf',
    text: 'Gợi ý món ăn từ nguồn đạm chay',
  },
  {
    label: 'Vitamin B12',
    icon: 'capsule',
    text: 'Tôi muốn hỏi về vitamin B12',
  },
  { label: 'Chỉ số BMI', icon: 'bar-chart', text: 'Tôi muốn tính chỉ số BMI' },
];

export default function ChatBox() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState('chat');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'assistant',
      text: 'Xin chào bạn! Mình là Trợ Lý ChayXanh. Cùng khám phá công thức chay, chuẩn bị thực đơn tuần hoặc xem nhanh nội dung hướng dẫn nấu ăn nhé.',
    },
  ]);
  const input = useRef(null);
  const launcher = useRef(null);
  const messageList = useRef(null);
  const fileInput = useRef(null);
  const attachmentUrls = useRef([]);
  const nextId = useRef(1);

  useEffect(() => {
    const urls = attachmentUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
        setOpen(false);
        launcher.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);
  useEffect(() => {
    if (open && messageList.current)
      messageList.current.scrollTop = messageList.current.scrollHeight;
  }, [open, messages]);

  function addExchange(question, reply, image) {
    const userId = nextId.current++;
    const replyId = nextId.current++;
    setMessages((previous) => [
      ...previous,
      { id: userId, role: 'user', text: question, image },
      { id: replyId, role: 'assistant', ...reply },
    ]);
    setError('');
  }

  async function sendMessage(text = draft, forcedMode) {
    const question = text.trim();
    if (!question) return;
    const activeMode = forcedMode || mode;
    try { addExchange(
      question,
      activeMode === 'summary'
        ? summarizeText(question)
        : await getDatabaseReply(question)
    );
    setDraft('');
    setMode('chat');
    input.current?.focus();
    } catch(error) {setError(error.message);}
  }

  function selectSummary() {
    addExchange('Tóm tắt video', {text:'Dán văn bản hướng dẫn để trích các câu đầu.'});
    setMode('summary');
    input.current?.focus();
  }

  function attachPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Chọn ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh cần nhỏ hơn 5 MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    attachmentUrls.current.push(url);
    addExchange(
      `Ảnh nguyên liệu: ${file.name}`,
      {
        text: 'Mình đã hiển thị ảnh bạn chọn. Ảnh chỉ ở trên thiết bị và chưa được gửi đi. Chưa hỗ trợ nhận diện ảnh nguyên liệu; bạn có thể nhập tên nguyên liệu để trò chuyện.',
      },
      url
    );
  }

  return (
    <div className="cx-chat-widget">
      {open && (
        <section
          id="cx-chat-panel"
          role="dialog"
          aria-labelledby="cx-chat-title"
          className="cx-chat-panel"
        >
          <header className="cx-chat-header">
            <span className="cx-chat-header-icon">
              <i className="bi bi-headset" aria-hidden="true" />
            </span>
            <div className="flex-grow-1">
              <h2 id="cx-chat-title">Trợ Lý Tư Vấn</h2>
              <p>Công thức & thực đơn chay</p>
            </div>
            <button
              type="button"
              className="cx-chat-close"
              aria-label="Đóng hộp chat"
              onClick={() => {
                setOpen(false);
                launcher.current?.focus();
              }}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </header>
          <div className="cx-chat-tools" aria-label="Tính năng nhanh">
            <button type="button" onClick={() => fileInput.current.click()}>
              <i className="bi bi-camera-fill" aria-hidden="true" /> Quét ảnh
            </button>
            <button
              type="button"
              onClick={() => sendMessage('Gợi ý thực đơn tuần', 'chat')}
            >
              <i className="bi bi-calendar3" aria-hidden="true" /> Thực đơn tuần
            </button>
            <button type="button" onClick={selectSummary}>
              <i className="bi bi-file-earmark-text" aria-hidden="true" /> Tóm
              tắt video
            </button>
            <input
              type="file"
              ref={fileInput}
              accept="image/jpeg,image/png,image/webp"
              className="visually-hidden"
              aria-label="Ảnh nguyên liệu cho chat"
              onChange={attachPhoto}
            />
          </div>
          <div
            ref={messageList}
            className="cx-chat-messages"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-label="Lịch sử hội thoại"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`cx-chat-message ${message.role}`}
              >
                {message.role === 'assistant' && (
                  <span className="cx-chat-avatar">
                    <i className="bi bi-leaf-fill" aria-hidden="true" />
                  </span>
                )}
                <div className="cx-chat-bubble">
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
                  {message.text && <p>{message.text}</p>}
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
                </div>
              </div>
            ))}
          </div>
          <div className="cx-chat-suggestions" aria-label="Chủ đề gợi ý">
            {suggestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion.label}
                onClick={() => sendMessage(suggestion.text, 'chat')}
              >
                <i className={`bi bi-${suggestion.icon}`} aria-hidden="true" />{' '}
                {suggestion.label}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="text-danger small px-3 mb-2">
              {error}
            </p>
          )}
          <form
            className="cx-chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <label htmlFor="cx-chat-input" className="visually-hidden">
              Nhập tin nhắn cho Trợ Lý Tư Vấn
            </label>
            <textarea
              id="cx-chat-input"
              ref={input}
              rows={1}
              maxLength={5000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                mode === 'summary'
                  ? 'Dán nội dung hướng dẫn cần trích...'
                  : 'Hỏi Trợ Lý Tư Vấn về ăn chay...'
              }
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              type="submit"
              className="btn btn-success"
              aria-label="Gửi tin nhắn"
              disabled={!draft.trim()}
            >
              <i className="bi bi-send-fill" aria-hidden="true" />
            </button>
          </form>
          <p className="cx-chat-disclaimer">
            Tra cứu công thức và trích nội dung hướng dẫn nấu ăn.
          </p>
        </section>
      )}
      <button
        ref={launcher}
        type="button"
        className={`cx-chat-launcher ${open ? 'is-open' : ''}`}
        aria-label={open ? 'Thu gọn Trợ Lý Tư Vấn' : 'Mở Trợ Lý Tư Vấn'}
        aria-expanded={open}
        aria-controls="cx-chat-panel"
        onClick={() => setOpen(!open)}
      >
        <i
          className={`bi bi-${open ? 'chevron-down' : 'chat-dots-fill'}`}
          aria-hidden="true"
        />
        {!open && <span>Trợ lý ChayXanh</span>}
      </button>
    </div>
  );
}
