// D:/SWP391/SWP391/client/src/features/ingredients/hooks/useIngredientPhotoScan.js
// Hook quét ảnh nguyên liệu bằng AI Vision và ghép kết quả với từ điển nguyên liệu.
import { useEffect, useRef, useState } from 'react';
import { analyzeFoodImage, fileToBase64 } from '../../../services/foodScannerService.js';
import { matchIngredients } from '../utils/matchIngredients.js';

// Giới hạn ảnh giống phía server: tối đa 10 MB, chỉ JPG/PNG/WebP.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IDLE = Object.freeze({ photo: null, status: 'idle', names: [], matches: [], error: '' });

/** Nhận diện nguyên liệu từ ảnh bằng AI Vision rồi ghép với từ điển nguyên liệu. */
export function useIngredientPhotoScan({ ingredients, dietId }) {
  const [state, setState] = useState(IDLE);
  const request = useRef(null);
  // Thu hồi URL xem trước khi đổi ảnh hoặc unmount; hủy request khi unmount.
  const photoUrl = state.photo?.url;
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);
  useEffect(() => () => request.current?.abort(), []);

  // Quét một tệp ảnh; trả về danh sách nguyên liệu khớp (rỗng nếu lỗi hoặc bị hủy).
  async function scan(file) {
    if (!file) return [];
    request.current?.abort();
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setState({ ...IDLE, error: 'Chọn ảnh JPG, PNG hoặc WebP dưới 10 MB.' });
      return [];
    }
    const controller = new AbortController();
    request.current = controller;
    setState({ ...IDLE, status: 'analyzing', photo: { url: URL.createObjectURL(file), name: file.name, file } });
    try {
      const image = await fileToBase64(file);
      controller.signal.throwIfAborted();
      const response = await analyzeFoodImage(
        { imageBase64: image.base64, mimeType: image.mimeType, dietTypeId: dietId },
        controller.signal,
      );
      if (controller.signal.aborted) return [];
      if (!response?.success || !response.data) throw new Error(response?.message || 'Không thể nhận diện nguyên liệu.');
      const { identifiedIngredients, dishName } = response.data;
      // Ghép cả tên món AI nhận ra vì đôi khi ảnh chỉ chứa một nguyên liệu được nhận là "món".
      const matches = matchIngredients([...identifiedIngredients, dishName], ingredients);
      setState((previous) => ({ ...previous, status: 'done', names: identifiedIngredients, matches }));
      return matches;
    } catch (failure) {
      if (!controller.signal.aborted) setState((previous) => ({ ...previous, status: 'error', error: failure.message }));
      return [];
    }
  }

  // Hủy quét đang chạy và xóa trạng thái.
  function clear() {
    request.current?.abort();
    setState(IDLE);
  }

  return { ...state, scan, clear };
}
