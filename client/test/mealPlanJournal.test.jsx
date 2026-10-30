// D:/SWP391/SWP391/client/test/mealPlanJournal.test.jsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ApplyToJournal from '../src/features/mealPlan/components/ApplyToJournal.jsx';
import AiSuggestedMeal from '../src/features/journal/components/AiSuggestedMeal.jsx';
import { workspaceService } from '../src/services/workspaceService.js';
import { aiMealsOf, todayKey, totals } from '../src/utils/journal.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const mount = (onOpenJournal = vi.fn()) => render(
  <MemoryRouter><ApplyToJournal generationId="generation-1" onOpenJournal={onOpenJournal} /></MemoryRouter>,
);

describe('applying an AI meal plan to the journal', () => {
  it('asks before replacing the week, then links to the journal once saved', async () => {
    const apply = vi.spyOn(workspaceService, 'applyAiMealPlan').mockResolvedValue({ appliedMeals: 22 });
    const onOpenJournal = vi.fn();
    mount(onOpenJournal);
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng vào Nhật Ký/ }));
    expect(apply).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: 'Xác nhận áp dụng thực đơn' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận áp dụng/ }));
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    expect(apply).toHaveBeenCalledWith({ generationId: 'generation-1', date: todayKey() });
    fireEvent.click(screen.getByRole('link', { name: 'Xem trong Nhật Ký' }));
    expect(onOpenJournal).toHaveBeenCalled();
  });

  it('keeps the confirmation open and shows the server message when saving fails', async () => {
    vi.spyOn(workspaceService, 'applyAiMealPlan').mockRejectedValue(new Error('Không tìm thấy thực đơn AI để áp dụng.'));
    mount();
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng vào Nhật Ký/ }));
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận áp dụng/ }));
    expect((await screen.findByRole('alert')).textContent).toBe('Không tìm thấy thực đơn AI để áp dụng.');
    expect(screen.getByRole('button', { name: /Xác nhận áp dụng/ }).disabled).toBe(false);
  });

  it('cancels without calling the API', () => {
    const apply = vi.spyOn(workspaceService, 'applyAiMealPlan');
    mount();
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng vào Nhật Ký/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(apply).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Áp dụng vào Nhật Ký/ })).toBeTruthy();
  });
});

describe('AI suggestions in the journal', () => {
  const meal = { name: 'Cháo yến mạch', calories: 400, protein: 16, carbs: 60, fat: 10 };

  it('adds fiber so suggested meals can be summed with real entries', () => {
    const planned = aiMealsOf({ '2026-10-26': { breakfast: meal, lunch: { ...meal, calories: 500 } } }, '2026-10-26');
    expect(totals(planned).calories).toBe(900);
    expect(aiMealsOf({}, '2026-10-26')).toEqual([]);
    expect(aiMealsOf(undefined, '2026-10-26')).toEqual([]);
  });

  it('shows the dish and nutrition, and hands the suggestion back when accepted', () => {
    const onAccept = vi.fn();
    render(<AiSuggestedMeal meal={meal} onAccept={onAccept} />);
    expect(screen.getByText('Cháo yến mạch')).toBeTruthy();
    expect(screen.getByText(/400 kcal/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào nhật ký ngày' }));
    expect(onAccept).toHaveBeenCalledWith(meal);
  });
});
