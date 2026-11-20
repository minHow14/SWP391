// D:/SWP391/SWP391/client/test/dietProfileReload.test.jsx
// Kiểm thử việc làm mới kiểu ăn của tài khoản khi tải trang lần đầu chỉ có phiên lưu trong sessionStorage.
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); vi.restoreAllMocks(); });

// Khi tải trang mới, phiên khôi phục từ storage có kiểu ăn cũ thì phải được làm mới bằng hồ sơ từ server.
it('refreshes a stored account diet on a clean page load before an in-memory session exists', async () => {
  // Reset module để mô phỏng tải trang sạch: module session đọc lại phiên từ sessionStorage.
  vi.resetModules();
  const cachedUser = { user_id: 10, health_profile: { diet_type_id: 1 } };
  sessionStorage.setItem('chayxanh-session', JSON.stringify({ token: 'restored-session', user: cachedUser }));
  const { DatabaseProvider } = await import('../src/context/DatabaseProvider.jsx');
  const { useDatabase } = await import('../src/hooks/useDatabase.js');
  const { workspaceService } = await import('../src/services/workspaceService.js');
  const { authService } = await import('../src/services/authService.js');
  vi.spyOn(workspaceService, 'getCatalog').mockResolvedValue({ diets: [] });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ data: { user: {
    user_id: 10, health_profile: { diet_type_id: 2 },
  } } });
  // Component phụ hiển thị kiểu ăn của tài khoản để kiểm tra giá trị sau khi làm mới.
  function StoredDiet() {
    const { user } = useDatabase();
    return <output aria-label="Kiểu ăn tài khoản">{user?.health_profile?.diet_type_id}</output>;
  }
  render(<DatabaseProvider><StoredDiet /></DatabaseProvider>);
  await waitFor(() => expect(screen.getByLabelText('Kiểu ăn tài khoản').textContent).toBe('2'));
});
