// D:/SWP391/SWP391/client/src/features/mealPlan/hooks/useApplyMealPlan.js
import { useState } from 'react';
import { workspaceService } from '../../../services/workspaceService.js';
import { emitSyncEvent } from '../../../utils/syncEvents.js';
import { todayKey, weekDates } from '../../../utils/journal.js';

/** Quản lý các bước xác nhận → lưu khi áp dụng thực đơn AI vào kế hoạch tuần của Nhật Ký. */
export function useApplyMealPlan(generationId) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const week = weekDates(todayKey());

  async function confirm() {
    setStatus('saving');
    setError('');
    try {
      await workspaceService.applyAiMealPlan({ generationId, date: todayKey() });
      emitSyncEvent('JOURNAL_CHANGED', { generationId });
      setStatus('done');
    } catch (failure) {
      setError(failure.message);
      setStatus('error');
    }
  }

  return { status, error, weekStart: week[0], weekEnd: week[6], ask: () => setStatus('confirm'), cancel: () => setStatus('idle'), confirm };
}
