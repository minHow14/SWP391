import { useEffect, useRef } from 'react';

export default function ContentDialog({ title, children, onClose, className = '', hideHeader = false }) {
  const dialog = useRef(null);
  const closeHandler = useRef(onClose);
  useEffect(() => {
    closeHandler.current = onClose;
  }, [onClose]);
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
