import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { getDatabaseReply, summarizeText } from '../lib/chatReplies.js';
import { getChatUsage, streamChat } from '../lib/aiApi.js';
import { chatHistory, dietTypeToAi, friendlyAiError, isQuotaError, planToMenuContext } from '../lib/aiHelpers.js';
import { useDatabase } from '../lib/databaseContext.js';
import MarkdownMessage from './MarkdownMessage.jsx';
import MealPlanDialog from './MealPlanDialog.jsx';
import '../ChatAi.css';

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

export default function ChatBox({ dietTypeId }) {
  const { data: catalog, user } = useDatabase();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState('chat');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState(null);
  const [planDialog, setPlanDialog] = useState(false);
  const [dialogPlan, setDialogPlan] = useState(null);
  const [contextPlan, setContextPlan] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'assistant',
      kind: 'welcome',
      text: 'Xin chào bạn! Mình là Trợ Lý ChayXanh. Cùng khám phá công thức chay, chuẩn bị thực đơn tuần hoặc xem nhanh nội dung hướng dẫn nấu ăn nhé.',
    },
  ]);
  const input = useRef(null);
  const launcher = useRef(null);
  const messageList = useRef(null);
  const fileInput = useRef(null);
  const attachmentUrls = useRef([]);
  const nextId = useRef(1);
  const controller = useRef(null);
  const messagesRef = useRef([]);

  useEffect(() => {
    messagesRef.current = messages;
  });
  useEffect(() => () => controller.current?.abort(), []);
  const userId = user?.user_id;
  useEffect(() => {
    if (!open) return undefined;
    const request = new AbortController();
    getChatUsage(request.signal).then(setUsage).catch(() => {});
    return () => request.abort();
  }, [open, userId]);
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

  async function ask(question, { retry = false } = {}) {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    // Bỏ bong bóng lỗi cũ; khi thử lại thì bỏ cả tin hỏi cuối để không bị lặp trong lịch sử
    const kept = messagesRef.current.filter((message) => !message.error);
    const last = kept.at(-1);
    const base = retry && last?.role === 'user' && last.text === question ? kept.slice(0, -1) : kept;
    const userMessageId = nextId.current++;
    const replyId = nextId.current++;
    const update = (patch) =>
      setMessages((previous) => previous.map((message) => (message.id === replyId ? { ...message, ...patch } : message)));
    setMessages([
      ...base,
      { id: userMessageId, role: 'user', kind: 'chat', text: question },
      { id: replyId, role: 'assistant', kind: 'chat', text: '', pending: true },
    ]);
    setBusy(true);
    setError('');
    try {
      const { remaining } = await streamChat({
        message: question,
        history: chatHistory(base),
        dietaryType: dietTypeToAi(dietTypeId),
        menuContext: contextPlan ? planToMenuContext(contextPlan) : undefined,
        signal: current.signal,
        onToken: (token) =>
          setMessages((previous) =>
            previous.map((message) => (message.id === replyId ? { ...message, text: message.text + token } : message))
          ),
      });
      update({ pending: false });
      setMessages((previous) =>
        previous.map((message) =>
          message.id === replyId && !message.text
            ? { ...message, text: 'Trợ lý chưa có câu trả lời. Bạn thử hỏi lại nhé.' }
            : message
        )
      );
      setUsage((previous) => (previous && !previous.unlimited ? { ...previous, remaining_questions: remaining } : previous));
    } catch (failure) {
      if (current.signal.aborted) {
        update({ pending: false });
      } else {
        const unavailable = ['NETWORK_ERROR', 'AI_PROVIDER_ERROR', 'SERVICE_UNAVAILABLE'].includes(failure.code);
        let lookup = null;
        if (unavailable) {
          // Dịch vụ AI không dùng được: dùng tra cứu công thức của ChayXanh thay vì để người dùng trống tay
          lookup = await getDatabaseReply(question).catch(() => null);
        }
        if (lookup) {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === replyId
                ? { id: replyId, role: 'assistant', kind: 'lookup', ...lookup, footer: 'Trợ lý AI đang bận nên đây là kết quả tra cứu công thức. Bạn có thể thử hỏi lại sau.' }
                : message
            )
          );
        } else {
          update({
            pending: false,
            error: true,
            text: friendlyAiError(failure),
            requestId: failure.requestId,
            quota: isQuotaError(failure),
            retryQuestion: question,
          });
        }
        if (isQuotaError(failure)) getChatUsage().then(setUsage).catch(() => {});
      }
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  function stopAnswer() {
    controller.current?.abort();
  }

  function sendMessage(text = draft, forcedMode) {
    const question = text.trim();
    if (!question || busy) return;
    const activeMode = forcedMode || mode;
    if (activeMode === 'summary') {
      addExchange(question, summarizeText(question));
    } else {
      ask(question);
    }
    setDraft('');
    setMode('chat');
    input.current?.focus();
  }

  function openMealPlan(plan = null) {
    setDialogPlan(plan);
    setPlanDialog(true);
  }

  function showPlanInChat(plan) {
    const id = nextId.current++;
    setMessages((previous) => [...previous, { id, role: 'assistant', kind: 'plan', plan, ...plan.chat }]);
    getChatUsage().then(setUsage).catch(() => {});
  }

  function askAboutPlan(plan) {
    setContextPlan(plan);
    setOpen(true);
    setDraft('Giải thích vì sao thực đơn này phù hợp với mục tiêu của tôi.');
    setTimeout(() => input.current?.focus(), 0);
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
            {usage && (
              <span className="cx-chat-usage" title="Khách có 3 lượt mỗi ngày, dùng chung cho hỏi đáp và tạo thực đơn">
                {usage.unlimited ? 'Không giới hạn' : `Còn ${usage.remaining_questions}/${usage.daily_limit} lượt`}
              </span>
            )}
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
            <button type="button" onClick={() => openMealPlan()}>
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
          {contextPlan && (
            <div className="cx-chat-context">
              <span>Đang hỏi về: {contextPlan.title}</span>
              <button type="button" onClick={() => setContextPlan(null)}>Bỏ</button>
            </div>
          )}
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
            {busy ? (
              <button type="button" className="btn btn-success" aria-label="Dừng trả lời" onClick={stopAnswer}>
                <i className="bi bi-stop-fill" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-success"
                aria-label="Gửi tin nhắn"
                disabled={!draft.trim()}
              >
                <i className="bi bi-send-fill" aria-hidden="true" />
              </button>
            )}
          </form>
          <p className="cx-chat-disclaimer">
            Trợ lý AI chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ hoặc chuyên gia dinh dưỡng.
          </p>
        </section>
      )}
      {planDialog && (
        <MealPlanDialog
          key={dialogPlan?.title || 'new'}
          catalog={catalog}
          user={user}
          dietTypeId={dietTypeId}
          initialPlan={dialogPlan}
          onClose={() => setPlanDialog(false)}
          onDone={showPlanInChat}
          onAsk={askAboutPlan}
        />
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
