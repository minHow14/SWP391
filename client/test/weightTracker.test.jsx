// D:/SWP391/SWP391/client/test/weightTracker.test.jsx
// Kiểm thử phân loại BMI trong bảng theo dõi cân nặng phải nhất quán với nhãn của chatbot và thực đơn.
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import WeightTracker from '../src/features/profile/components/WeightTracker.jsx';
import { authService } from '../src/services/authService.js';
import { bmiCategory } from '../src/utils/aiHelpers.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// Render WeightTracker với một bản ghi có BMI truyền vào và trả về ô phân loại cuối cùng của bảng.
async function assessment(bmi) {
  vi.spyOn(authService, 'getHealthHistory').mockResolvedValue({ data: { histories: [
    { history_id: 1, weight: 65, bmi, recorded_date: '2026-11-04T00:00:00Z' },
  ] } });
  render(<WeightTracker height={170} currentWeight={65} />);
  const table = await screen.findByRole('table');
  return within(table).getAllByRole('cell').at(-1);
}

// Kiểm tra các giá trị biên của ngưỡng BMI châu Á; nhãn phải trùng với hàm bmiCategory dùng chung.
it.each([
  [18.4, 'Thiếu cân'], [18.5, 'Bình thường'], [22.9, 'Bình thường'], [23, 'Thừa cân'],
  [24, 'Thừa cân'], [24.9, 'Thừa cân'], [25, 'Béo phì'], [26, 'Béo phì'], [30, 'Béo phì'],
])('classifies BMI %s as %s consistently with chatbot and meal-plan labels', async (bmi, label) => {
  expect((await assessment(bmi)).textContent).toBe(label);
  expect(bmiCategory(bmi)).toBe(label);
});

// BMI thiếu hoặc không hợp lệ thì hiển thị "Chưa đủ dữ liệu" thay vì phân loại sai.
it.each([null, 0, -1, Number.NaN, Infinity])('does not classify an unavailable or invalid BMI: %s', async (bmi) => {
  expect((await assessment(bmi)).textContent).toBe('Chưa đủ dữ liệu');
});
