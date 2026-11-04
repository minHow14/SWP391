// D:/SWP391/SWP391/client/test/foodScannerDiets.test.jsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import MealPlanDialog from '../src/features/mealPlan/components/MealPlanDialog.jsx';

afterEach(cleanup);
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});
it.each([[5, 'buddhist'], [6, 'keto'], [7, 'eat_clean']])('offers persisted diet %s in the meal planner', (id, value) => {
  render(<MemoryRouter><MealPlanDialog dietTypeId={id} onClose={() => {}} /></MemoryRouter>);
  expect(screen.getByLabelText('Chế độ ăn').value).toBe(value);
});
