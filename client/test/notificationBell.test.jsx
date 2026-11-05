// D:/SWP391/SWP391/client/test/notificationBell.test.jsx
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router';
import NotificationBell from '../src/components/layout/NotificationBell.jsx';
import { notificationService } from '../src/services/notificationService.js';

const FIRST_NOTIFICATION = {
  notification_id: 41, user_id: 7, content: 'Bài đăng của bạn có bình luận mới.',
  title: 'Bình luận mới', type: 'COMMENT', message: 'Bài đăng của bạn có bình luận mới.',
  is_read: false, created_at: '2026-11-04T09:00:00Z',
};
const SECOND_NOTIFICATION = {
  notification_id: 42, user_id: 7, content: 'Báo cáo của bạn đã được xử lý.',
  title: 'Cập nhật báo cáo', type: 'REPORT', message: 'Báo cáo của bạn đã được xử lý.',
  is_read: false, created_at: '2026-11-04T08:00:00Z',
};
const notificationList = (notifications = [FIRST_NOTIFICATION], unreadCount = 1) => ({
  success: true, message: 'Thành công', data: {
    notifications, unreadCount, meta: { page: 1, limit: 10, total: notifications.length, totalPages: 1 },
  },
});

function CurrentRoute() {
  const location = useLocation();
  return <output aria-label="Đường dẫn hiện tại">{location.pathname}</output>;
}

function renderBell() {
  return render(<MemoryRouter initialEntries={['/']}><NotificationBell /><CurrentRoute /></MemoryRouter>);
}

async function openBell(unreadCount = 1) {
  fireEvent.click(await screen.findByRole('button', { name: `Thông báo (${unreadCount} chưa đọc)` }));
}

