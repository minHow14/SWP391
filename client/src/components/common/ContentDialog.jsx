// client/src/components/common/ContentDialog.jsx
// Hộp thoại nội dung dùng thẻ <dialog> gốc của trình duyệt (modal, khóa cuộn trang, trả focus khi đóng).
import { useEffect, useRef } from 'react';

// Component hộp thoại: hiển thị tiêu đề + nút đóng (trừ khi hideHeader), gọi onClose khi người dùng đóng.
export default function ContentDialog({ title, children, onClose, className = '', hideHeader = false }) {
  const dialog = useRef(null);
  // Giữ onClose mới nhất trong ref để effect mở dialog chỉ chạy một lần mà vẫn gọi đúng handler hiện tại.
  const closeHandler = useRef(onClose);
  useEffect(() => {
    closeHandler.current = onClose;
  }, [onClose]);
  // Mở modal khi mount; chặn sự kiện cancel (phím Esc) để React điều khiển việc đóng qua onClose,
  // đồng thời khôi phục overflow của body và focus trước đó khi unmount.
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const cancel = (event) => {
      event.preventDefault();
      closeHandler.current();
    };
    element.addEventListener('cancel', cancel);
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      element.removeEventListener('cancel', cancel);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`cx-content-dialog ${className}`}
      aria-labelledby={hideHeader ? undefined : 'cx-content-title'}
      aria-label={hideHeader ? title : undefined}
    >
      {!hideHeader && <div className="d-flex justify-content-between align-items-start gap-3 border-bottom pb-3 mb-4">
        <h2 id="cx-content-title" className="h5 fw-bold mb-0">
          {title}
        </h2>
        <button
          type="button"
          className="btn-close flex-shrink-0"
          aria-label="Đóng hộp thoại"
          onClick={onClose}
        />
      </div>}
      {children}
    </dialog>
  );
}
