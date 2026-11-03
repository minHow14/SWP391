// D:/SWP391/SWP391/client/src/services/foodScannerService.js
import apiClient from './apiClient.js';

// Give the gateway's default 180-second budget time to return a persisted outcome.
const FOOD_SCAN_TIMEOUT_MS = 190_000;

/**
 * Chuyển đổi File ảnh sang chuỗi Base64
 * @param {File} file
 * @returns {Promise<{ base64: string, mimeType: string }>}
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || file.type || 'image/jpeg';
      resolve({ base64, mimeType, dataUrl });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Gửi yêu cầu phân tích hình ảnh món ăn hoặc bao bì tới AI API Gateway
 * @param {Object} params
 * @param {string} params.imageBase64
 * @param {string} [params.mimeType='image/jpeg']
 * @param {number} params.dietTypeId
 * @param {'AUTO'|'LABEL'|'DISH'} [params.scanType='AUTO']
 * @param {string} [params.dishName='']
 * @param {string[]} [params.allergies=[]]
 * @returns {Promise<Object>}
 */
export async function analyzeFoodImage({
  imageBase64,
  mimeType = 'image/jpeg',
  dietTypeId,
  scanType = 'AUTO',
  dishName = '',
  allergies = [],
}, signal) {
  const response = await apiClient.post('/ai/food-scanner/analyze', {
    imageBase64,
    mimeType,
    dietTypeId,
    scanType,
    dishName,
    allergies,
  }, { signal, timeout: FOOD_SCAN_TIMEOUT_MS });

  return response;
}