beforeEach(() => {
  vi.spyOn(notificationService, 'getNotifications').mockResolvedValue(notificationList());
  vi.spyOn(notificationService, 'markAsRead').mockResolvedValue({ success: true });
  vi.spyOn(notificationService, 'markAllAsRead').mockResolvedValue({ success: true });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('shows loading until notifications arrive, then renders the unread item and badge', async () => {
  let resolveList;
  notificationService.getNotifications.mockReturnValue(new Promise((resolve) => { resolveList = resolve; }));
  renderBell();
  await openBell(0);
  expect(screen.getByText('Đang tải...')).toBeTruthy();
  expect(screen.queryByText('Bạn chưa có thông báo nào.')).toBeNull();
  await act(async () => resolveList(notificationList()));
  expect(screen.getByRole('button', { name: 'Thông báo (1 chưa đọc)' })).toBeTruthy();
  expect(screen.getByText('Bài đăng của bạn có bình luận mới.')).toBeTruthy();
  expect(notificationService.getNotifications).toHaveBeenCalledWith({ limit: 10 });
});

it('shows the empty state without a read-all action for an empty account', async () => {
  notificationService.getNotifications.mockResolvedValue(notificationList([], 0));
  renderBell();
  await openBell(0);
  expect(await screen.findByText('Bạn chưa có thông báo nào.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Đọc tất cả' })).toBeNull();
});

it('uses the server unread total even when only one notification is in the current page', async () => {
  notificationService.getNotifications.mockResolvedValue(notificationList([FIRST_NOTIFICATION], 101));
  renderBell();
  await openBell(101);
  expect(screen.getByText('99+')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Đọc tất cả' })).toBeTruthy();
});

it('marks an unread item and removes its unread count only after the write succeeds', async () => {
  let resolveRead;
  notificationService.markAsRead.mockReturnValue(new Promise((resolve) => { resolveRead = resolve; }));
  renderBell();
  await openBell();
  fireEvent.click(screen.getByText('Bình luận mới'));
  expect(screen.getByRole('button', { name: 'Thông báo (1 chưa đọc)' })).toBeTruthy();
  expect(notificationService.markAsRead).toHaveBeenCalledWith(41);
  await act(async () => resolveRead({ success: true }));
  expect(screen.getByRole('button', { name: 'Thông báo (0 chưa đọc)' })).toBeTruthy();
  await openBell(0);
  expect(screen.queryByRole('button', { name: 'Đọc tất cả' })).toBeNull();
});

it('does not send another write when a read item is clicked', async () => {
  notificationService.getNotifications.mockResolvedValue(notificationList([{ ...FIRST_NOTIFICATION, is_read: true }], 0));
  renderBell();
  await openBell(0);
  fireEvent.click(await screen.findByText('Bình luận mới'));
  expect(notificationService.markAsRead).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Thông báo (0 chưa đọc)' })).toBeTruthy();
});

it('follows an item link after marking it read', async () => {
  notificationService.getNotifications.mockResolvedValue(notificationList([{ ...FIRST_NOTIFICATION, link: '/cong-dong' }]));
  renderBell();
  await openBell();
  fireEvent.click(screen.getByText('Bình luận mới'));
  await waitFor(() => expect(screen.getByLabelText('Đường dẫn hiện tại').textContent).toBe('/cong-dong'));
  expect(screen.getByRole('button', { name: 'Thông báo (0 chưa đọc)' })).toBeTruthy();
});

it('disables read-all during its write and clears all unread items after success', async () => {
  let resolveAll;
  notificationService.getNotifications.mockResolvedValue(notificationList([FIRST_NOTIFICATION, SECOND_NOTIFICATION], 2));
  notificationService.markAllAsRead.mockReturnValue(new Promise((resolve) => { resolveAll = resolve; }));
  renderBell();
  await openBell(2);
  fireEvent.click(screen.getByRole('button', { name: 'Đọc tất cả' }));
  expect(screen.getByRole('button', { name: 'Đang xử lý...' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Thông báo (2 chưa đọc)' })).toBeTruthy();
  await act(async () => resolveAll({ success: true }));
  expect(screen.getByRole('button', { name: 'Thông báo (0 chưa đọc)' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Đọc tất cả' })).toBeNull();
  fireEvent.click(screen.getByText('Cập nhật báo cáo'));
  expect(notificationService.markAsRead).not.toHaveBeenCalled();
});

it('shows a failed load and reloads the actual list when retry is clicked', async () => {
  notificationService.getNotifications.mockRejectedValueOnce(new Error('Không thể tải danh sách thông báo.'))
    .mockResolvedValue(notificationList());
  renderBell();
  await openBell(0);
  expect((await screen.findByRole('alert')).textContent).toContain('Không thể tải danh sách thông báo.');
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText('Bình luận mới')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByRole('button', { name: 'Thông báo (1 chưa đọc)' })).toBeTruthy();
});

it('keeps an item unread when marking it fails and still follows its link', async () => {
  notificationService.getNotifications.mockResolvedValue(notificationList([{ ...FIRST_NOTIFICATION, link: '/cong-dong' }]));
  notificationService.markAsRead.mockRejectedValueOnce(new Error('Không thể đánh dấu đã đọc.'));
  renderBell();
  await openBell();
  fireEvent.click(screen.getByText('Bình luận mới'));
  await waitFor(() => expect(screen.getByLabelText('Đường dẫn hiện tại').textContent).toBe('/cong-dong'));
  expect(screen.getByRole('button', { name: 'Thông báo (1 chưa đọc)' })).toBeTruthy();
  await openBell();
  expect(screen.getByRole('button', { name: 'Đọc tất cả' })).toBeTruthy();
});

it('keeps read-all available and unread count unchanged after a failed write, allowing retry', async () => {
  notificationService.markAllAsRead.mockRejectedValueOnce(new Error('Không thể đánh dấu tất cả.'))
    .mockResolvedValue({ success: true });
  renderBell();
  await openBell();
  fireEvent.click(screen.getByRole('button', { name: 'Đọc tất cả' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Đọc tất cả' }).disabled).toBe(false));
  expect(screen.getByRole('button', { name: 'Thông báo (1 chưa đọc)' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Đọc tất cả' }));
  expect(await screen.findByRole('button', { name: 'Thông báo (0 chưa đọc)' })).toBeTruthy();
});

it('polls for new notifications and stops loading after unmount', async () => {
  vi.useFakeTimers();
  notificationService.getNotifications.mockResolvedValueOnce(notificationList([], 0)).mockResolvedValue(notificationList());
  const view = renderBell();
  await act(async () => {});
  expect(screen.getByRole('button', { name: 'Thông báo (0 chưa đọc)' })).toBeTruthy();
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(screen.getByRole('button', { name: 'Thông báo (1 chưa đọc)' })).toBeTruthy();
  view.unmount();
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(notificationService.getNotifications).toHaveBeenCalledTimes(2);
});

it('counts a notification once when the same unread item is clicked twice before its write settles', async () => {
  let resolveRead;
  notificationService.getNotifications.mockResolvedValue(notificationList([FIRST_NOTIFICATION, SECOND_NOTIFICATION], 2));
  notificationService.markAsRead.mockReturnValue(new Promise((resolve) => { resolveRead = resolve; }));
  renderBell();
  await openBell(2);
  fireEvent.click(screen.getByText('Bình luận mới'));
  await openBell(2);
  fireEvent.click(screen.getByText('Bình luận mới'));
  await act(async () => resolveRead({ success: true }));
  expect(screen.getByRole('button', { name: 'Thông báo (1 chưa đọc)' })).toBeTruthy();
  await openBell();
  expect(screen.getByRole('button', { name: 'Đọc tất cả' })).toBeTruthy();
});

it('allows another attempt on an unread item after its first write fails', async () => {
  notificationService.getNotifications.mockResolvedValue(notificationList([{ ...FIRST_NOTIFICATION, link: '/cong-dong' }]));
  notificationService.markAsRead.mockRejectedValueOnce(new Error('Không thể đánh dấu đã đọc.'));
  renderBell();
  await openBell();
  fireEvent.click(screen.getByText('Bình luận mới'));
  await waitFor(() => expect(screen.getByLabelText('Đường dẫn hiện tại').textContent).toBe('/cong-dong'));
  await openBell();
  fireEvent.click(screen.getByText('Bình luận mới'));
  expect(await screen.findByRole('button', { name: 'Thông báo (0 chưa đọc)' })).toBeTruthy();
});

it('marks different unread items independently when their writes finish out of order', async () => {
  const complete = new Map();
  notificationService.getNotifications.mockResolvedValue(notificationList([FIRST_NOTIFICATION, SECOND_NOTIFICATION], 2));
  notificationService.markAsRead.mockImplementation((id) => new Promise((resolve) => complete.set(id, resolve)));
  renderBell();
  await openBell(2);
  fireEvent.click(screen.getByText('Bình luận mới'));
  await openBell(2);
  fireEvent.click(screen.getByText('Cập nhật báo cáo'));
  await act(async () => complete.get(42)({ success: true }));
  expect(screen.getByRole('button', { name: 'Thông báo (1 chưa đọc)' })).toBeTruthy();
  await act(async () => complete.get(41)({ success: true }));
  expect(screen.getByRole('button', { name: 'Thông báo (0 chưa đọc)' })).toBeTruthy();
});
