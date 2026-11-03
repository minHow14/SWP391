// D:/SWP391/SWP391/client/src/features/mealPlan/components/ApplyToJournal.jsx
import { Link } from 'react-router';
import { useApplyMealPlan } from '../hooks/useApplyMealPlan.js';

const formatDay = (day) => day.slice(8) + '/' + day.slice(5, 7);

export default function ApplyToJournal({ generationId, onOpenJournal }) {
  const apply = useApplyMealPlan(generationId);
  const week = `${formatDay(apply.weekStart)} – ${formatDay(apply.weekEnd)}`;
  if (apply.status === 'done') {
    return (
      <p className="cx-mp-apply cx-mp-apply-done" role="status">
        <i className="bi bi-check-circle-fill" aria-hidden="true" /> Đã áp dụng vào kế hoạch tuần {week}.{' '}
        <Link to="/nhat-ky" onClick={onOpenJournal}>Xem trong Nhật Ký</Link>
      </p>
    );
  }
  if (apply.status === 'idle') {
    return <button type="button" className="btn btn-success" onClick={apply.ask}><i className="bi bi-journal-plus" aria-hidden="true" /> Áp dụng vào Nhật Ký</button>;
  }
  return (
    <div className="cx-mp-apply" role="group" aria-label="Xác nhận áp dụng thực đơn">
      <p>Các món trong kế hoạch tuần {week} sẽ được thay bằng thực đơn này. Nhật ký bạn đã ghi không bị ảnh hưởng.</p>
      {apply.error && <p role="alert" className="text-danger">{apply.error}</p>}
      <button type="button" className="btn btn-success" disabled={apply.status === 'saving'} onClick={apply.confirm}>
        {apply.status === 'saving' && <span className="spinner-border spinner-border-sm" aria-hidden="true" />} Xác nhận áp dụng
      </button>
      <button type="button" className="btn btn-outline-secondary" disabled={apply.status === 'saving'} onClick={apply.cancel}>Huỷ</button>
    </div>
  );
}
