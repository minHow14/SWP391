// client/src/features/journal/components/JournalDayOverview.jsx
import HealthProfileNotice from '../../profile/components/HealthProfileNotice.jsx';
import { formatJournalNumber, displayJournalDate } from '../utils/journalViewHelpers.js';
import { mealGroups, totals } from '../../../utils/journal.js';

export default function JournalDayOverview({
  profile,
  hasMeasurements,
  bmi,
  remaining,
  percent,
  sum,
  entries,
  date,
  week,
  history,
  today,
  chartMax,
  average,
  onEditProfile,
  onAddMeal,
  onRemoveMeal,
  onSelectDate,
}) {
  return (
    <>
      <section className="cx-journal-overview" aria-label="Tổng quan nhật ký">
        <div className="cx-journal-bmi">
          <div className="cx-journal-overview-label">
            <h1>CHỈ SỐ CƠ THỂ & BMI</h1>
            <button type="button" onClick={onEditProfile}>
              <i className="bi bi-pencil" aria-hidden="true" /> Chỉnh hồ sơ
            </button>
          </div>
          {hasMeasurements ? (
            <>
              <div className="cx-journal-big-number">
                {Number.isFinite(bmi) ? bmi.toFixed(1) : '—'} <small>BMI SCORE</small>
              </div>
              <div className="cx-journal-body-stats">
                <div>
                  <small>CHIỀU CAO</small>
                  <strong>{profile.height} cm</strong>
                </div>
                <div>
                  <small>CÂN NẶNG</small>
                  <strong>{profile.weight} kg</strong>
                </div>
                <div>
                  <small>MỤC TIÊU</small>
                  <strong>{profile.goal}</strong>
                </div>
              </div>
            </>
          ) : (
            <HealthProfileNotice />
          )}
        </div>
        <div className="cx-journal-energy">
          <div className="cx-journal-overview-label">
            <h2>TỔNG CALO TRONG NGÀY</h2>
            <span>
              Mục tiêu: {formatJournalNumber(profile.calorieGoal)} kcal
              <strong>
                {remaining >= 0 ? ` Còn ${formatJournalNumber(remaining)}` : ` Vượt ${formatJournalNumber(-remaining)}`} kcal
              </strong>
            </span>
          </div>
          <div className="cx-journal-big-number">
            {formatJournalNumber(sum.calories)} <small>/ {formatJournalNumber(profile.calorieGoal)} kcal</small>
          </div>
          <progress
            max={profile.calorieGoal || 1}
            value={Math.min(sum.calories, profile.calorieGoal || 0)}
            aria-label="Năng lượng đã ghi nhận so với mục tiêu"
          />
          <p>
            <i className="bi bi-info-circle-fill" aria-hidden="true" /> Năng lượng đã ghi nhận đạt {percent}
            % mục tiêu bạn đặt.
          </p>
        </div>
      </section>

      <section className="cx-journal-macros" aria-label="Các chất dinh dưỡng">
        {[
          ['protein', 'Đạm Chay (Protein)', profile.macroGoals?.protein || 0, 'red', 'Đậu hũ, nấm, hạt'],
          ['carbs', 'Tinh Bột (Carbs)', profile.macroGoals?.carbs || 0, 'amber', 'Gạo lứt, khoai'],
          ['fat', 'Chất Béo (Fat)', profile.macroGoals?.fat || 0, 'blue', 'Bơ, hạt, dầu ô liu'],
          ['fiber', 'Chất Xơ (Fiber)', profile.macroGoals?.fiber || 0, 'green', 'Rau xanh, củ quả tươi'],
        ].map(([key, label, target, tone, hint]) => (
          <article key={key} className={`tone-${tone}`}>
            <div>
              <h2>
                <span />
                {label}
              </h2>
              <strong>
                {formatJournalNumber(sum[key])}g / {target}g
              </strong>
            </div>
            <progress max={target || 1} value={Math.min(sum[key] || 0, target)} aria-label={label} />
            <p>{hint} · Mục tiêu trong hồ sơ</p>
          </article>
        ))}
      </section>

      <section className="cx-journal-meals" aria-labelledby="journal-meals-title">
        <div className="cx-journal-section-heading">
          <div>
            <h2 id="journal-meals-title">
              <i className="bi bi-fork-knife" aria-hidden="true" /> Bữa Ăn Trong Ngày
            </h2>
            <p>Ghi chép và phân bổ lượng calo theo từng bữa ăn.</p>
          </div>
          <button type="button" onClick={() => onAddMeal('breakfast')}>
            <i className="bi bi-plus-circle-fill" aria-hidden="true" /> Ghi Thêm Bữa Ăn
          </button>
        </div>
        <div className="cx-journal-meal-grid">
          {mealGroups.map((group) => {
            const meals = entries.filter((entry) => entry.group === group.id);
            return (
              <article key={group.id} className={`cx-journal-meal-card tone-${group.tone}`}>
                <header>
                  <span className="cx-journal-meal-icon">
                    <i className={`bi bi-${group.icon}`} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{group.name}</h3>
                    <p>{displayJournalDate(date, { weekday: 'long', day: '2-digit', month: '2-digit' })}</p>
                  </div>
                  <strong>{formatJournalNumber(totals(meals).calories)} kcal</strong>
                </header>
                <div className="cx-journal-meal-items">
                  {meals.map((meal) => (
                    <div key={meal.id}>
                      <div>
                        <strong>{meal.name}</strong>
                        <small>
                          {meal.serving} · Protein: {formatJournalNumber(meal.protein)}g | Carbs: {formatJournalNumber(meal.carbs)}g
                        </small>
                      </div>
                      <span>{formatJournalNumber(meal.calories)} kcal</span>
                      <button
                        type="button"
                        onClick={() => onRemoveMeal(meal.id)}
                        aria-label={`Xóa ${meal.name}`}
                      >
                        <i className="bi bi-trash-fill" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {!meals.length && <p>Chưa có món ăn nào được ghi nhận cho bữa này.</p>}
                </div>
                <button
                  type="button"
                  className="cx-journal-add-meal"
                  onClick={() => onAddMeal(group.id)}
                >
                  ＋ Thêm món vào {group.name}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="cx-journal-history" aria-labelledby="journal-history-title">
        <div className="cx-journal-section-heading">
          <div>
            <h2 id="journal-history-title">
              <i className="bi bi-bar-chart-fill" aria-hidden="true" /> Lịch Sử Lượng Calo Hằng Tuần
            </h2>
            <p>
              Tuần {displayJournalDate(week[0])} – {displayJournalDate(week[6])} · Mục tiêu{' '}
              {formatJournalNumber(profile.calorieGoal)} kcal/ngày.
            </p>
          </div>
          <span>Trung bình: {formatJournalNumber(average)} kcal/ngày đã ghi</span>
        </div>
        <div className="cx-journal-chart">
          {history.map((day, index) => (
            <button
              type="button"
              key={day.date}
              className={day.date === date ? 'is-selected' : ''}
              onClick={() => onSelectDate(day.date)}
              aria-label={`${displayJournalDate(day.date)}: ${day.calories} kcal, ${
                day.recorded ? 'đã ghi' : 'chưa ghi'
              }`}
            >
              <div>
                <strong>{day.recorded ? formatJournalNumber(day.calories) : '—'}</strong>
                <span
                  style={{
                    height: `${day.recorded ? Math.max((day.calories / chartMax) * 130, 8) : 8}px`,
                  }}
                />
              </div>
              <small>
                {day.date === today ? 'Hôm nay' : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][index]}
              </small>
            </button>
          ))}
        </div>
        <p className="cx-journal-chart-note">
          Chọn một cột để xem chi tiết bữa ăn và lượng calo của ngày đó.
        </p>
      </section>
    </>
  );
}
