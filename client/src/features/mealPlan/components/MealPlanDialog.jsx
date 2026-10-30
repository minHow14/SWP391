// D:/SWP391/SWP391/client/src/features/mealPlan/components/MealPlanDialog.jsx
// client/src/features/mealPlan/components/MealPlanDialog.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import TagField from './TagField.jsx';
import PlanResult from './PlanResult.jsx';
import ContentDialog from '../../../components/common/ContentDialog.jsx';
import { AiApiError, streamMealPlan } from '../../../services/aiApi.js';
import HealthProfileNotice from '../../profile/components/HealthProfileNotice.jsx';
import { hasBodyMeasurements } from '../../profile/utils/healthProfile.js';
import {
  bmiCategory, buildMealPlanRequest, calcBmi, formatBmi, friendlyAiError, isQuotaError, mealPlanDefaults,
  stagePercent, validateMealPlanValues,
} from '../../../utils/aiHelpers.js';

const GOALS = [['weight_loss', 'Giảm cân'], ['maintenance', 'Duy trì'], ['muscle_gain', 'Tăng cơ']];
const ACTIVITY = [
  ['sedentary', 'Ít vận động'], ['light', 'Nhẹ (1-3 buổi/tuần)'], ['moderate', 'Vừa (3-5 buổi/tuần)'],
  ['active', 'Nhiều (6-7 buổi/tuần)'], ['very_active', 'Rất nhiều'],
];
const DIETS = [['vegan', 'Thuần chay'], ['lacto', 'Chay có sữa'], ['ovo', 'Chay có trứng'], ['lacto_ovo', 'Chay trứng & sữa']];
const GENDERS = [['', 'Chưa chọn'], ['male', 'Nam'], ['female', 'Nữ'], ['other', 'Khác']];
const ALLERGY_HINTS = ['Đậu phộng', 'Đậu nành', 'Gluten', 'Sữa', 'Trứng', 'Nấm', 'Mè', 'Hạt cây'];
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
  const needsProfile = Boolean(user) && !hasBodyMeasurements(user.health_profile);

  const bmi = calcBmi(values.heightCm, values.weightKg);
  const set = (name) => (event) => setValues((previous) => ({ ...previous, [name]: event.target.value }));
  const setList = (name) => (list) => setValues((previous) => ({ ...previous, [name]: list }));

  async function submit(event) {
    event.preventDefault();
    if (needsProfile) return;
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
        onProgress: (step) => { if (!current.signal.aborted) setSteps((previous) => [...previous, step]); },
      });
      if (current.signal.aborted) return;
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
  if (needsProfile) {
    return (
      <ContentDialog title="Thực đơn cá nhân" onClose={onClose}>
        <HealthProfileNotice onContinue={onClose} />
      </ContentDialog>
    );
  }
  return (
    <ContentDialog title="Thực đơn chay theo BMI" onClose={onClose} className="cx-mealplan-dialog">
      {phase === 'form' && (
        <form className="cx-mp-form" onSubmit={submit} noValidate>
          <p className="cx-mp-lead">Nhập thông tin cơ thể và mục tiêu để trợ lý lập thực đơn chay phù hợp, tránh các nguyên liệu bạn dị ứng.{!user && <> <Link to="/dang-nhap" onClick={onClose}>Đăng nhập</Link> để điền sẵn từ hồ sơ.</>}</p>
          <div className="cx-mp-grid">
            <div className="cx-mp-field"><label htmlFor="mp-height">Chiều cao (cm)</label><input id="mp-height" type="number" step="0.1" value={values.heightCm} onChange={set('heightCm')} aria-invalid={!!errors.heightCm} />{errors.heightCm && <small role="alert">{errors.heightCm}</small>}</div>
            <div className="cx-mp-field"><label htmlFor="mp-weight">Cân nặng (kg)</label><input id="mp-weight" type="number" step="0.1" value={values.weightKg} onChange={set('weightKg')} aria-invalid={!!errors.weightKg} />{errors.weightKg && <small role="alert">{errors.weightKg}</small>}</div>
            <div className="cx-mp-field"><label htmlFor="mp-bmi">BMI (tự tính)</label><output id="mp-bmi" className="cx-mp-bmi">{bmi ? `${formatBmi(bmi)} · ${bmiCategory(bmi)}` : '—'}</output></div>
            <div className="cx-mp-field"><label htmlFor="mp-age">Tuổi</label><input id="mp-age" type="number" value={values.age} onChange={set('age')} aria-invalid={!!errors.age} />{errors.age && <small role="alert">{errors.age}</small>}</div>
            <div className="cx-mp-field"><label htmlFor="mp-gender">Giới tính</label><select id="mp-gender" value={values.gender} onChange={set('gender')}>{GENDERS.map(([value, label]) => <option key={label} value={value}>{label}</option>)}</select></div>
            <div className="cx-mp-field"><label htmlFor="mp-days">Số ngày (1-7)</label><input id="mp-days" type="number" min="1" max="7" value={values.days} onChange={set('days')} aria-invalid={!!errors.days} />{errors.days && <small role="alert">{errors.days}</small>}</div>
            <div className="cx-mp-field"><label htmlFor="mp-goal">Mục tiêu</label><select id="mp-goal" value={values.goal} onChange={set('goal')}>{GOALS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className="cx-mp-field"><label htmlFor="mp-activity">Mức vận động</label><select id="mp-activity" value={values.activityLevel} onChange={set('activityLevel')}>{ACTIVITY.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className="cx-mp-field"><label htmlFor="mp-diet">Chế độ ăn</label><select id="mp-diet" value={values.dietaryType} onChange={set('dietaryType')}>{DIETS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <TagField id="mp-allergies" label="Dị ứng / không ăn được" tags={values.allergies} onChange={setList('allergies')} hints={ALLERGY_HINTS} placeholder="Gõ rồi Enter, ví dụ: đậu phộng" />
            <TagField id="mp-pantry" label="Nguyên liệu đang có (tuỳ chọn)" tags={values.availableIngredients} onChange={setList('availableIngredients')} placeholder="Ví dụ: đậu phụ, cà chua" />
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
      {phase === 'result' && plan && <PlanResult plan={plan} onRedo={() => setPhase('form')} onOpenJournal={onClose} onAsk={(value) => { onAsk?.(value); onClose(); }} />}
    </ContentDialog>
  );
}
