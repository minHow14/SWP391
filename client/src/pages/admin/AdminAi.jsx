// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/admin/AdminAi.jsx
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useDatabase } from '../../hooks/useDatabase.js';
import {
  adminClearChatCache, adminGetGuestQuota, adminListLogs, adminLogStats, adminResetGuestQuota,
} from '../../services/aiApi.js';
import { friendlyAiError } from '../../utils/aiHelpers.js';

const ADMIN_ROLE = 1;
const FEATURES = [['', 'Tất cả chức năng'], ['chatbot', 'Chatbot'], ['meal_planner', 'Thực đơn'], ['other', 'Khác']];
const FEATURE_LABEL = { chatbot: 'Chatbot', meal_planner: 'Thực đơn', other: 'Khác' };

const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
    : '—';
const percent = (value) => (value == null ? '—' : `${value.toLocaleString('vi-VN')}%`);
const isoDay = (offset = 0) => {
  const date = new Date(Date.now() + 7 * 3600 * 1000 - offset * 86400000);
  return date.toISOString().slice(0, 10);
};

function useLoader(load, deps) {
  const [version, setVersion] = useState(0);
  const key = `${JSON.stringify(deps)}#${version}`;
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((data) => setResult({ key, data, error: '' }))
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key, data: null, error: friendlyAiError(error) });
      });
    return () => controller.abort();
    // `load` đổi theo `deps`, nên chỉ cần theo dõi `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current = result.key === key;
  return [
    { loading: !current, data: result.data, error: current ? result.error : '' },
    () => setVersion((value) => value + 1),
  ];
}

function Range({ range, onChange }) {
  const set = (name) => (event) => onChange({ ...range, [name]: event.target.value });
  return (
    <div className="cx-admin-filters">
      <label>Từ ngày<input type="date" value={range.date_from} max={range.date_to || undefined} onChange={set('date_from')} /></label>
      <label>Đến ngày<input type="date" value={range.date_to} min={range.date_from || undefined} onChange={set('date_to')} /></label>
      <button type="button" onClick={() => onChange({ date_from: isoDay(6), date_to: isoDay() })}>7 ngày</button>
      <button type="button" onClick={() => onChange({ date_from: isoDay(29), date_to: isoDay() })}>30 ngày</button>
      <button type="button" onClick={() => onChange({ date_from: '', date_to: '' })}>Tất cả</button>
    </div>
  );
}

function LogsTab() {
  const [range, setRange] = useState({ date_from: '', date_to: '' });
  const [filters, setFilters] = useState({ status: '', feature: '', search: '' });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => { setFilters((previous) => ({ ...previous, search: query.trim() })); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [query]);
  const [{ loading, data, error }, reload] = useLoader(
    (signal) => adminListLogs({ ...range, ...filters, page, page_size: 20 }, signal),
    [range, filters, page]
  );
  const pick = (name) => (event) => { setFilters((previous) => ({ ...previous, [name]: event.target.value })); setPage(1); };
  return (
    <section aria-label="Nhật ký AI">
      <Range range={range} onChange={(value) => { setRange(value); setPage(1); }} />
      <div className="cx-admin-filters">
        <select value={filters.status} onChange={pick('status')} aria-label="Trạng thái"><option value="">Mọi trạng thái</option><option value="SUCCESS">Thành công</option><option value="ERROR">Lỗi</option></select>
        <select value={filters.feature} onChange={pick('feature')} aria-label="Chức năng">{FEATURES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm trong hành động hoặc nội dung lỗi" aria-label="Tìm kiếm" />
        <button type="button" onClick={reload}>Làm mới</button>
      </div>
      {error && <p className="alert alert-danger" role="alert">{error}</p>}
      {loading && !data && <p role="status">Đang tải nhật ký…</p>}
      {data && (
        <>
          <p className="cx-admin-count" role="status">{data.total.toLocaleString('vi-VN')} bản ghi · trang {data.page}/{Math.max(data.total_pages, 1)}</p>
          <div className="table-responsive">
            <table className="table table-sm cx-admin-table">
              <thead><tr><th>Thời gian</th><th>Hành động</th><th>Model</th><th>Trạng thái</th><th>Chi tiết lỗi</th></tr></thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.log_id} className={item.action?.startsWith('ADMIN_') ? 'is-admin' : ''}>
                    <td>{dateTime(item.created_at)}</td>
                    <td>{item.action}</td>
                    <td>{item.model_name}</td>
                    <td><span className={`badge ${item.status === 'SUCCESS' ? 'text-bg-success' : 'text-bg-danger'}`}>{item.status === 'SUCCESS' ? 'Thành công' : 'Lỗi'}</span></td>
                    <td className="cx-admin-error">{item.error_feedback || ''}</td>
                  </tr>
                ))}
                {!data.items.length && <tr><td colSpan={5} className="text-center text-secondary">Không có bản ghi phù hợp.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="cx-admin-pager">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>‹ Trước</button>
            <button type="button" disabled={page >= data.total_pages || loading} onClick={() => setPage(page + 1)}>Sau ›</button>
          </div>
        </>
      )}
    </section>
  );
}

