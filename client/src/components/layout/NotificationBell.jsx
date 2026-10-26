// client/src/components/layout/NotificationBell.jsx
import { useState, useEffect, useCallback } from 'react';
import { Dropdown, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router';
import { notificationService } from '../../services/notificationService.js';

function getNotificationIcon(type) {
  switch (type) {
    case 'COMMENT':
      return 'bi-chat-left-text-fill text-primary';
    case 'REPORT':
    case 'ADMIN':
      return 'bi-shield-fill-check text-success';
    case 'SYSTEM':
      return 'bi-info-circle-fill text-info';
    default:
      return 'bi-bell-fill text-secondary';
  }
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await notificationService.getNotifications({ limit: 10 });
      const rawList = Array.isArray(response?.data?.notifications)
        ? response.data.notifications
        : Array.isArray(response?.notifications)
        ? response.notifications
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];

      const count =
        response?.data?.unreadCount ??
        response?.unreadCount ??
        response?.meta?.unreadCount ??
        (Array.isArray(rawList) ? rawList.filter((n) => !n.is_read).length : 0);

      setNotifications(rawList);
      setUnreadCount(Number(count) || 0);
    } catch (err) {
      setError(err.message || 'Không thể tải thông báo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        Array.isArray(prev) ? prev.map((item) => ({ ...item, is_read: true })) : []
      );
      setUnreadCount(0);
    } catch {
      // Bỏ qua lỗi nền
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = async (item) => {
    if (!item.is_read) {
      try {
        await notificationService.markAsRead(item.notification_id);
        setNotifications((prev) =>
          Array.isArray(prev)
            ? prev.map((notif) =>
                notif.notification_id === item.notification_id ? { ...notif, is_read: true } : notif
              )
            : []
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Tiếp tục điều hướng nếu có link
      }
    }
    if (item.link) {
      navigate(item.link);
    }
  };

  const hasNotifications = Array.isArray(notifications) && notifications.length > 0;

  return (
    <Dropdown align="end" className="cx-notification-dropdown">
      <Dropdown.Toggle
        id="cx-notification-dropdown-toggle"
        variant="light"
        className="position-relative cx-notification-btn p-2 border-0"
        aria-label={`Thông báo (${unreadCount} chưa đọc)`}
      >
        <i className="bi bi-bell-fill fs-5 text-secondary" aria-hidden="true" />
        {unreadCount > 0 && (
          <Badge
            bg="danger"
            pill
            className="position-absolute top-0 start-100 translate-middle badge-sm"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
            <span className="visually-hidden">thông báo chưa đọc</span>
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="shadow-lg p-0 cx-notification-menu" style={{ width: '340px' }}>
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light rounded-top">
          <span className="fw-bold text-dark fs-6">
            <i className="bi bi-bell me-2 text-success" aria-hidden="true" />
            Thông báo
          </span>
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              className="p-0 text-decoration-none text-success small fw-semibold"
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              {markingAll ? 'Đang xử lý...' : 'Đọc tất cả'}
            </Button>
          )}
        </div>

        <div className="cx-notification-list" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          {loading && !hasNotifications ? (
            <div className="text-center py-4 text-muted">
              <Spinner animation="border" size="sm" variant="success" className="me-2" />
              <span>Đang tải...</span>
            </div>
          ) : error ? (
            <div className="p-3">
              <Alert variant="danger" className="mb-0 py-2 small">
                {error}
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 ms-2 text-danger fw-bold"
                  onClick={loadNotifications}
                >
                  Thử lại
                </Button>
              </Alert>
            </div>
          ) : !hasNotifications ? (
            <div className="text-center py-4 text-muted px-3">
              <i className="bi bi-bell-slash fs-3 d-block text-secondary mb-2" aria-hidden="true" />
              <p className="small mb-0">Bạn chưa có thông báo nào.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <Dropdown.Item
                key={item.notification_id}
                onClick={() => handleItemClick(item)}
                className={`p-3 border-bottom text-wrap ${
                  !item.is_read ? 'bg-light border-start border-4 border-success' : ''
                }`}
                style={{ whiteSpace: 'normal' }}
              >
                <div className="d-flex gap-2 align-items-start">
                  <i className={`bi ${getNotificationIcon(item.type)} fs-5 mt-1`} aria-hidden="true" />
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <strong className={`small ${!item.is_read ? 'text-dark fw-bold' : 'text-secondary'}`}>
                        {item.title || 'Thông báo mới'}
                      </strong>
                      {!item.is_read && (
                        <span className="badge bg-success rounded-circle p-1 ms-1" style={{ width: '6px', height: '6px' }} />
                      )}
                    </div>
                    <p className="text-muted small mb-1 lh-sm">{item.message || item.content}</p>
                    <span className="text-muted" style={{ fontSize: '11px' }}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString('vi-VN', {
                            timeZone: 'Asia/Bangkok',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </div>
                </div>
              </Dropdown.Item>
            ))
          )}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}
