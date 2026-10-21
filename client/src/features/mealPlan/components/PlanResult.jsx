// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/mealPlan/components/PlanResult.jsx
import { useState } from 'react';
import { bmiCategory, formatBmi } from '../../../utils/aiHelpers.js';

const MEALS = [['breakfast', 'Sáng'], ['lunch', 'Trưa'], ['dinner', 'Tối'], ['snacks', 'Phụ']];

export default function PlanResult({ plan, onAsk, onRedo }) {
  const [selected, setSelected] = useState(0);
  const day = plan.weekly_plan[selected] ?? plan.weekly_plan[0];
  const profile = plan.profile_summary;
  return (
    <div className="cx-mp-result">
      <h3>{plan.title}</h3>
      <div className="cx-mp-kpis">
        <span><strong>{profile.target_daily_calories}</strong> kcal/ngày</span>
        <span>BMI <strong>{formatBmi(profile.bmi)}</strong> · {bmiCategory(profile.bmi)}</span>
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
