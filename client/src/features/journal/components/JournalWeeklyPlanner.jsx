// client/src/features/journal/components/JournalWeeklyPlanner.jsx
import { formatJournalNumber, displayJournalDate } from '../utils/journalViewHelpers.js';
import { totals } from '../../../utils/journal.js';

export default function JournalWeeklyPlanner({
  week,
  data,
  mealSamples,
  mealGroups,
  onChangePlan,
  onRecordPlan,
}) {
  return (
    <section className="cx-journal-planner">
      <div className="cx-journal-section-heading">
        <div>
          <h1>Kế Hoạch Bữa Ăn Theo Tuần</h1>
          <p>
            Tuần {displayJournalDate(week[0])} – {displayJournalDate(week[6])}. Chọn món để lên kế hoạch bữa ăn và
            ghi vào nhật ký.
          </p>
        </div>
      </div>
      <div className="cx-journal-plan-grid">
        {week.map((day) => {
          const plan = data.plans[day] || {};
          const planMeals = Object.values(plan)
            .map((id) => mealSamples.find((meal) => meal.id === id))
            .filter(Boolean);
          const hasRecorded = Boolean(data.days[day]?.length);

          return (
            <article key={day}>
              <header>
                <h2>{displayJournalDate(day, { weekday: 'long' })}</h2>
                <span>{displayJournalDate(day)}</span>
              </header>
              {mealGroups.map((group) => (
                <label key={group.id}>
                  {group.name}
                  <select
                    aria-label={`${group.name} ngày ${day}`}
                    value={plan[group.id] || ''}
                    onChange={(event) => onChangePlan(day, group.id, event.target.value)}
                  >
                    <option value="">Chưa chọn món</option>
                    {mealSamples.map((meal) => (
                      <option key={meal.id} value={meal.id}>
                        {meal.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <p>
                Dự kiến: <strong>{formatJournalNumber(totals(planMeals).calories)} kcal</strong>
              </p>
              <button
                type="button"
                disabled={!planMeals.length || hasRecorded}
                onClick={() => onRecordPlan(day)}
              >
                {hasRecorded ? 'Ngày này đã có nhật ký' : 'Ghi vào nhật ký'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
