// D:/SWP391/SWP391/client/test/foodScannerDiets.test.jsx
// Kiểm thử hộp thoại lập thực đơn hỗ trợ đủ các kiểu ăn đã lưu (Phật giáo, Keto, Eat Clean).
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import MealPlanDialog from '../src/features/mealPlan/components/MealPlanDialog.jsx';

afterEach(cleanup);
// jsdom chưa hỗ trợ showModal/close của <dialog> nên cần giả lập.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});
// Mỗi diet_type_id đã lưu phải được chọn sẵn đúng giá trị tương ứng trong form lập thực đơn.
it.each([[5, 'buddhist'], [6, 'keto'], [7, 'eat_clean']])('offers persisted diet %s in the meal planner', (id, value) => {
  render(<MemoryRouter><MealPlanDialog dietTypeId={id} onClose={() => {}} /></MemoryRouter>);
  expect(screen.getByLabelText('Chế độ ăn').value).toBe(value);
});
