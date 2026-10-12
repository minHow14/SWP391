import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import ContentDialog from './ContentDialog.jsx';
import { AiApiError, streamMealPlan } from '../lib/aiApi.js';
import {
  bmiCategory, buildMealPlanRequest, calcBmi, friendlyAiError, isQuotaError, mealPlanDefaults,
  stagePercent, validateMealPlanValues,
} from '../lib/aiHelpers.js';
import '../MealPlan.css';

const GOALS = [['weight_loss', 'Giảm cân'], ['maintenance', 'Duy trì'], ['muscle_gain', 'Tăng cơ']];
const ACTIVITY = [
  ['sedentary', 'Ít vận động'], ['light', 'Nhẹ (1-3 buổi/tuần)'], ['moderate', 'Vừa (3-5 buổi/tuần)'],
  ['active', 'Nhiều (6-7 buổi/tuần)'], ['very_active', 'Rất nhiều'],
];
const DIETS = [['vegan', 'Thuần chay'], ['lacto', 'Chay có sữa'], ['ovo', 'Chay có trứng'], ['lacto_ovo', 'Chay trứng & sữa']];
const GENDERS = [['', 'Chưa chọn'], ['male', 'Nam'], ['female', 'Nữ'], ['other', 'Khác']];
const ALLERGY_HINTS = ['Đậu phộng', 'Đậu nành', 'Gluten', 'Sữa', 'Trứng', 'Nấm', 'Mè', 'Hạt cây'];
const MEALS = [['breakfast', 'Sáng'], ['lunch', 'Trưa'], ['dinner', 'Tối'], ['snacks', 'Phụ']];

