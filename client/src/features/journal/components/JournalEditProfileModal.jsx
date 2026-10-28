// client/src/features/journal/components/JournalEditProfileModal.jsx
import ContentDialog from '../../../components/common/ContentDialog.jsx';

export default function JournalEditProfileModal({ editingProfile, profile, onClose, onSubmit }) {
  if (!editingProfile) return null;

  return (
    <ContentDialog title="Chỉnh Hồ Sơ & Mục Tiêu" onClose={onClose}>
      <form className="cx-journal-entry-form" onSubmit={onSubmit}>
        <label>
          Chiều cao (cm)
          <input
            name="height"
            type="number"
            min="50"
            max="250"
            step="0.1"
            required
            defaultValue={profile.height}
          />
        </label>
        <label>
          Cân nặng (kg)
          <input
            name="weight"
            type="number"
            min="10"
            max="400"
            step="0.1"
            required
            defaultValue={profile.weight}
          />
        </label>
        <label>
          Mục tiêu năng lượng do bạn đặt (kcal/ngày)
          <input
            name="calorieGoal"
            type="number"
            min="1"
            max="10000"
            required
            defaultValue={profile.calorieGoal}
          />
        </label>
        <label>
          Mục tiêu
          <select name="goal" defaultValue={profile.goal}>
            <option>Duy trì</option>
            <option>Theo dõi</option>
            <option>Tăng cân</option>
            <option>Giảm cân</option>
          </select>
        </label>
        <p>
          BMI được tính từ chiều cao và cân nặng. Trang này ghi chép số liệu và không tự đề xuất mục tiêu dinh dưỡng.
        </p>
        <button type="submit">Lưu Hồ Sơ</button>
      </form>
    </ContentDialog>
  );
}
