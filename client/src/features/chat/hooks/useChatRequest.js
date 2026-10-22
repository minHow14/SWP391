// client/src/features/chat/hooks/useChatRequest.js
import { getChatUsage, streamChat } from '../../../services/aiApi.js';
import { getDatabaseReply } from '../../../utils/chatReplies.js';
import { chatHistory, dietTypeToAi, friendlyAiError, isQuotaError, planToMenuContext } from '../../../utils/aiHelpers.js';

export function useChatRequest({ controller, messagesRef, nextId, setMessages, setBusy, setError, setUsage, dietTypeId, contextPlan }) {
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
      if (remaining !== null && remaining !== undefined) { setUsage((previous) => (previous && !previous.unlimited ? { ...previous, remaining_questions: remaining, remaining } : previous)); } else { getChatUsage().then(setUsage).catch(() => {}); }
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

  return ask;
}
