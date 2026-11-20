// D:/SWP391/SWP391/client/src/features/admin/hooks/useSystemHealth.js
// Hook kiểm tra trạng thái kết nối các dịch vụ (server, DB, AI service) cho trang quản trị.
import { useCallback, useEffect, useState } from 'react';
import { adminService } from '../../../services/adminService.js';

const INITIAL_STATE = { data: null, loading: true, error: '' };

/**
 * Gọi API health check, kiểm tra cấu trúc dữ liệu trả về rồi cập nhật state.
 * @param {AbortController} controller Dùng để hủy request khi component unmount hoặc làm mới.
 * @param {Function} setState Hàm cập nhật state của hook.
 */
async function loadHealth(controller, setState) {
  try {
    const response = await adminService.getSystemHealth(controller.signal);
    if (controller.signal.aborted) return;
    const data = response?.data;
    // Xác thực dữ liệu để không hiển thị trạng thái sai khi API trả về cấu trúc bất thường.
    if (!Array.isArray(data?.services) || !Number.isFinite(Date.parse(data.checkedAt))) {
      throw new Error('Dữ liệu kiểm tra kết nối không hợp lệ.');
    }
    setState({ data, loading: false, error: '' });
  } catch (failure) {
    if (!controller.signal.aborted) {
      setState({ data: null, loading: false, error: failure.message || 'Không thể tải trạng thái kết nối.' });
    }
  }
}

/**
 * Cung cấp trạng thái sức khỏe hệ thống và hàm `refresh` để kiểm tra lại.
 * @returns {{ data: object|null, loading: boolean, error: string, refresh: Function }}
 */
export function useSystemHealth() {
  const [state, setState] = useState(INITIAL_STATE);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => {
    setState(INITIAL_STATE);
    setRevision((value) => value + 1);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    loadHealth(controller, setState);
    return () => controller.abort();
  }, [revision]);
  return { ...state, refresh };
}
