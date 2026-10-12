import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useDatabase } from '../lib/databaseContext.js';
import { api, getSession, setSession } from '../lib/api.js';
import { normalizeSearch } from '../lib/recipeFilters.js';
import { todayKey } from '../lib/journal.js';
import '../Profile.css';

function normalizeGenderValue(gender) {
  if (!gender) return '';
  const s = String(gender).trim().toUpperCase();
  if (['MALE', 'NAM', 'M'].includes(s)) return 'MALE';
  if (['FEMALE', 'NỮ', 'NU', 'F'].includes(s)) return 'FEMALE';
  if (['OTHER', 'KHÁC', 'KHAC', 'O'].includes(s)) return 'OTHER';
  return '';
}

function profileValues(user) {
  const profile = user.health_profile;
  return {
    full_name: user.full_name,
    height: profile?.height ?? '', weight: profile?.weight ?? '',
    dob: profile?.dob?.slice(0, 10) || '', gender: normalizeGenderValue(profile?.gender),
    diet_type_id: profile?.diet_type_id ?? '', health_goal: profile?.health_goal || '',
    allergy_ids: (user.allergies || []).map(allergy => allergy.ingredient_id),
  };
}

export default function Profile() {
  const { user, data } = useDatabase();
  if (!user) return <main className="cx-profile-page"><div className="cx-profile-shell text-center"><h1>Hồ sơ cá nhân</h1><p>Đăng nhập để xem và cập nhật thông tin của bạn.</p><Link className="btn btn-success" to="/dang-nhap">Đăng nhập</Link></div></main>;
  return <ProfileForm key={user.user_id} userId={user.user_id} catalog={data} />;
}

function ProfileForm({ userId, catalog }) {
  const [account, setAccount] = useState(null);
  const [values, setValues] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const saving = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    api('/auth/me', { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted && result.user.user_id === userId) {
        setAccount(result.user); setValues(profileValues(result.user)); setError('');
      }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [userId, retry]);

  const change = event => {
    const { name, value } = event.target;
    setValues(previous => ({ ...previous, [name]: value }));
    setNotice('');
  };

  async function save(event) {
    event.preventDefault();
    if (saving.current) return;
    const session = getSession();
    if (session?.user?.user_id !== userId) return;
    saving.current = true; setBusy(true); setError(''); setNotice('');
    const nullableNumber = value => value === '' ? null : Number(value);
    try {
      const result = await api('/auth/me', { method: 'PATCH', body: {
        full_name: values.full_name.trim(),
        health_profile: {
          height: nullableNumber(values.height), weight: nullableNumber(values.weight),
          dob: values.dob || null, gender: values.gender.trim() || null,
          diet_type_id: nullableNumber(values.diet_type_id), health_goal: values.health_goal.trim() || null,
        },
        allergy_ids: values.allergy_ids,
      } });
      if (getSession()?.token !== session.token) return;
      setAccount(result.user); setValues(profileValues(result.user));
      setSession({ ...session, user: result.user });
      setNotice('Đã lưu hồ sơ cá nhân.');
    } catch (error) { setError(error.message); }
    finally { saving.current = false; setBusy(false); }
  }

  if (!values) return <main className="cx-profile-page"><div className="cx-profile-shell text-center"><h1>Hồ sơ cá nhân</h1><p role={error ? 'alert' : 'status'}>{error || 'Đang tải hồ sơ…'}</p>{error && <button className="btn btn-success" onClick={() => setRetry(count => count + 1)}>Thử lại</button>}</div></main>;
  const ingredients = catalog.ingredients.filter(ingredient => normalizeSearch(ingredient.name).includes(normalizeSearch(search.trim())));
  return <main className="cx-profile-page flex-grow-1"><div className="cx-profile-shell">
    <header className="cx-profile-heading"><span><i className="bi bi-person-circle" aria-hidden="true" /></span><div><h1>Hồ sơ cá nhân</h1><p>Cập nhật thông tin cá nhân, chế độ ăn và nguyên liệu dị ứng của bạn.</p></div><Link to="/nhat-ky" className="btn btn-outline-success">Xem nhật ký</Link></header>
    <form onSubmit={save}>
      <fieldset disabled={busy} className="cx-profile-fields">
        <section className="cx-profile-section"><h2>Thông tin tài khoản</h2><div className="cx-profile-grid">
          <label>Họ và tên<input name="full_name" value={values.full_name} onChange={change} required maxLength={255} autoComplete="name" /></label>
          <label>Email<input value={account.email} readOnly type="email" autoComplete="email" /></label>
        </div><div className="cx-profile-account-meta"><span>Mã tài khoản: {account.user_id}</span><span>Trạng thái: {account.status}</span>{account.created_at && <span>Ngày tham gia: {new Date(account.created_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Bangkok' })}</span>}</div></section>
        <section className="cx-profile-section"><h2>Thông tin chi tiết</h2><div className="cx-profile-grid">
          <label>Ngày sinh<input name="dob" type="date" value={values.dob} onChange={change} max={todayKey()} autoComplete="bday" /></label>
          <label>Giới tính<select name="gender" value={values.gender} onChange={change} autoComplete="sex"><option value="">Chưa chọn</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option></select></label>
          <label>Chiều cao (cm)<input name="height" type="number" value={values.height} onChange={change} min={50} max={250} step="0.1" /></label>
          <label>Cân nặng (kg)<input name="weight" type="number" value={values.weight} onChange={change} min={10} max={400} step="0.1" /></label>
          <label>Chế độ ăn<select name="diet_type_id" value={values.diet_type_id} onChange={change}><option value="">Chưa chọn</option>{catalog.diets.map(diet => <option key={diet.diet_type_id} value={diet.diet_type_id}>{diet.name}</option>)}</select></label>
          <label>Mục tiêu sức khỏe<input name="health_goal" value={values.health_goal} onChange={change} maxLength={255} /></label>
        </div></section>
        <section className="cx-profile-section"><div className="cx-profile-section-heading"><h2>Nguyên liệu dị ứng</h2><span>Đã chọn {values.allergy_ids.length}</span></div><label className="cx-profile-search">Tìm nguyên liệu<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label><div className="cx-profile-allergies">{ingredients.map(ingredient => <label key={ingredient.ingredient_id}><input type="checkbox" checked={values.allergy_ids.includes(ingredient.ingredient_id)} onChange={event => {
          const checked = event.target.checked;
          setValues(previous => ({ ...previous, allergy_ids: checked ? [...previous.allergy_ids, ingredient.ingredient_id] : previous.allergy_ids.filter(id => id !== ingredient.ingredient_id) }));
          setNotice('');
        }} /><span>{ingredient.name}</span></label>)}</div>{!ingredients.length && <p className="text-secondary mb-0">Không tìm thấy nguyên liệu.</p>}</section>
      </fieldset>
      {error && <p className="alert alert-danger" role="alert">{error}</p>}
      {notice && <p className="alert alert-success" role="status">{notice}</p>}
      <div className="cx-profile-actions"><p>Các trường thông tin chi tiết có thể để trống.</p><button type="submit" className="btn btn-success" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thông tin'}</button></div>
    </form>
  </div></main>;
}
