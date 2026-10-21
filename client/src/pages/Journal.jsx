// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/Journal.jsx
import { useEffect, useState } from 'react';
import ContentDialog from '../components/common/ContentDialog.jsx';
import { mealGroups, todayKey, weekDates, totals } from '../utils/journal.js';
import { useDatabase } from '../hooks/useDatabase.js';
import { api } from '../services/api.js';
import { getSession } from '../utils/session.js';
import { Link } from 'react-router';
import HealthProfileNotice from '../features/profile/components/HealthProfileNotice.jsx';
import { hasBodyMeasurements } from '../features/profile/utils/healthProfile.js';

const number = (value) => value.toLocaleString('en-US', { maximumFractionDigits: 1 });
const displayDate = (date, options = { day: '2-digit', month: '2-digit' }) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Bangkok', ...options }).format(new Date(`${date}T12:00:00Z`));

export default function Journal() {
  const {data:catalog,user}=useDatabase();
  const mealSamples=catalog.recipes.map(r=>({id:String(r.recipe_id),recipe_id:r.recipe_id,name:r.recipe_name,serving:'1 phần',calories:r.total_calories||0,...r.nutrition}));
  const today = todayKey();
  const [data, setData] = useState(null);
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState('day');
  const [adding, setAdding] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const saveStatus='Nhật ký cá nhân';
  const [notice, setNotice] = useState('');
  useEffect(()=>{let active=true;if(user)api('/workspace/journal').then(result=>{if(active)setData({...result,ownerId:user.user_id});}).catch(e=>{if(active)setNotice(e.message);});return()=>{active=false;};},[user]);
  async function refresh(){const result=await api('/workspace/journal');if(getSession()?.user?.user_id===user.user_id)setData({...result,ownerId:user.user_id});}
  async function changePlan(day,group,recipe){try{await api('/workspace/plan',{method:'PUT',body:{date:day,group:group.toUpperCase(),recipe_id:recipe?Number(recipe):null}});await refresh();}catch(e){setNotice(e.message);}}
  if(!user)return <main className="cx-journal-page text-center p-5"><h1 className="h4">Nhật ký cá nhân</h1><p>Đăng nhập để xem nhật ký và kế hoạch của bạn.</p><Link to="/dang-nhap" className="btn btn-success">Đăng nhập</Link></main>;
  if(!data||data.ownerId!==user.user_id)return <main className="p-5 text-center"><p>{notice||'Đang tải nhật ký…'}</p>{notice&&<button className="btn btn-success" onClick={()=>refresh().catch(e=>setNotice(e.message))}>Thử lại</button>}</main>;
  const entries = data.days[date] || [];
  const sum = totals(entries);
  const profile = data.profile||{height:0,weight:0,calorieGoal:0,goal:'Chưa thiết lập'};
  const hasMeasurements = hasBodyMeasurements(profile);
  const bmi = hasMeasurements ? profile.weight / (profile.height / 100) ** 2 : null;
  const remaining = profile.calorieGoal - sum.calories;
  const percent = profile.calorieGoal?Math.round(sum.calories / profile.calorieGoal * 100):0;
  const week = weekDates(date);
  const history = week.map((day) => ({ date: day, calories: totals(data.days[day] || []).calories, recorded: Boolean(data.days[day]?.length) }));
  const recorded = history.filter((day) => day.recorded);
  const average = recorded.length ? Math.round(recorded.reduce((total, day) => total + day.calories, 0) / recorded.length) : 0;
  const chartMax = Math.max(profile.calorieGoal, ...history.map((day) => day.calories), 1);
  async function addMeal(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get('name').trim();
    if (!name) return;
    const entry = { date,name, serving: form.get('serving').trim() || '1 phần', group: form.get('group').toUpperCase(), ...Object.fromEntries(['calories', 'protein', 'carbs', 'fat', 'fiber'].map((key) => [key, Number(form.get(key))])) };
    try{await api('/workspace/diary',{method:'POST',body:entry});await refresh();setAdding(null);setNotice('Đã thêm món vào nhật ký.');}catch(e){setNotice(e.message);}
  }
  async function removeMeal(id) {
    try{await api(`/workspace/diary/${id}`,{method:'DELETE'});await refresh();setNotice('Đã xóa món khỏi nhật ký.');}catch(e){setNotice(e.message);}
  }
  async function updateProfile(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try{await api('/workspace/profile',{method:'PATCH',body:{height:Number(form.get('height')),weight:Number(form.get('weight')),calorieGoal:Number(form.get('calorieGoal')),goal:form.get('goal')}});await refresh();setEditingProfile(false);}catch(e){setNotice(e.message);}
  }
  async function recordPlan(day) {
    if (data.days[day]?.length) return;
    const planned = mealGroups.flatMap((group) => {
      const meal = mealSamples.find((item) => item.id === data.plans[day]?.[group.id]);
      return meal ? [{date:day,name:meal.name,recipe_id:meal.recipe_id,serving:meal.serving,calories:meal.calories,protein:meal.protein,carbs:meal.carbs,fat:meal.fat,fiber:meal.fiber,group:group.id.toUpperCase()}] : [];
    });
    if (!planned.length) return;
    try{await api('/workspace/plan/record',{method:'POST',body:{date:day}});await refresh();setDate(day);setTab('day');setNotice('Đã lưu các bữa ăn từ kế hoạch vào nhật ký.');}catch(e){setNotice(e.message);}
  }

  return <main className="cx-journal-page flex-grow-1">
    <div className="cx-journal-shell">
      <div className="cx-journal-toolbar"><div role="tablist" aria-label="Chế độ nhật ký"><button id="journal-day-tab" role="tab" aria-selected={tab === 'day'} aria-controls="journal-content" className={tab === 'day' ? 'is-active' : ''} onClick={() => setTab('day')}><i className="bi bi-calendar-day-fill" aria-hidden="true" /> Nhật Ký Trong Ngày</button><button id="journal-week-tab" role="tab" aria-selected={tab === 'week'} aria-controls="journal-content" className={tab === 'week' ? 'is-active' : ''} onClick={() => setTab('week')}><i className="bi bi-calendar-week-fill" aria-hidden="true" /> Lập Kế Hoạch Theo Tuần</button></div><div className="cx-journal-date"><span><i className="bi bi-check-circle-fill" aria-hidden="true" /> {saveStatus}</span><label className="cx-journal-date-picker"><span className="visually-hidden">Ngày nhật ký</span><strong aria-hidden="true">{displayDate(date, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })} <i className="bi bi-calendar3" /></strong><input type="date" value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} /></label></div></div>
      <p className="cx-journal-demo-note">Theo dõi bữa ăn và lượng dinh dưỡng hằng ngày từ công thức hoặc số liệu bạn nhập.</p>
      {notice && <p className="cx-journal-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo">×</button></p>}
      <div id="journal-content" role="tabpanel" aria-labelledby={tab === 'day' ? 'journal-day-tab' : 'journal-week-tab'}>
        {tab === 'day' ? <>
          <section className="cx-journal-overview" aria-label="Tổng quan nhật ký"><div className="cx-journal-bmi"><div className="cx-journal-overview-label"><h1>CHỈ SỐ CƠ THỂ & BMI</h1><button type="button" onClick={() => setEditingProfile(true)}><i className="bi bi-pencil" aria-hidden="true" /> Chỉnh hồ sơ</button></div>{hasMeasurements ? <><div className="cx-journal-big-number">{Number.isFinite(bmi)?bmi.toFixed(1):"—"} <small>BMI SCORE</small></div><div className="cx-journal-body-stats"><div><small>CHIỀU CAO</small><strong>{profile.height} cm</strong></div><div><small>CÂN NẶNG</small><strong>{profile.weight} kg</strong></div><div><small>MỤC TIÊU</small><strong>{profile.goal}</strong></div></div></> : <HealthProfileNotice /> }</div><div className="cx-journal-energy"><div className="cx-journal-overview-label"><h2>TỔNG CALO TRONG NGÀY</h2><span>Mục tiêu: {number(profile.calorieGoal)} kcal<strong>{remaining >= 0 ? `Còn ${number(remaining)}` : `Vượt ${number(-remaining)}`} kcal</strong></span></div><div className="cx-journal-big-number">{number(sum.calories)} <small>/ {number(profile.calorieGoal)} kcal</small></div><progress max={profile.calorieGoal||1} value={Math.min(sum.calories, profile.calorieGoal)} aria-label="Năng lượng đã ghi nhận so với mục tiêu" /><p><i className="bi bi-info-circle-fill" aria-hidden="true" /> Năng lượng đã ghi nhận đạt {percent}% mục tiêu bạn đặt.</p></div></section>
          <section className="cx-journal-macros" aria-label="Các chất dinh dưỡng">{[['protein', 'Đạm Chay (Protein)', profile.macroGoals?.protein||0, 'red', 'Đậu hũ, nấm, hạt'], ['carbs', 'Tinh Bột (Carbs)', profile.macroGoals?.carbs||0, 'amber', 'Gạo lứt, khoai'], ['fat', 'Chất Béo (Fat)', profile.macroGoals?.fat||0, 'blue', 'Bơ, hạt, dầu ô liu'], ['fiber', 'Chất Xơ (Fiber)', profile.macroGoals?.fiber||0, 'green', 'Rau xanh, củ quả tươi']].map(([key, label, target, tone, hint]) => <article key={key} className={`tone-${tone}`}><div><h2><span />{label}</h2><strong>{number(sum[key])}g / {target}g</strong></div><progress max={target||1} value={Math.min(sum[key], target)} aria-label={label} /><p>{hint} · Mục tiêu trong hồ sơ</p></article>)}</section>
          <section className="cx-journal-meals" aria-labelledby="journal-meals-title"><div className="cx-journal-section-heading"><div><h2 id="journal-meals-title"><i className="bi bi-fork-knife" aria-hidden="true" /> Bữa Ăn Trong Ngày</h2><p>Ghi chép và phân bổ lượng calo theo từng bữa ăn.</p></div><button type="button" onClick={() => setAdding('breakfast')}><i className="bi bi-plus-circle-fill" aria-hidden="true" /> Ghi Thêm Bữa Ăn</button></div><div className="cx-journal-meal-grid">{mealGroups.map((group) => {
            const meals = entries.filter((entry) => entry.group === group.id);
            return <article key={group.id} className={`cx-journal-meal-card tone-${group.tone}`}><header><span className="cx-journal-meal-icon"><i className={`bi bi-${group.icon}`} aria-hidden="true" /></span><div><h3>{group.name}</h3><p>{displayDate(date, { weekday: 'long', day: '2-digit', month: '2-digit' })}</p></div><strong>{number(totals(meals).calories)} kcal</strong></header><div className="cx-journal-meal-items">{meals.map((meal) => <div key={meal.id}><div><strong>{meal.name}</strong><small>{meal.serving} · Protein: {number(meal.protein)}g | Carbs: {number(meal.carbs)}g</small></div><span>{number(meal.calories)} kcal</span><button type="button" onClick={() => removeMeal(meal.id)} aria-label={`Xóa ${meal.name}`}><i className="bi bi-trash-fill" aria-hidden="true" /></button></div>)}{!meals.length && <p>Chưa có món ăn nào được ghi nhận cho bữa này.</p>}</div><button type="button" className="cx-journal-add-meal" onClick={() => setAdding(group.id)}>＋ Thêm món vào {group.name}</button></article>;
          })}</div></section>
          <section className="cx-journal-history" aria-labelledby="journal-history-title"><div className="cx-journal-section-heading"><div><h2 id="journal-history-title"><i className="bi bi-bar-chart-fill" aria-hidden="true" /> Lịch Sử Lượng Calo Hằng Tuần</h2><p>Tuần {displayDate(week[0])} – {displayDate(week[6])} · Mục tiêu {number(profile.calorieGoal)} kcal/ngày.</p></div><span>Trung bình: {number(average)} kcal/ngày đã ghi</span></div><div className="cx-journal-chart">{history.map((day, index) => <button type="button" key={day.date} className={day.date === date ? 'is-selected' : ''} onClick={() => setDate(day.date)} aria-label={`${displayDate(day.date)}: ${day.calories} kcal, ${day.recorded ? 'đã ghi' : 'chưa ghi'}`}><div><strong>{day.recorded ? number(day.calories) : '—'}</strong><span style={{ height: `${day.recorded ? Math.max(day.calories / chartMax * 130, 8) : 8}px` }} /></div><small>{day.date === today ? 'Hôm nay' : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][index]}</small></button>)}</div><p className="cx-journal-chart-note">Chọn một cột để xem chi tiết bữa ăn và lượng calo của ngày đó.</p></section>
        </> : <section className="cx-journal-planner"><div className="cx-journal-section-heading"><div><h1>Kế Hoạch Bữa Ăn Theo Tuần</h1><p>Tuần {displayDate(week[0])} – {displayDate(week[6])}. Chọn món để lên kế hoạch bữa ăn và ghi vào nhật ký.</p></div></div><div className="cx-journal-plan-grid">{week.map((day) => {
          const plan = data.plans[day] || {};
          const planMeals = Object.values(plan).map((id) => mealSamples.find((meal) => meal.id === id)).filter(Boolean);
          return <article key={day}><header><h2>{displayDate(day, { weekday: 'long' })}</h2><span>{displayDate(day)}</span></header>{mealGroups.map((group) => <label key={group.id}>{group.name}<select aria-label={`${group.name} ngày ${day}`} value={plan[group.id] || ''} onChange={(event) => changePlan(day,group.id,event.target.value)}><option value="">Chưa chọn món</option>{mealSamples.map((meal) => <option key={meal.id} value={meal.id}>{meal.name}</option>)}</select></label>)}<p>Dự kiến: <strong>{number(totals(planMeals).calories)} kcal</strong></p><button type="button" disabled={!planMeals.length || Boolean(data.days[day]?.length)} onClick={() => recordPlan(day)}>{data.days[day]?.length ? 'Ngày này đã có nhật ký' : 'Ghi vào nhật ký'}</button></article>;
        })}</div></section>}
      </div>
    </div>
    {adding && <ContentDialog title={`Ghi Thêm Món Ăn · ${displayDate(date)}`} onClose={() => setAdding(null)}><form className="cx-journal-entry-form" onSubmit={addMeal}><label>Bữa ăn<select name="group" defaultValue={adding}>{mealGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label>Món ăn<input name="name" required maxLength={150} placeholder="Ví dụ: Đậu hũ kho nấm" /></label><label>Khẩu phần<input name="serving" maxLength={60} placeholder="1 phần / 1 tô / 1 đĩa" /></label><div>{[['calories', 'Năng lượng (kcal)'], ['protein', 'Đạm (g)'], ['carbs', 'Tinh bột (g)'], ['fat', 'Chất béo (g)'], ['fiber', 'Chất xơ (g)']].map(([key, label]) => <label key={key}>{label}<input name={key} type="number" min="0" max={key === 'calories' ? 10000 : 1000} step="0.1" required defaultValue="0" /></label>)}</div><p>Nhập số liệu từ nhãn hoặc công thức của bạn. Không tự suy ra dinh dưỡng từ tên món.</p><button type="submit">Lưu Món Ăn</button></form></ContentDialog>}
    {editingProfile && <ContentDialog title="Chỉnh Hồ Sơ & Mục Tiêu" onClose={() => setEditingProfile(false)}><form className="cx-journal-entry-form" onSubmit={updateProfile}><label>Chiều cao (cm)<input name="height" type="number" min="50" max="250" step="0.1" required defaultValue={profile.height} /></label><label>Cân nặng (kg)<input name="weight" type="number" min="10" max="400" step="0.1" required defaultValue={profile.weight} /></label><label>Mục tiêu năng lượng do bạn đặt (kcal/ngày)<input name="calorieGoal" type="number" min="1" max="10000" required defaultValue={profile.calorieGoal} /></label><label>Mục tiêu<select name="goal" defaultValue={profile.goal}><option>Duy trì</option><option>Theo dõi</option><option>Tăng cân</option><option>Giảm cân</option></select></label><p>BMI được tính từ chiều cao và cân nặng. Trang này ghi chép số liệu và không tự đề xuất mục tiêu dinh dưỡng.</p><button type="submit">Lưu Hồ Sơ</button></form></ContentDialog>}
  </main>;
}
