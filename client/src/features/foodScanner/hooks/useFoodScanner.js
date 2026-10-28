// client/src/features/foodScanner/hooks/useFoodScanner.js
import { useEffect, useState } from 'react';
import { analyzeIngredients } from '../../../utils/foodScanner.js';
import { analyzeFoodImage, fileToBase64 } from '../../../services/foodScannerService.js';

export function useFoodScanner(scanDemo, demoImage, dietId) {
  const [activeTab, setActiveTab] = useState('image'); // 'image' | 'text'
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [scanType, setScanType] = useState('AUTO'); // 'AUTO' | 'LABEL' | 'DISH'
  const [photo, setPhoto] = useState(null); // { url, name, base64, mimeType, demo }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [textResult, setTextResult] = useState(null);
  const [aiResult, setAiResult] = useState(null);

  useEffect(() => {
    if (!photo || photo.demo) return;
    return () => {
      if (photo.url && photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
    };
  }, [photo]);

  async function handleFileSelected(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ảnh quá lớn. Vui lòng chọn ảnh dưới 10 MB.');
      return;
    }

    try {
      const { base64, mimeType, dataUrl } = await fileToBase64(file);
      setPhoto({
        url: dataUrl,
        name: file.name,
        base64,
        mimeType,
        demo: false,
      });
      setAiResult(null);
      setError('');
    } catch {
      setError('Không thể đọc file ảnh. Vui lòng thử lại.');
    }
  }

  function useDemoRecipe() {
    if (!scanDemo) return;
    setName(scanDemo.name);
    setIngredients(scanDemo.ingredients);
    setPhoto({
      url: demoImage,
      name: 'Ảnh công thức gợi ý',
      demo: true,
      base64: null,
      mimeType: 'image/jpeg',
    });
    setTextResult({ ...analyzeIngredients(scanDemo.ingredients, dietId), ...scanDemo, dietId, demo: true });
    setAiResult(null);
    setError('');
  }

  async function handleAiAnalyze(event) {
    if (event) event.preventDefault();

    if (!photo || (!photo.base64 && !photo.demo)) {
      setError('Vui lòng tải ảnh món ăn hoặc bao bì lên trước khi phân tích AI.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const base64Payload =
        photo.base64 ||
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const response = await analyzeFoodImage({
        imageBase64: base64Payload,
        mimeType: photo.mimeType || 'image/jpeg',
        dietTypeId: dietId,
        scanType,
        dishName: name.trim(),
        allergies: [],
      });

      if (response && response.success && response.data) {
        setAiResult(response.data);
      } else {
        throw new Error(response?.message || 'Không thể nhận diện món ăn.');
      }
    } catch (err) {
      setError(err?.message || 'Đã xảy ra lỗi khi gọi AI. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }

  function handleTextAnalyze(event) {
    event.preventDefault();
    if (!ingredients.trim()) {
      setError('Vui lòng nhập thành phần trên nhãn để kiểm tra.');
      setTextResult(null);
      return;
    }
    setTextResult({
      ...analyzeIngredients(ingredients, dietId),
      name,
      ingredients,
      dietId,
      demo: photo?.demo ?? false,
    });
    setAiResult(null);
    setError('');
  }

  return {
    activeTab,
    setActiveTab,
    name,
    setName,
    ingredients,
    setIngredients,
    scanType,
    setScanType,
    photo,
    setPhoto,
    loading,
    error,
    setError,
    textResult,
    aiResult,
    handleFileSelected,
    useDemoRecipe,
    handleAiAnalyze,
    handleTextAnalyze,
  };
}
