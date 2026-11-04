// D:/SWP391/SWP391/client/test/weightTracker.test.jsx
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import WeightTracker from '../src/features/profile/components/WeightTracker.jsx';
import { authService } from '../src/services/authService.js';
import { bmiCategory } from '../src/utils/aiHelpers.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function assessment(bmi) {
  vi.spyOn(authService, 'getHealthHistory').mockResolvedValue({ data: { histories: [
    { history_id: 1, weight: 65, bmi, recorded_date: '2026-11-04T00:00:00Z' },
  ] } });
  render(<WeightTracker height={170} currentWeight={65} />);
  const table = await screen.findByRole('table');
  return within(table).getAllByRole('cell').at(-1);
}

it.each([
  [18.4, 'Thiếu cân'], [18.5, 'Bình thường'], [22.9, 'Bình thường'], [23, 'Thừa cân'],
  [24, 'Thừa cân'], [24.9, 'Thừa cân'], [25, 'Béo phì'], [26, 'Béo phì'], [30, 'Béo phì'],
])('classifies BMI %s as %s consistently with chatbot and meal-plan labels', async (bmi, label) => {
  expect((await assessment(bmi)).textContent).toBe(label);
  expect(bmiCategory(bmi)).toBe(label);
});

it.each([null, 0, -1, Number.NaN, Infinity])('does not classify an unavailable or invalid BMI: %s', async (bmi) => {
  expect((await assessment(bmi)).textContent).toBe('Chưa đủ dữ liệu');
});
