// D:/SWP391/SWP391/client/src/features/chat/hooks/useChatPhoto.js
// Hook xử lý gửi ảnh món ăn trong chat để AI nhận diện và cảnh báo thành phần không phù hợp chế độ ăn / dị ứng.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { analyzeFoodImage, fileToBase64 } from '../../../services/foodScannerService.js';
import { resolveScannerAllergies } from '../../../utils/foodScanner.js';
import { friendlyAiError } from '../../../utils/aiHelpers.js';
import { getSession } from '../../../utils/session.js';

// Giới hạn 10 MB cho ảnh tải lên.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Kiểm tra ảnh trước khi gửi; trả về thông báo lỗi hoặc chuỗi rỗng nếu hợp lệ.
function photoError(file, allergies) {
  // Thiếu thông tin dị ứng thì không quét để tránh kết luận "an toàn" sai.
  if (allergies.incomplete) return 'Không thể xác định đầy đủ dị ứng đã lưu. Vui lòng tải lại hồ sơ trước khi quét ảnh.';
  if (!IMAGE_TYPES.includes(file.type)) return 'Chọn ảnh JPG, PNG hoặc WebP.';
  if (file.size > MAX_IMAGE_BYTES) return 'Ảnh cần có dung lượng tối đa 10 MB.';
  return '';
}

// Chuyển ảnh sang base64 rồi gọi API phân tích; kiểm tra active() sau mỗi bước await để bỏ kết quả đã bị hủy/hết hạn.
async function analyzePhoto(operation, file) {
  try {
    const image = await fileToBase64(file);
    if (!operation.active()) return;
    const response = await analyzeFoodImage({ imageBase64: image.base64, mimeType: image.mimeType,
      dietTypeId: operation.dietTypeId, allergies: operation.allergies, scanType: 'AUTO' }, operation.signal);
    if (!operation.active()) return;
    if (!response?.success || !response.data) throw new Error(response?.message || 'Không thể nhận diện món ăn.');
    operation.update({ pending: false, result: response.data });
  } catch (failure) {
    if (operation.active()) operation.update({ pending: false, error: true, text: friendlyAiError(failure) });
  } finally {
    operation.finish();
  }
}

// Hook quét ảnh trong chat; trả về contextKey (ngữ cảnh quét) và handler attachPhoto cho input file.
export function useChatPhoto({ user, ingredients, dietTypeId, controller: controllerRef, nextId: nextIdRef, setMessages, setBusy, setError, blocked }) {
  const userId = user?.user_id || null;
  const allergies = resolveScannerAllergies(user, ingredients);
  // Khóa ngữ cảnh gồm người dùng, chế độ ăn và dị ứng; khi đổi thì kết quả quét cũ không còn đúng nữa.
  const contextKey = JSON.stringify([userId, dietTypeId, [...allergies.names].sort(), allergies.incomplete]);
  const context = useRef(contextKey);
  useLayoutEffect(() => { context.current = contextKey; }, [contextKey]);
  const request = useRef(null);
  const previews = useRef(new Set());

  // Ngữ cảnh thay đổi -> xóa kết quả quét cũ, hủy request và thu hồi các object URL xem trước để tránh rò rỉ bộ nhớ.
  useEffect(() => {
    const urls = previews.current;
    setMessages((previous) => previous.filter((message) => !message.scanContext || message.scanContext === contextKey));
    return () => {
      request.current?.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, [contextKey, setMessages]);

  // Khởi tạo một lần quét: tạo AbortController, thêm tin nhắn ảnh + tin chờ kết quả và trả về các hàm điều khiển.
  function startPhoto(file) {
    const current = new AbortController();
    controllerRef.current = current;
    request.current = current;
    const questionId = nextIdRef.current++;
    const replyId = nextIdRef.current++;
    const url = URL.createObjectURL(file);
    previews.current.add(url);
    // Chỉ cập nhật tin nhắn khi request này vẫn là request hiện hành, cùng ngữ cảnh và cùng người dùng.
    const owned = () => controllerRef.current === current && context.current === contextKey && (getSession()?.user?.user_id || null) === userId;
    const active = () => owned() && !current.signal.aborted;
    const update = (patch) => { if (owned()) setMessages((previous) => previous.map((message) => message.id === replyId ? { ...message, ...patch } : message)); };
    const finish = () => {
      if (request.current === current) request.current = null;
      if (controllerRef.current === current) { controllerRef.current = null; setBusy(false); }
    };
    current.signal.addEventListener('abort', () => {
      update({ pending: false, text: 'Đã dừng phân tích ảnh.' });
      URL.revokeObjectURL(url); previews.current.delete(url);
      setMessages((previous) => previous.map((message) => message.id === questionId ? { ...message, image: undefined } : message));
      finish();
    }, { once: true });
    setMessages((previous) => [...previous,
      { id: questionId, ownerId: userId, scanContext: contextKey, role: 'user', kind: 'foodScanRequest', text: `Quét ảnh món ăn: ${file.name}`, image: url },
      { id: replyId, ownerId: userId, scanContext: contextKey, role: 'assistant', kind: 'foodScan', pending: true },
    ]);
    setBusy(true); setError('');
    return { active, update, finish, signal: current.signal, dietTypeId, allergies: allergies.names };
  }

  // Handler chọn file: reset input để có thể chọn lại cùng một ảnh, kiểm tra hợp lệ rồi bắt đầu phân tích.
  function attachPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || blocked || (controllerRef.current && !controllerRef.current.signal.aborted)) return;
    const error = photoError(file, allergies);
    if (error) { setError(error); return; }
    return analyzePhoto(startPhoto(file), file);
  }

  return { contextKey, attachPhoto };
}