function CountsTable({ title, rows, label }) {
  return (
    <div>
      <h3>{title}</h3>
      <table className="table table-sm cx-admin-table">
        <thead><tr><th>{label}</th><th>Tổng</th><th>Lỗi</th><th>Thành công</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.key}><td>{row.name}</td><td>{row.total}</td><td>{row.error}</td><td>{percent(row.success_rate)}</td></tr>)}
          {!rows.length && <tr><td colSpan={4} className="text-center text-secondary">Chưa có dữ liệu.</td></tr>}</tbody>
      </table>
    </div>
  );
}

function StatsTab() {
  const [range, setRange] = useState({ date_from: isoDay(29), date_to: isoDay() });
  const [{ loading, data, error }] = useLoader((signal) => adminLogStats(range, signal), [range]);
  const maxDay = Math.max(1, ...(data?.by_day || []).map((day) => day.total));
  return (
    <section aria-label="Thống kê AI">
      <Range range={range} onChange={setRange} />
      {error && <p className="alert alert-danger" role="alert">{error}</p>}
      {loading && !data && <p role="status">Đang tải thống kê…</p>}
      {data && (
        <>
          <div className="cx-admin-kpis">
            <div><small>Tổng yêu cầu</small><strong>{data.total.toLocaleString('vi-VN')}</strong></div>
            <div><small>Thành công</small><strong className="text-success">{data.success.toLocaleString('vi-VN')}</strong></div>
            <div><small>Lỗi</small><strong className="text-danger">{data.error.toLocaleString('vi-VN')}</strong></div>
            <div><small>Tỷ lệ thành công</small><strong>{percent(data.success_rate)}</strong></div>
          </div>
          <h3>Theo ngày</h3>
          {data.by_day.length ? (
            <ol className="cx-admin-bars" aria-label="Số yêu cầu theo ngày">
              {data.by_day.map((day) => (
                <li key={day.date} title={`${day.date}: ${day.success} thành công, ${day.error} lỗi`}>
                  <span className="cx-admin-bar-day">{day.date.slice(5)}</span>
                  <span className="cx-admin-bar-track">
                    <span className="is-ok" style={{ width: `${(day.success / maxDay) * 100}%` }} />
                    <span className="is-error" style={{ width: `${(day.error / maxDay) * 100}%` }} />
                  </span>
                  <span className="cx-admin-bar-total">{day.total}</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-secondary">Chưa có dữ liệu trong khoảng này.</p>}
          <div className="cx-admin-split">
            <CountsTable title="Theo chức năng" label="Chức năng" rows={data.by_feature.map((row) => ({ ...row, key: row.feature, name: FEATURE_LABEL[row.feature] || row.feature }))} />
            <CountsTable title="Theo model" label="Model" rows={data.by_model.map((row) => ({ ...row, key: row.model_name, name: row.model_name }))} />
          </div>
        </>
      )}
    </section>
  );
}

function InterventionTab() {
  const [guestId, setGuestId] = useState('');
  const [quota, setQuota] = useState(null);
  const [notice, setNotice] = useState({ text: '', error: false });
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (action, success) => {
    setBusy(true);
    setNotice({ text: '', error: false });
    try {
      const result = await action();
      setNotice({ text: success(result), error: false });
      return result;
    } catch (error) {
      setNotice({ text: friendlyAiError(error), error: true });
      return null;
    } finally {
      setBusy(false);
    }
  }, []);
  const id = guestId.trim();
  return (
    <section aria-label="Can thiệp thủ công" className="cx-admin-intervene">
      <div>
        <h3>Hạn mức của khách</h3>
        <p>Khách có 3 lượt mỗi ngày (dùng chung cho hỏi đáp và tạo thực đơn). Khách không gửi mã sẽ có mã dạng <code>ip:địa-chỉ</code>.</p>
        <div className="cx-admin-filters">
          <input value={guestId} onChange={(event) => setGuestId(event.target.value)} maxLength={100} placeholder="Mã khách (X-Guest-Id)" aria-label="Mã khách" />
          <button type="button" disabled={!id || busy} onClick={async () => { const result = await run(() => adminGetGuestQuota(id), () => ''); if (result) setQuota(result); }}>Xem hạn mức</button>
          <button type="button" className="is-danger" disabled={!id || busy} onClick={async () => {
            if (!window.confirm(`Đặt lại hạn mức hôm nay của "${id}" về 0?`)) return;
            const result = await run(() => adminResetGuestQuota(id), (value) => `Đã đặt lại hạn mức (trước đó đã dùng ${value.used_before} lượt).`);
            if (result) setQuota(result);
          }}>Đặt lại hạn mức</button>
        </div>
        {quota && <p className="cx-admin-quota">Khách <strong>{quota.guest_id}</strong>: đã dùng {quota.used}/{quota.daily_limit} lượt, còn {quota.remaining}. Reset lúc {dateTime(quota.resets_at)}.</p>}
      </div>
      <div>
        <h3>Bộ nhớ đệm chatbot</h3>
        <p>Xoá các câu trả lời đã lưu, nên làm sau khi đổi prompt hoặc model.</p>
        <button type="button" className="is-danger" disabled={busy} onClick={async () => {
          if (!window.confirm('Xoá toàn bộ bộ nhớ đệm câu trả lời của chatbot?')) return;
          await run(adminClearChatCache, (value) => `Đã xoá ${value.cleared} câu trả lời đã lưu.`);
        }}>Xoá bộ nhớ đệm</button>
      </div>
      {notice.text && <p className={`alert ${notice.error ? 'alert-danger' : 'alert-success'}`} role={notice.error ? 'alert' : 'status'}>{notice.text}</p>}
      <p className="text-secondary small">Mọi can thiệp được ghi vào nhật ký AI với tên tài khoản Admin.</p>
    </section>
  );
}

const TABS = [['logs', 'Nhật ký AI', LogsTab], ['stats', 'Thống kê', StatsTab], ['intervene', 'Can thiệp thủ công', InterventionTab]];

export default function AdminAi() {
  const { user } = useDatabase();
  const [tab, setTab] = useState('logs');
  if (!user) return <main className="cx-admin-page"><div className="cx-admin-shell text-center"><h1>Quản trị AI</h1><p>Đăng nhập bằng tài khoản quản trị để tiếp tục.</p><Link className="btn btn-success" to="/dang-nhap">Đăng nhập</Link></div></main>;
  if (user.role !== ADMIN_ROLE) return <main className="cx-admin-page"><div className="cx-admin-shell text-center"><h1>Quản trị AI</h1><p role="alert">Tài khoản của bạn không có quyền truy cập trang này.</p></div></main>;
  const Active = TABS.find(([key]) => key === tab)[2];
  return (
    <main className="cx-admin-page flex-grow-1">
      <div className="cx-admin-shell">
        <header><h1><i className="bi bi-speedometer2" aria-hidden="true" /> Quản trị AI</h1><p>Theo dõi nhật ký, tỷ lệ thành công và can thiệp khi cần.</p></header>
        <div className="cx-admin-tabs" role="tablist">
          {TABS.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}</button>)}
        </div>
        <Active />
      </div>
    </main>
  );
}
