// D:/SWP391/SWP391/client/src/features/chat/hooks/useChatBox.js
import { useEffect, useRef, useState } from 'react';
import { useDatabase } from '../../../hooks/useDatabase.js';
import { getChatUsage } from '../../../services/aiApi.js';
import { detectYoutubeMessage } from '../../videoRecipeSummary/utils/youtubeMessage.js';
import { isVideoRecipeMessage, useVideoRecipeSummary } from '../../videoRecipeSummary/hooks/useVideoRecipeSummary.js';
import { useChatRequest } from './useChatRequest.js';

export function useChatBox({ dietTypeId }) {
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
  const video = useVideoRecipeSummary({ userId: user?.user_id || null, enabled: open, setMessages, nextId });

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

  const ask = useChatRequest({ controller, messagesRef, nextId, setMessages, setBusy, setError, setUsage, dietTypeId, contextPlan });

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

  const visibleMessages = messages.filter((message) => !isVideoRecipeMessage(message) || message.ownerId === (user?.user_id || null));
  return { catalog, user, open, setOpen, draft, setDraft, mode, error, busy: busy || video.busy, videoBusy: video.busy, retryVideo: video.retry, usage, planDialog, setPlanDialog, dialogPlan, contextPlan, setContextPlan, messages: visibleMessages, input, launcher, messageList, fileInput, ask, stopAnswer, sendMessage, openMealPlan, showPlanInChat, askAboutPlan, selectSummary, attachPhoto };
}
