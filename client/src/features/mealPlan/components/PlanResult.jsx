// D:/SWP391/SWP391/client/src/features/mealPlan/components/PlanResult.jsx
// client/src/features/mealPlan/components/PlanResult.jsx
import { useState } from 'react';
import { bmiCategory, formatBmi } from '../../../utils/aiHelpers.js';

const MEALS = [['breakfast', 'Sáng'], ['lunch', 'Trưa'], ['dinner', 'Tối'], ['snacks', 'Phụ']];

export default function PlanResult({ plan, onAsk, onRedo }) {
  const [selected, setSelected] = useState(0);
  const day = plan.weeklyPlan[selected] ?? plan.weeklyPlan[0];
  const profile = plan.profileSummary;
  return (
    <div className="cx-mp-result">
      <h3>{plan.title}</h3>
      <div className="cx-mp-kpis">
        <span><strong>{profile.targetDailyCalories}</strong> kcal/ngày</span>
        <span>BMI <strong>{formatBmi(profile.bmi)}</strong> · {bmiCategory(profile.bmi)}</span>
        <span>{plan.weeklyPlan.length} ngày</span>
      </div>
      <p>{plan.summary}</p>
      <div className="cx-mp-days" role="tablist" aria-label="Chọn ngày">
        {plan.weeklyPlan.map((item, index) => (
          <button type="button" role="tab" key={item.dayNumber} aria-selected={index === selected}
            className={index === selected ? 'is-active' : ''} onClick={() => setSelected(index)}>{item.day}</button>
        ))}
      </div>
      {day && (
        <div className="cx-mp-day">
          {MEALS.filter(([key]) => day[key]).map(([key, label]) => (
            <article key={key}>
              <header><span>{label}</span><strong>{day[key].name}</strong></header>
              <p className="cx-mp-macros">{day[key].estimatedCalories} kcal · {day[key].proteinG} g đạm · {day[key].carbsG} g carb · {day[key].fatG} g béo</p>
              <p><small>Nguyên liệu:</small> {day[key].ingredients.join(', ')}</p>
              {day[key].instructions && <p><small>Cách làm:</small> {day[key].instructions}</p>}
            </article>
          ))}
          <p className="cx-mp-macros cx-mp-total">Tổng ngày: {day.dailyCalories} kcal · {day.dailyProteinG} g đạm · {day.dailyCarbsG} g carb · {day.dailyFatG} g béo</p>
        </div>
      )}
      {plan.groceryShoppingList.length > 0 && (
        <section><h4>Cần mua thêm</h4><ul className="cx-mp-checklist">{plan.groceryShoppingList.map((item) => (
          <li key={item}><label><input type="checkbox" /> {item}</label></li>))}</ul></section>
      )}
      {plan.nutritionistTips.length > 0 && (
        <section><h4>Lời khuyên dinh dưỡng</h4><ul>{plan.nutritionistTips.map((tip) => <li key={tip}>{tip}</li>)}</ul></section>
      )}
      <p className="cx-mp-note">Thực đơn mang tính tham khảo, không thay thế tư vấn của bác sĩ hoặc chuyên gia dinh dưỡng.</p>
      <div className="cx-mp-actions">
        <button type="button" className="btn btn-outline-success" onClick={onRedo}>Tạo lại</button>
        <button type="button" className="btn btn-success" onClick={() => onAsk(plan)}><i className="bi bi-chat-dots-fill" aria-hidden="true" /> Hỏi trợ lý về thực đơn này</button>
      </div>
    </div>
  );
}
