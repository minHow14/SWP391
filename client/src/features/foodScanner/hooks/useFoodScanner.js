// D:/SWP391/SWP391/client/src/features/foodScanner/hooks/useFoodScanner.js
// Hook xử lý logic trang Kiểm tra món: chọn ảnh, gọi AI phân tích, kiểm tra văn bản và khôi phục kết quả từ lịch sử.
import { useEffect, useRef, useState } from 'react';
import { analyzeIngredients } from '../../../utils/foodScanner.js';
import { analyzeFoodImage, fileToBase64 } from '../../../services/foodScannerService.js';

// Giới hạn ảnh giống phía server: tối đa 10 MB, chỉ JPG/PNG/WebP.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Khóa so sánh danh sách dị ứng không phụ thuộc thứ tự.
const allergyKey = (allergies) => JSON.stringify([...allergies].sort());

// Hook kiểm tra món; dietId là chế độ ăn, allergies là dị ứng đã lưu, allergyError báo không tải được dị ứng.
export function useFoodScanner(dietId, allergies = [], allergyError = '') {
  const [photo, setPhoto] = useState(null);
  const [name, updateName] = useState('');
  const [ingredients, updateIngredients] = useState('');
  const [scanType, updateScanType] = useState('AUTO');
  const [state, setState] = useState({});
  const [historyVersion, setHistoryVersion] = useState(0);
  const request = useRef(null);
  // fileVersion bỏ qua kết quả đọc ảnh cũ khi người dùng đã chọn ảnh khác hoặc rời trang.
  const fileVersion = useRef(0);
  // contextKey gói mọi đầu vào ảnh hưởng tới kết luận; kết quả chỉ được hiển thị khi khớp đúng ngữ cảnh hiện tại.
  const contextKey = JSON.stringify([dietId, allergyKey(allergies), allergyError, name, ingredients, scanType]);
  const current = state.contextKey === contextKey ? state : {};
  // Xác định quyền sở hữu ngay lúc render để không hiển thị dù chỉ một khung hình kết luận của hồ sơ hoặc đầu vào khác.
  useEffect(() => () => { request.current?.abort(); }, [contextKey]);
  useEffect(() => () => { fileVersion.current += 1; }, []);

  // Hủy request đang chạy và xóa kết quả hiện có.
  function invalidate() { request.current?.abort(); setState({}); }
  // Đổi một đầu vào thì kết quả cũ không còn hợp lệ.
  function change(setter, value) { invalidate(); setter(value); }

  // Kiểm tra và đọc tệp ảnh thành Base64 để xem trước và gửi lên API.
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

  // Gửi ảnh lên AI phân tích; tăng historyVersion để danh sách lịch sử tự tải lại sau mỗi lần quét.
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

  // Kiểm tra danh sách thành phần nhập tay bằng bộ luật từ khóa phía client.
  function analyzeText(event) {
    event.preventDefault(); invalidate();
    if (!ingredients.trim()) return setState({ contextKey, error: 'Vui lòng nhập thành phần trên nhãn để kiểm tra.' });
    setState({ contextKey, textResult: analyzeIngredients(ingredients, dietId) });
  }

  // Khôi phục kết quả từ lịch sử; chỉ chấp nhận khi chế độ ăn và dị ứng khớp với hồ sơ hiện tại.
  function restore(record) {
    invalidate();
    if (record.status !== 'COMPLETED') return setState({ contextKey, error: record.errorMessage || 'Lần quét này chưa có kết quả hoàn tất.' });
    const payload = record.requestPayload;
    if (allergyError || payload?.dietTypeId !== dietId || allergyKey(payload?.allergies || []) !== allergyKey(allergies)) {
      return setState({ contextKey, error: 'Kết quả lịch sử có chế độ ăn hoặc dị ứng khác hồ sơ hiện tại. Hãy chọn đúng chế độ ăn và quét lại.' });
    }
    // Keto (ID 6) không thể xác minh lượng carb từ một ảnh nên kết quả "phù hợp" cũ được hạ thành cần kiểm tra.
    const historicalResult = record.responsePayload;
    const result = dietId === 6 && historicalResult?.status === 'clear' ? { ...historicalResult,
      status: 'warning', summary: `Keto: chưa thể xác minh carb thuần dưới 50 g/ngày từ một ảnh; cần khẩu phần, chất xơ và toàn bộ bữa ăn trong ngày. ${historicalResult.summary || ''}`,
    } : historicalResult;
    setState({ contextKey, result });
  }

  // Xóa ảnh đã chọn và hủy mọi xử lý đang chạy.
  function removePhoto() { fileVersion.current += 1; invalidate(); setPhoto(null); }
  return { photo, name, setName: (value) => change(updateName, value), ingredients,
    setIngredients: (value) => change(updateIngredients, value), scanType,
    setScanType: (value) => change(updateScanType, value), result: current.result || null, textResult: current.textResult || null,
    error: allergyError || current.error || '', loading: Boolean(current.loading), blocked: Boolean(allergyError),
    allergies, historyVersion, selectFile, analyze, analyzeText, restore, removePhoto };
}
