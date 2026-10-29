// D:/SWP391/SWP391/client/src/features/journal/components/AiSuggestedMeal.jsx
const roundOne = (value) => Math.round(value * 10) / 10;

export default function AiSuggestedMeal({ meal, onAccept }) {
  return (
    <div className="cx-journal-ai-meal">
      <div>
        <small><i className="bi bi-stars" aria-hidden="true" /> Thực đơn AI gợi ý</small>
        <strong>{meal.name}</strong>
        <small>{roundOne(meal.calories)} kcal · Đạm {roundOne(meal.protein)}g · Carb {roundOne(meal.carbs)}g · Béo {roundOne(meal.fat)}g</small>
      </div>
      <button type="button" onClick={() => onAccept(meal)}>Ghi vào bữa</button>
    </div>
  );
}
