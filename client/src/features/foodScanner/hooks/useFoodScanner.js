// D:/SWP391/SWP391/client/src/features/foodScanner/hooks/useFoodScanner.js
import { useEffect, useRef, useState } from 'react';
import { analyzeIngredients } from '../../../utils/foodScanner.js';
import { analyzeFoodImage, fileToBase64 } from '../../../services/foodScannerService.js';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const allergyKey = (allergies) => JSON.stringify([...allergies].sort());

export function useFoodScanner(dietId, allergies = [], allergyError = '') {
  const [photo, setPhoto] = useState(null);
  const [name, updateName] = useState('');
  const [ingredients, updateIngredients] = useState('');
  const [scanType, updateScanType] = useState('AUTO');
  const [state, setState] = useState({});
  const [historyVersion, setHistoryVersion] = useState(0);
  const request = useRef(null);
  const fileVersion = useRef(0);
  const contextKey = JSON.stringify([dietId, allergyKey(allergies), allergyError, name, ingredients, scanType]);
  const current = state.contextKey === contextKey ? state : {};
  // Render-time ownership prevents even a single frame of a verdict for another profile or input.
  useEffect(() => () => { request.current?.abort(); }, [contextKey]);
  useEffect(() => () => { fileVersion.current += 1; }, []);

  function invalidate() { request.current?.abort(); setState({}); }
  function change(setter, value) { invalidate(); setter(value); }

  async function selectFile(file) {
    if (!file) return;
    invalidate();
    const version = ++fileVersion.current;
    setPhoto(null);
    if (!IMAGE_TYPES.includes(file.type)) return setState({ contextKey, error: 'Vui lòng chọn ảnh JPG, PNG hoặc WebP.' });
    if (file.size > MAX_IMAGE_BYTES) return setState({ contextKey, error: 'Ảnh quá lớn. Vui lòng chọn ảnh tối đa 10 MB.' });
    try {
      const image = await fileToBase64(file);
      if (version === fileVersion.current) setPhoto({ ...image, name: file.name });
    } catch {
      if (version === fileVersion.current) setState({ contextKey, error: 'Không thể đọc file ảnh. Vui lòng thử lại.' });
    }
  }

  async function analyze(event) {
    event.preventDefault();
    if (!photo?.base64 || current.loading || allergyError) return;
    const controller = new AbortController();
    request.current?.abort(); request.current = controller;
    setState({ contextKey, loading: true });
    try {
      const response = await analyzeFoodImage({ imageBase64: photo.base64, mimeType: photo.mimeType,
        dietTypeId: dietId, scanType, dishName: name.trim(), allergies }, controller.signal);
      if (controller.signal.aborted) return;
      if (!response?.success || !response.data) throw new Error(response?.message || 'Không thể nhận diện món ăn.');
      setState({ contextKey, result: response.data }); setHistoryVersion((value) => value + 1);
    } catch (failure) {
      if (!controller.signal.aborted) {
        setState({ contextKey, error: failure.message }); setHistoryVersion((value) => value + 1);
      }
    }
  }

  function analyzeText(event) {
    event.preventDefault(); invalidate();
    if (!ingredients.trim()) return setState({ contextKey, error: 'Vui lòng nhập thành phần trên nhãn để kiểm tra.' });
    setState({ contextKey, textResult: analyzeIngredients(ingredients, dietId) });
  }

  function restore(record) {
    invalidate();
    if (record.status !== 'COMPLETED') return setState({ contextKey, error: record.errorMessage || 'Lần quét này chưa có kết quả hoàn tất.' });
    const payload = record.requestPayload;
    if (allergyError || payload?.dietTypeId !== dietId || allergyKey(payload?.allergies || []) !== allergyKey(allergies)) {
      return setState({ contextKey, error: 'Kết quả lịch sử có chế độ ăn hoặc dị ứng khác hồ sơ hiện tại. Hãy chọn đúng chế độ ăn và quét lại.' });
    }
    const historicalResult = record.responsePayload;
    const result = dietId === 6 && historicalResult?.status === 'clear' ? { ...historicalResult,
      status: 'warning', summary: `Keto: chưa thể xác minh carb thuần dưới 50 g/ngày từ một ảnh; cần khẩu phần, chất xơ và toàn bộ bữa ăn trong ngày. ${historicalResult.summary || ''}`,
    } : historicalResult;
    setState({ contextKey, result });
  }

  function removePhoto() { fileVersion.current += 1; invalidate(); setPhoto(null); }
  return { photo, name, setName: (value) => change(updateName, value), ingredients,
    setIngredients: (value) => change(updateIngredients, value), scanType,
    setScanType: (value) => change(updateScanType, value), result: current.result || null, textResult: current.textResult || null,
    error: allergyError || current.error || '', loading: Boolean(current.loading), blocked: Boolean(allergyError),
    allergies, historyVersion, selectFile, analyze, analyzeText, restore, removePhoto };
}
