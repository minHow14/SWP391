// client/src/features/chat/components/ChatBox.jsx
import ChatMessage from './ChatMessage.jsx';
import MealPlanDialog from '../../mealPlan/components/MealPlanDialog.jsx';
import { useChatBox } from '../hooks/useChatBox.js';
import { Link } from 'react-router';
import { hasBodyMeasurements } from '../../profile/utils/healthProfile.js';

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
  { label: 'Chỉ số BMI', icon: 'bar-chart', text: 'Tôi muốn tính chỉ số BMI', requiresProfile: true },
];

export default function ChatBox({ dietTypeId }) {
  const { catalog, user, open, setOpen, draft, setDraft, mode, error, busy, usage, planDialog, setPlanDialog, dialogPlan, contextPlan, setContextPlan, messages, input, launcher, messageList, fileInput, ask, stopAnswer, sendMessage, openMealPlan, showPlanInChat, askAboutPlan, selectSummary, attachPhoto } = useChatBox({ dietTypeId });
  const needsProfile = Boolean(user) && !hasBodyMeasurements(user.health_profile);

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
              <ChatMessage key={message.id} message={message} busy={busy} actions={{ ask, openMealPlan, askAboutPlan }} />
            ))}
          </div>
          <div className="cx-chat-suggestions" aria-label="Chủ đề gợi ý">
            {suggestions.map((suggestion) => suggestion.requiresProfile && needsProfile ? (
              <Link key={suggestion.label} to="/ho-so">Bổ sung hồ sơ để xem BMI</Link>
            ) : (
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
