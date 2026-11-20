// D:/SWP391/SWP391/client/src/features/journal/components/AiSuggestedMeal.jsx
// Thẻ hiển thị món ăn do thực đơn AI gợi ý trong nhật ký, cho phép thêm vào nhật ký ngày.
// Làm tròn 1 chữ số thập phân.
const roundOne = (value) => Math.round(value * 10) / 10;

// Component món AI gợi ý; onAccept nhận món khi người dùng bấm thêm.
export default function AiSuggestedMeal({ meal, onAccept }) {
  return (
    <div className="cx-journal-ai-meal">
      <div>
        <small><i className="bi bi-stars" aria-hidden="true" /> Thực đơn AI gợi ý</small>
        <strong>{meal.name}</strong>
        <small>{roundOne(meal.calories)} kcal · Đạm {roundOne(meal.protein)}g · Carb {roundOne(meal.carbs)}g · Béo {roundOne(meal.fat)}g</small>
      </div>
      <button type="button" onClick={() => onAccept(meal)}>Thêm vào nhật ký ngày</button>
    </div>
  );
}
