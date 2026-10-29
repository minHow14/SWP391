// D:/SWP391/SWP391/client/src/features/chat/hooks/useChatBox.js
import { useEffect, useRef, useState } from 'react';
import { useDatabase } from '../../../hooks/useDatabase.js';
import { getChatUsage } from '../../../services/aiApi.js';
import { detectYoutubeMessage } from '../../videoRecipeSummary/utils/youtubeMessage.js';
import { useVideoRecipeSummary } from '../../videoRecipeSummary/hooks/useVideoRecipeSummary.js';
import { useChatRequest } from './useChatRequest.js';
import { getSession } from '../../../utils/session.js';
import { hasBodyMeasurements } from '../../profile/utils/healthProfile.js';

export function useChatBox({ dietTypeId }) {
  const { data: catalog, user, refreshUser } = useDatabase();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState('chat');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState(null);
  const [planDialog, setPlanDialog] = useState(false);
  const [dialogPlan, setDialogPlan] = useState(null);
  const [contextPlan, setContextPlan] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
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
  const userId = user?.user_id || null;
  const video = useVideoRecipeSummary({ userId, enabled: open, setMessages, nextId });

  useEffect(() => {
    messagesRef.current = messages.filter((message) => message.kind === 'welcome' || message.ownerId === userId);
  });
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    controller.current?.abort();
    controller.current = null;
    setMessages((previous) => previous.filter((message) => message.kind === 'welcome'));
    setBusy(false);
    setUsage(null);
    setError('');
    setDraft('');
    setMode('chat');
    setContextPlan(null);
    setDialogPlan(null);
    setPlanDialog(false);
    setHistoryOpen(false);
    attachmentUrls.current.forEach((url) => URL.revokeObjectURL(url));
    attachmentUrls.current.length = 0;
  }, [userId]);
  useEffect(() => {
    if (!open) return undefined;
    const request = new AbortController();
    getChatUsage(request.signal).then((result) => { if (!request.signal.aborted) setUsage(result); }).catch(() => {});
    return () => request.abort();
  }, [open, userId]);
  useEffect(() => {
    // Session có thể chưa có chiều cao/cân nặng vừa lưu; xác nhận lại với server trước khi chặn tính năng BMI.
    if ((open || planDialog) && userId && !hasBodyMeasurements(user.health_profile)) refreshUser?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, planDialog, userId]);
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
    const questionId = nextId.current++;
    const replyId = nextId.current++;
    setMessages((previous) => [
      ...previous,
      { id: questionId, ownerId: userId, role: 'user', text: question, image },
      { id: replyId, ownerId: userId, role: 'assistant', ...reply },
    ]);
    setError('');
  }

  const ask = useChatRequest({ controller, messagesRef, nextId, setMessages, setBusy, setError, setUsage, dietTypeId, contextPlan, userId });

  function stopAnswer() {
    controller.current?.abort();
  }

  function sendMessage(text = draft, forcedMode) {
    const question = text.trim();
    if (!question || busy || video.busy) return;
    const activeMode = forcedMode || mode;
    try {
      const source = detectYoutubeMessage(question);
      setError('');
      if (source) video.send(source, question);
      else if (activeMode === 'summary') { setError('Vui lòng dán một link YouTube tiếng Việt, tối đa 11 phút.'); return; }
      else ask(question);
    } catch (failure) { setError(failure.message); return; }
    setDraft('');
    setMode('chat');
    setHistoryOpen(false);
    input.current?.focus();
  }

  function openMealPlan(plan = null) {
    setDialogPlan(plan);
    setPlanDialog(true);
  }

  function showPlanInChat(plan) {
    if ((getSession()?.user?.user_id || null) !== userId) return;
    const id = nextId.current++;
    setMessages((previous) => [...previous, { id, ownerId: userId, role: 'assistant', kind: 'plan', plan, ...plan.chat }]);
    getChatUsage().then((result) => { if ((getSession()?.user?.user_id || null) === userId) setUsage(result); }).catch(() => {});
  }

  function restoreHistory(record) {
    if ((getSession()?.user?.user_id || null) !== userId) return;
    const common = { ownerId: userId, generationId: record.id };
    let restored;
    if (record.status !== 'COMPLETED') {
      restored = [{ ...common, id: nextId.current++, role: 'assistant', error: true,
        text: record.errorMessage || 'Yêu cầu này chưa có kết quả hoàn tất.' }];
    } else if (record.type === 'CHAT' && record.responsePayload?.reply) {
      restored = [{ ...common, id: nextId.current++, role: 'user', kind: 'chat', text: record.requestPayload?.message },
        { ...common, id: nextId.current++, role: 'assistant', kind: 'chat', text: record.responsePayload.reply }];
    } else if (record.type === 'MEAL_PLAN' && Array.isArray(record.responsePayload?.weeklyPlan)) {
      const plan = record.responsePayload;
      restored = [{ ...common, id: nextId.current++, role: 'assistant', kind: 'plan', plan, title: plan.title, ...plan.chat }];
    } else { setError('Lịch sử này chưa có nội dung hợp lệ để mở.'); return; }
    setMessages((previous) => previous.some((message) => message.generationId === record.id) ? previous : [...previous, ...restored]);
    setHistoryOpen(false);
  }

  function askAboutPlan(plan) {
    setContextPlan(plan);
    setOpen(true);
    setDraft('Giải thích vì sao thực đơn này phù hợp với mục tiêu của tôi.');
    setTimeout(() => input.current?.focus(), 0);
  }

  function selectSummary() {
    if (!user) { setError('Vui lòng đăng nhập để tạo công thức từ video.'); return; }
    setError('');
    addExchange('Tạo công thức từ video', { text: 'Dán link YouTube nấu ăn tiếng Việt dài tối đa 11 phút rồi bấm Gửi. Công thức sẽ xuất hiện tại đây.' });
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

  const visibleMessages = messages.filter((message) => message.kind === 'welcome' || message.ownerId === userId);
  return { catalog, user, open, setOpen, draft, setDraft, mode, error, busy: busy || video.busy, videoBusy: video.busy, retryVideo: video.retry, usage, planDialog, setPlanDialog, dialogPlan, contextPlan, setContextPlan, messages: visibleMessages, input, launcher, messageList, fileInput, ask, stopAnswer, sendMessage, openMealPlan, showPlanInChat, askAboutPlan, selectSummary, attachPhoto, historyOpen, setHistoryOpen, restoreHistory };
}
