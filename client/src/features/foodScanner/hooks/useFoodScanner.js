// D:/SWP391/SWP391/client/src/features/foodScanner/hooks/useFoodScanner.js
import { useEffect, useRef, useState } from 'react';
import { analyzeIngredients } from '../../../utils/foodScanner.js';
import { analyzeFoodImage, fileToBase64 } from '../../../services/foodScannerService.js';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function useFoodScanner(dietId) {
  const [photo, setPhoto] = useState(null);
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [scanType, setScanType] = useState('AUTO');
  const [result, setResult] = useState(null);
  const [textResult, setTextResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const request = useRef(null);
  const active = useRef(true);
  const fileVersion = useRef(0);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; request.current?.abort(); };
  }, []);

  async function selectFile(file) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setError('Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
    if (file.size > MAX_IMAGE_BYTES) return setError('Ảnh quá lớn. Vui lòng chọn ảnh tối đa 10 MB.');
    const version = ++fileVersion.current;
    request.current?.abort(); setLoading(false); setResult(null); setError('');
    try {
      const image = await fileToBase64(file);
      if (active.current && version === fileVersion.current) setPhoto({ ...image, name: file.name });
    } catch {
      if (active.current && version === fileVersion.current) setError('Không thể đọc file ảnh. Vui lòng thử lại.');
    }
  }

  async function analyze(event) {
    event.preventDefault();
    if (!photo?.base64 || loading) return;
    const controller = new AbortController();
    request.current?.abort(); request.current = controller;
    setLoading(true); setError(''); setResult(null); setTextResult(null);
    try {
      const response = await analyzeFoodImage({ imageBase64: photo.base64, mimeType: photo.mimeType,
        dietTypeId: dietId, scanType, dishName: name.trim(), allergies: [] }, controller.signal);
      if (controller.signal.aborted) return;
      if (!response?.success || !response.data) throw new Error(response?.message || 'Không thể nhận diện món ăn.');
      setResult(response.data); setHistoryVersion((value) => value + 1);
    } catch (failure) {
      if (!controller.signal.aborted) { setError(failure.message); setHistoryVersion((value) => value + 1); }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function analyzeText(event) {
    event.preventDefault();
    setResult(null);
    if (!ingredients.trim()) { setTextResult(null); return setError('Vui lòng nhập thành phần trên nhãn để kiểm tra.'); }
    setTextResult(analyzeIngredients(ingredients, dietId)); setError('');
  }

  function restore(record) {
    request.current?.abort(); setLoading(false); setResult(null); setTextResult(null); setPhoto(null);
    setError(record.status === 'COMPLETED' ? '' : record.errorMessage || 'Lần quét này chưa có kết quả hoàn tất.');
    if (record.status === 'COMPLETED') setResult(record.responsePayload);
  }

  function removePhoto() { fileVersion.current += 1; setPhoto(null); setResult(null); }
  return { photo, name, setName, ingredients, setIngredients, scanType, setScanType, result, textResult,
    error, loading, historyVersion, selectFile, analyze, analyzeText, restore, removePhoto };
}