function TagField({ id, label, tags, onChange, hints = [], placeholder }) {
  const [text, setText] = useState('');
  const add = (value) => {
    const clean = value.trim();
    if (clean && !tags.some((tag) => tag.toLowerCase() === clean.toLowerCase())) onChange([...tags, clean]);
    setText('');
  };
  return (
    <div className="cx-mp-field cx-mp-wide">
      <label htmlFor={id}>{label}</label>
      <div className="cx-mp-tags">
        {tags.map((tag) => (
          <span key={tag} className="cx-mp-tag">
            {tag}
            <button type="button" aria-label={`Bỏ ${tag}`} onClick={() => onChange(tags.filter((item) => item !== tag))}>×</button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          maxLength={60}
          placeholder={tags.length ? '' : placeholder}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => add(text)}
          onKeyDown={(event) => {
            if ((event.key === 'Enter' || event.key === ',') && !event.nativeEvent.isComposing) {
              event.preventDefault();
              add(text);
            } else if (event.key === 'Backspace' && !text && tags.length) onChange(tags.slice(0, -1));
          }}
        />
      </div>
      {hints.length > 0 && (
        <div className="cx-mp-hints">
          {hints.filter((hint) => !tags.includes(hint)).map((hint) => (
            <button type="button" key={hint} onClick={() => add(hint)}>+ {hint}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanResult({ plan, onAsk, onRedo }) {
  const [selected, setSelected] = useState(0);
  const day = plan.weekly_plan[selected] ?? plan.weekly_plan[0];
  const profile = plan.profile_summary;
  return (
    <div className="cx-mp-result">
      <h3>{plan.title}</h3>
      <div className="cx-mp-kpis">
        <span><strong>{profile.target_daily_calories}</strong> kcal/ngày</span>
        <span>BMI <strong>{profile.bmi}</strong> · {bmiCategory(profile.bmi)}</span>
        <span>{plan.weekly_plan.length} ngày</span>
      </div>
      <p>{plan.summary}</p>
      <div className="cx-mp-days" role="tablist" aria-label="Chọn ngày">
        {plan.weekly_plan.map((item, index) => (
          <button type="button" role="tab" key={item.day_number} aria-selected={index === selected}
            className={index === selected ? 'is-active' : ''} onClick={() => setSelected(index)}>{item.day}</button>
        ))}
      </div>
      {day && (
        <div className="cx-mp-day">
          {MEALS.filter(([key]) => day[key]).map(([key, label]) => (
            <article key={key}>
              <header><span>{label}</span><strong>{day[key].name}</strong></header>
              <p className="cx-mp-macros">{day[key].estimated_calories} kcal · {day[key].protein_g} g đạm · {day[key].carbs_g} g carb · {day[key].fat_g} g béo</p>
              <p><small>Nguyên liệu:</small> {day[key].ingredients.join(', ')}</p>
              {day[key].instructions && <p><small>Cách làm:</small> {day[key].instructions}</p>}
            </article>
          ))}
          <p className="cx-mp-macros cx-mp-total">Tổng ngày: {day.daily_calories} kcal · {day.daily_protein_g} g đạm · {day.daily_carbs_g} g carb · {day.daily_fat_g} g béo</p>
        </div>
      )}
      {plan.grocery_shopping_list.length > 0 && (
        <section><h4>Cần mua thêm</h4><ul className="cx-mp-checklist">{plan.grocery_shopping_list.map((item) => (
          <li key={item}><label><input type="checkbox" /> {item}</label></li>))}</ul></section>
      )}
      {plan.nutritionist_tips.length > 0 && (
        <section><h4>Lời khuyên dinh dưỡng</h4><ul>{plan.nutritionist_tips.map((tip) => <li key={tip}>{tip}</li>)}</ul></section>
      )}
      <p className="cx-mp-note">Thực đơn mang tính tham khảo, không thay thế tư vấn của bác sĩ hoặc chuyên gia dinh dưỡng.</p>
      <div className="cx-mp-actions">
        <button type="button" className="btn btn-outline-success" onClick={onRedo}>Tạo lại</button>
        <button type="button" className="btn btn-success" onClick={() => onAsk(plan)}><i className="bi bi-chat-dots-fill" aria-hidden="true" /> Hỏi trợ lý về thực đơn này</button>
      </div>
    </div>
  );
}

export default function MealPlanDialog({ catalog, user, dietTypeId, initialPlan, onClose, onDone, onAsk }) {
  const defaults = useMemo(() => mealPlanDefaults({ user, ingredients: catalog?.ingredients, dietTypeId }), [user, catalog, dietTypeId]);
  const [values, setValues] = useState(defaults);
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState(initialPlan ? 'result' : 'form');
  const [steps, setSteps] = useState([]);
  const [plan, setPlan] = useState(initialPlan ?? null);
  const [failure, setFailure] = useState(null);
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);

  const bmi = calcBmi(values.height_cm, values.weight_kg);
  const set = (name) => (event) => setValues((previous) => ({ ...previous, [name]: event.target.value }));
  const setList = (name) => (list) => setValues((previous) => ({ ...previous, [name]: list }));

  async function submit(event) {
    event.preventDefault();
    const found = validateMealPlanValues(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setSteps([]);
    setFailure(null);
    setPhase('running');
    try {
      const result = await streamMealPlan({
        request: buildMealPlanRequest(values),
        signal: current.signal,
        onProgress: (step) => setSteps((previous) => [...previous, step]),
      });
      setPlan(result);
      setPhase('result');
      onDone?.(result);
    } catch (error) {
      if (current.signal.aborted) return;
      setFailure(error instanceof AiApiError ? error : new AiApiError({ message: error.message, cause: error }));
      setPhase('error');
    }
  }

  function cancel() {
    controller.current?.abort();
    setPhase('form');
  }

  const last = steps.at(-1);
  return (
    <ContentDialog title="Thực đơn chay theo BMI" onClose={onClose} className="cx-mealplan-dialog">
      {phase === 'form' && (
        <form className="cx-mp-form" onSubmit={submit} noValidate>
          <p className="cx-mp-lead">Nhập thông tin cơ thể và mục tiêu để trợ lý lập thực đơn chay phù hợp, tránh các nguyên liệu bạn dị ứng.{!user && <> <Link to="/dang-nhap" onClick={onClose}>Đăng nhập</Link> để điền sẵn từ hồ sơ.</>}</p>
          <div className="cx-mp-grid">
            <div className="cx-mp-field"><label htmlFor="mp-height">Chiều cao (cm)</label><input id="mp-height" type="number" step="0.1" value={values.height_cm} onChange={set('height_cm')} aria-invalid={!!errors.height_cm} />{errors.height_cm && <small role="alert">{errors.height_cm}</small>}</div>
            <div className="cx-mp-field"><label htmlFor="mp-weight">Cân nặng (kg)</label><input id="mp-weight" type="number" step="0.1" value={values.weight_kg} onChange={set('weight_kg')} aria-invalid={!!errors.weight_kg} />{errors.weight_kg && <small role="alert">{errors.weight_kg}</small>}</div>
            <div className="cx-mp-field"><label htmlFor="mp-bmi">BMI (tự tính)</label><output id="mp-bmi" className="cx-mp-bmi">{bmi ? `${bmi} · ${bmiCategory(bmi)}` : '—'}</output></div>
            <div className="cx-mp-field"><label htmlFor="mp-age">Tuổi</label><input id="mp-age" type="number" value={values.age} onChange={set('age')} aria-invalid={!!errors.age} />{errors.age && <small role="alert">{errors.age}</small>}</div>
            <div className="cx-mp-field"><label htmlFor="mp-gender">Giới tính</label><select id="mp-gender" value={values.gender} onChange={set('gender')}>{GENDERS.map(([value, label]) => <option key={label} value={value}>{label}</option>)}</select></div>
            <div className="cx-mp-field"><label htmlFor="mp-days">Số ngày (1-7)</label><input id="mp-days" type="number" min="1" max="7" value={values.days} onChange={set('days')} aria-invalid={!!errors.days} />{errors.days && <small role="alert">{errors.days}</small>}</div>
            <div className="cx-mp-field"><label htmlFor="mp-goal">Mục tiêu</label><select id="mp-goal" value={values.goal} onChange={set('goal')}>{GOALS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className="cx-mp-field"><label htmlFor="mp-activity">Mức vận động</label><select id="mp-activity" value={values.activity_level} onChange={set('activity_level')}>{ACTIVITY.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className="cx-mp-field"><label htmlFor="mp-diet">Chế độ ăn</label><select id="mp-diet" value={values.dietary_type} onChange={set('dietary_type')}>{DIETS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <TagField id="mp-allergies" label="Dị ứng / không ăn được" tags={values.allergies} onChange={setList('allergies')} hints={ALLERGY_HINTS} placeholder="Gõ rồi Enter, ví dụ: đậu phộng" />
            <TagField id="mp-pantry" label="Nguyên liệu đang có (tuỳ chọn)" tags={values.available_ingredients} onChange={setList('available_ingredients')} placeholder="Ví dụ: đậu phụ, cà chua" />
          </div>
          <div className="cx-mp-actions"><button type="button" className="btn btn-outline-secondary" onClick={onClose}>Đóng</button><button type="submit" className="btn btn-success"><i className="bi bi-stars" aria-hidden="true" /> Tạo thực đơn</button></div>
        </form>
      )}
      {phase === 'running' && (
        <div className="cx-mp-progress" role="status" aria-live="polite">
          <div className="progress" aria-hidden="true"><div className="progress-bar bg-success" style={{ width: `${stagePercent(last?.stage)}%` }} /></div>
          <p className="cx-mp-current"><span className="spinner-border spinner-border-sm text-success" aria-hidden="true" /> {last?.message || 'Đang kết nối trợ lý...'}</p>
          <ul>{steps.map((step, index) => <li key={index} className={index === steps.length - 1 ? 'is-current' : ''}>{index === steps.length - 1 ? '…' : '✓'} {step.message}</li>)}</ul>
          <p className="cx-mp-note">Việc này có thể mất khoảng một phút. Vui lòng không đóng cửa sổ.</p>
          <div className="cx-mp-actions"><button type="button" className="btn btn-outline-secondary" onClick={cancel}>Huỷ</button></div>
        </div>
      )}
      {phase === 'error' && (
        <div className="cx-mp-error" role="alert">
          <p><i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> {friendlyAiError(failure)}</p>
          {failure?.requestId && <small>Mã yêu cầu: {failure.requestId}</small>}
          <div className="cx-mp-actions">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setPhase('form')}>Quay lại</button>
            {isQuotaError(failure) ? <Link className="btn btn-success" to="/dang-nhap" onClick={onClose}>Đăng nhập</Link> : <button type="button" className="btn btn-success" onClick={submit}>Thử lại</button>}
          </div>
        </div>
      )}
      {phase === 'result' && plan && <PlanResult plan={plan} onRedo={() => setPhase('form')} onAsk={(value) => { onAsk?.(value); onClose(); }} />}
    </ContentDialog>
  );
}
