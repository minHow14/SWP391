// D:/SWP391/SWP391/client/src/features/ingredients/hooks/useIngredientPhotoScan.js
import { useEffect, useRef, useState } from 'react';
import { analyzeFoodImage, fileToBase64 } from '../../../services/foodScannerService.js';
import { matchIngredients } from '../utils/matchIngredients.js';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IDLE = Object.freeze({ photo: null, status: 'idle', names: [], matches: [], error: '' });

/** Nhận diện nguyên liệu từ ảnh bằng AI Vision rồi ghép với từ điển nguyên liệu. */
export function useIngredientPhotoScan({ ingredients, dietId }) {
  const [state, setState] = useState(IDLE);
  const request = useRef(null);
  const photoUrl = state.photo?.url;
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);
  useEffect(() => () => request.current?.abort(), []);

  async function scan(file) {
    if (!file) return [];
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setState({ ...IDLE, error: 'Chọn ảnh JPG, PNG hoặc WebP dưới 10 MB.' });
      return [];
    }
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setState({ ...IDLE, status: 'analyzing', photo: { url: URL.createObjectURL(file), name: file.name } });
    try {
      const image = await fileToBase64(file);
      const response = await analyzeFoodImage(
        { imageBase64: image.base64, mimeType: image.mimeType, dietTypeId: dietId },
        controller.signal,
      );
      if (controller.signal.aborted) return [];
      if (!response?.success || !response.data) throw new Error(response?.message || 'Không thể nhận diện nguyên liệu.');
      const { identifiedIngredients, dishName } = response.data;
      const matches = matchIngredients([...identifiedIngredients, dishName], ingredients);
      setState((previous) => ({ ...previous, status: 'done', names: identifiedIngredients, matches }));
      return matches;
    } catch (failure) {
      if (!controller.signal.aborted) setState((previous) => ({ ...previous, status: 'error', error: failure.message }));
      return [];
    }
  }

  function clear() {
    request.current?.abort();
    setState(IDLE);
  }

  return { ...state, scan, clear };
}
