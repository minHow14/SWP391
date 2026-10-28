// client/src/pages/Journal.jsx
import { useState } from 'react';
import { Link } from 'react-router';
import { useDatabase } from '../hooks/useDatabase.js';
import { mealGroups, todayKey, weekDates, totals } from '../utils/journal.js';
import { hasBodyMeasurements } from '../features/profile/utils/healthProfile.js';
import { displayJournalDate } from '../features/journal/utils/journalViewHelpers.js';
import { useJournalData } from '../features/journal/hooks/useJournalData.js';
import JournalDayOverview from '../features/journal/components/JournalDayOverview.jsx';
import JournalWeeklyPlanner from '../features/journal/components/JournalWeeklyPlanner.jsx';
import JournalAddMealModal from '../features/journal/components/JournalAddMealModal.jsx';
import JournalEditProfileModal from '../features/journal/components/JournalEditProfileModal.jsx';

export default function Journal() {
  const { data: catalog, user } = useDatabase();
  const mealSamples = catalog.recipes.map((r) => ({
    id: String(r.recipe_id),
    recipe_id: r.recipe_id,
    name: r.recipe_name,
    serving: '1 phần',
    calories: r.total_calories || 0,
    ...r.nutrition,
  }));
  const today = todayKey();
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState('day');
  const [adding, setAdding] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const saveStatus = 'Nhật ký cá nhân';

  const {
    data,
    notice,
    setNotice,
    refresh,
    changePlan,
    addMeal,
    removeMeal,
    updateProfile,
    recordPlan,
  } = useJournalData(user, mealSamples);

  if (!user) {
    return (
      <main className="cx-journal-page text-center p-5">
        <h1 className="h4">Nhật ký cá nhân</h1>
        <p>Đăng nhập để xem nhật ký và kế hoạch của bạn.</p>
        <Link to="/dang-nhap" className="btn btn-success">
          Đăng nhập
        </Link>
      </main>
    );
  }

  if (!data || data.ownerId !== user.user_id) {
    return (
      <main className="p-5 text-center">
        <p>{notice || 'Đang tải nhật ký…'}</p>
        {notice && (
          <button className="btn btn-success" onClick={() => refresh()}>
            Thử lại
          </button>
        )}
      </main>
    );
  }

  const entries = data.days[date] || [];
  const sum = totals(entries);
  const profile = data.profile || { height: 0, weight: 0, calorieGoal: 0, goal: 'Chưa thiết lập' };
  const hasMeasurements = hasBodyMeasurements(profile);
  const bmi = hasMeasurements ? profile.weight / (profile.height / 100) ** 2 : null;
  const remaining = profile.calorieGoal - sum.calories;
  const percent = profile.calorieGoal ? Math.round((sum.calories / profile.calorieGoal) * 100) : 0;
  const week = weekDates(date);
  const history = week.map((day) => ({
    date: day,
    calories: totals(data.days[day] || []).calories,
    recorded: Boolean(data.days[day]?.length),
  }));
  const recorded = history.filter((day) => day.recorded);
  const average = recorded.length
    ? Math.round(recorded.reduce((total, day) => total + day.calories, 0) / recorded.length)
    : 0;
  const chartMax = Math.max(profile.calorieGoal, ...history.map((day) => day.calories), 1);

  const handleAddMealSubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get('name').trim();
    if (!name) return;
    const entry = {
      date,
      name,
      serving: form.get('serving').trim() || '1 phần',
      group: form.get('group').toUpperCase(),
      ...Object.fromEntries(
        ['calories', 'protein', 'carbs', 'fat', 'fiber'].map((key) => [key, Number(form.get(key))])
      ),
    };
    const success = await addMeal(entry);
    if (success) setAdding(null);
  };

  const handleUpdateProfileSubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const success = await updateProfile({
      height: Number(form.get('height')),
      weight: Number(form.get('weight')),
      calorieGoal: Number(form.get('calorieGoal')),
      goal: form.get('goal'),
    });
    if (success) setEditingProfile(false);
  };

  const handleRecordPlan = async (day) => {
    const success = await recordPlan(day);
    if (success) {
      setDate(day);
      setTab('day');
    }
  };

  return (
    <main className="cx-journal-page flex-grow-1">
      <div className="cx-journal-shell">
        <div className="cx-journal-toolbar">
          <div role="tablist" aria-label="Chế độ nhật ký">
            <button
              id="journal-day-tab"
              role="tab"
              aria-selected={tab === 'day'}
              aria-controls="journal-content"
              className={tab === 'day' ? 'is-active' : ''}
              onClick={() => setTab('day')}
            >
              <i className="bi bi-calendar-day-fill" aria-hidden="true" /> Nhật Ký Trong Ngày
            </button>
            <button
              id="journal-week-tab"
              role="tab"
              aria-selected={tab === 'week'}
              aria-controls="journal-content"
              className={tab === 'week' ? 'is-active' : ''}
              onClick={() => setTab('week')}
            >
              <i className="bi bi-calendar-week-fill" aria-hidden="true" /> Lập Kế Hoạch Theo Tuần
            </button>
          </div>
          <div className="cx-journal-date">
            <span>
              <i className="bi bi-check-circle-fill" aria-hidden="true" /> {saveStatus}
            </span>
            <label className="cx-journal-date-picker">
              <span className="visually-hidden">Ngày nhật ký</span>
              <strong aria-hidden="true">
                {displayJournalDate(date, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                <i className="bi bi-calendar3" />
              </strong>
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  if (event.target.value) setDate(event.target.value);
                }}
              />
            </label>
          </div>
        </div>
        <p className="cx-journal-demo-note">
          Theo dõi bữa ăn và lượng dinh dưỡng hằng ngày từ công thức hoặc số liệu bạn nhập.
        </p>

        {notice && (
          <p className="cx-journal-notice" role="status">
            {notice}
            <button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo">
              ×
            </button>
          </p>
        )}

        <div
          id="journal-content"
          role="tabpanel"
          aria-labelledby={tab === 'day' ? 'journal-day-tab' : 'journal-week-tab'}
        >
          {tab === 'day' ? (
            <JournalDayOverview
              profile={profile}
              hasMeasurements={hasMeasurements}
              bmi={bmi}
              remaining={remaining}
              percent={percent}
              sum={sum}
              entries={entries}
              date={date}
              week={week}
              history={history}
              today={today}
              chartMax={chartMax}
              average={average}
              onEditProfile={() => setEditingProfile(true)}
              onAddMeal={(groupId) => setAdding(groupId)}
              onRemoveMeal={removeMeal}
              onSelectDate={(newDate) => setDate(newDate)}
            />
          ) : (
            <JournalWeeklyPlanner
              week={week}
              data={data}
              mealSamples={mealSamples}
              mealGroups={mealGroups}
              onChangePlan={changePlan}
              onRecordPlan={handleRecordPlan}
            />
          )}
        </div>
      </div>

      <JournalAddMealModal
        adding={adding}
        date={date}
        onClose={() => setAdding(null)}
        onSubmit={handleAddMealSubmit}
      />

      <JournalEditProfileModal
        editingProfile={editingProfile}
        profile={profile}
        onClose={() => setEditingProfile(false)}
        onSubmit={handleUpdateProfileSubmit}
      />
    </main>
  );
}
