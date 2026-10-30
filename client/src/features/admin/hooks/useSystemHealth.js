// D:/SWP391/SWP391/client/src/features/admin/hooks/useSystemHealth.js
import { useCallback, useEffect, useState } from 'react';
import { adminService } from '../../../services/adminService.js';

const INITIAL_STATE = { data: null, loading: true, error: '' };

async function loadHealth(controller, setState) {
  try {
    const response = await adminService.getSystemHealth(controller.signal);
    if (controller.signal.aborted) return;
    const data = response?.data;
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
