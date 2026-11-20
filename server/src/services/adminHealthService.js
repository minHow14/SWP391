// D:/SWP391/SWP391/server/src/services/adminHealthService.js
// Kiểm tra tình trạng các thành phần hệ thống (DB, AI Service) cho trang giám sát của admin.
import { aiConfig } from '../config/aiConfig.js';
import { healthRepository } from '../repositories/healthRepository.js';

// Giới hạn 3 giây mỗi probe để trang admin không bị treo khi một dịch vụ không phản hồi.
const HEALTH_TIMEOUT_MS = 3000;

// Chạy một phép kiểm tra với timeout, trả UP/DOWN thay vì ném lỗi.
async function probe(id, operation) {
  let timer;
  try {
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Health probe timed out')), HEALTH_TIMEOUT_MS);
    });
    // `Promise.resolve().then` để lỗi ném đồng bộ trong operation cũng được bắt như lỗi bất đồng bộ.
    await Promise.race([Promise.resolve().then(operation), deadline]);
    return { id, status: 'UP' };
  } catch {
    return { id, status: 'DOWN' };
  } finally {
    clearTimeout(timer);
  }
}

// Gọi endpoint /health của AI Service kèm khóa nội bộ; chặn redirect để không bị chuyển hướng sang host khác.
async function checkAiHttp() {
  const response = await fetch(`${aiConfig.url}/health`, {
    redirect: 'error', signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    headers: aiConfig.internalApiKey ? { 'X-Internal-Api-Key': aiConfig.internalApiKey } : {},
  });
  if (!response.ok) throw new Error('AI HTTP health check failed');
  const result = await response.json();
  if (result.success !== true || result.data?.status !== 'ok') throw new Error('Invalid AI health response');
}

// Tổng hợp tình trạng hệ thống: HEALTHY khi mọi dịch vụ UP, ngược lại DEGRADED.
export async function getSystemHealth() {
  const services = await Promise.all([
    probe('database', () => healthRepository.checkDatabase()),
    probe('aiService', checkAiHttp),
  ]);
  // Việc HTTP còn sống không chứng minh nhà cung cấp mô hình AI bên ngoài đang hoạt động tốt.
  return { status: services.every((service) => service.status === 'UP') ? 'HEALTHY' : 'DEGRADED',
    checkedAt: new Date().toISOString(), services };
}
