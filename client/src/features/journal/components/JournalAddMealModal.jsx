// client/src/features/journal/components/JournalAddMealModal.jsx
import ContentDialog from '../../../components/common/ContentDialog.jsx';
import { displayJournalDate } from '../utils/journalViewHelpers.js';
import { mealGroups } from '../../../utils/journal.js';

export default function JournalAddMealModal({ adding, date, onClose, onSubmit }) {
  if (!adding) return null;

  return (
    <ContentDialog title={`Ghi Thêm Món Ăn · ${displayJournalDate(date)}`} onClose={onClose}>
      <form className="cx-journal-entry-form" onSubmit={onSubmit}>
        <label>
          Bữa ăn
          <select name="group" defaultValue={adding}>
            {mealGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Món ăn
          <input name="name" required maxLength={150} placeholder="Ví dụ: Đậu hũ kho nấm" />
        </label>
        <label>
          Khẩu phần
          <input name="serving" maxLength={60} placeholder="1 phần / 1 tô / 1 đĩa" />
        </label>
        <div>
          {[
            ['calories', 'Năng lượng (kcal)'],
            ['protein', 'Đạm (g)'],
            ['carbs', 'Tinh bột (g)'],
            ['fat', 'Chất béo (g)'],
            ['fiber', 'Chất xơ (g)'],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                name={key}
                type="number"
                min="0"
                max={key === 'calories' ? 10000 : 1000}
                step="0.1"
                required
                defaultValue="0"
              />
            </label>
          ))}
        </div>
        <p>Nhập số liệu từ nhãn hoặc công thức của bạn. Không tự suy ra dinh dưỡng từ tên món.</p>
        <button type="submit">Lưu Món Ăn</button>
      </form>
    </ContentDialog>
  );
}
