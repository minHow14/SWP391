// D:/SWP391/SWP391/client/src/features/ingredients/hooks/useIngredientLookup.js
// Hook tạo thông tin nguyên liệu mới bằng AI qua job bất đồng bộ (tạo job rồi hỏi trạng thái định kỳ).
import { useEffect, useRef, useState } from 'react';
import { ingredientLookupService } from '../../../services/ingredientLookupService.js';
import { fileToBase64 } from '../../../services/foodScannerService.js';

// Hỏi trạng thái mỗi giây, tối đa 4 phút trước khi báo người dùng thử lại sau.
const POLL_INTERVAL_MS = 1_000;
const MAX_WAIT_MS = 240_000;
const IDLE = Object.freeze({ status: 'idle', name: '', error: '' });

// Chờ một chu kỳ hỏi trạng thái; dừng ngay khi request bị hủy.
function pause(signal) {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, POLL_INTERVAL_MS);
    signal.addEventListener('abort', abort, { once: true });
  });
}

// Tạo job tra cứu (kèm ảnh nếu có) rồi hỏi trạng thái tới khi hoàn tất, thất bại hoặc quá thời gian chờ.
async function generateIngredient({ name, photo, signal }) {
  const image = photo?.file ? await fileToBase64(photo.file) : null;
  signal.throwIfAborted();
  let job = await ingredientLookupService.create({ ingredientName: name,
    ...(image && { photo: { imageBase64: image.base64, mimeType: image.mimeType } }) }, signal);
  const deadline = Date.now() + MAX_WAIT_MS;
  while (['PENDING', 'PROCESSING'].includes(job.status)) {
    if (Date.now() >= deadline) throw new Error('Nguyên liệu vẫn đang được xử lý. Vui lòng thử lại sau.');
    await pause(signal);
    job = await ingredientLookupService.get(job.jobId, signal);
  }
  signal.throwIfAborted();
  if (job.status === 'FAILED') throw new Error(job.errorMessage || 'Chưa thể tạo thông tin nguyên liệu. Vui lòng thử lại.');
  return job.ingredient;
}

// Hook trả về trạng thái tra cứu cùng hàm lookup và clear; onSaved được gọi sau khi nguyên liệu đã lưu.
export function useIngredientLookup({ onSaved }) {
  const [state, setState] = useState(IDLE);
  const request = useRef(null);
  // Nhớ nguyên liệu vừa tạo để khi thử lại (do bước tải lại từ điển lỗi) không phải gọi AI lần nữa.
  const saved = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  // Tra cứu một tên nguyên liệu; bỏ qua nếu đang có request khác chạy.
  async function lookup(name, photo) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setState({ status: 'generating', name, error: '' });
    try {
      const ingredient = saved.current?.name === name ? saved.current.ingredient
        : await generateIngredient({ name, photo, signal: controller.signal });
      controller.signal.throwIfAborted();
      saved.current = { name, ingredient };
      setState({ status: 'refreshing', name, error: '' });
      await onSaved(ingredient, controller.signal);
      controller.signal.throwIfAborted();
      setState({ status: 'done', name, error: '' });
    } catch (failure) {
      if (!controller.signal.aborted) setState({ status: 'error', name,
        error: `${saved.current?.name === name ? 'Đã lưu nguyên liệu. ' : ''}${failure.message || 'Không thể tra cứu nguyên liệu.'}` });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  // Hủy request đang chạy và đưa trạng thái về ban đầu.
  function clear() {
    request.current?.abort();
    request.current = null;
    saved.current = null;
    setState(IDLE);
  }

  return { ...state, busy: ['generating', 'refreshing'].includes(state.status), lookup, clear };
}
