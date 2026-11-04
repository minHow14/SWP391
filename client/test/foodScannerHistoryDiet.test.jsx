// D:/SWP391/SWP391/client/test/foodScannerHistoryDiet.test.jsx
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useFoodScanner } from '../src/features/foodScanner/hooks/useFoodScanner.js';

afterEach(cleanup);
it('treats a saved Keto clear result as unverified without discarding real findings', () => {
  const findings = [{ ingredient: 'Đậu phụ', layer: 5, severity: 'info', reason: 'Cần xác nhận thành phần.' }];
  const { result } = renderHook(() => useFoodScanner(6));
  act(() => result.current.restore({ status: 'COMPLETED', requestPayload: { dietTypeId: 6, allergies: [] },
    responsePayload: { status: 'clear', dishName: 'Rau trộn', summary: 'Nhận diện rau và đậu phụ.', findings } }));
  expect(result.current.result.status).toBe('warning');
  expect(result.current.result.summary).toMatch(/chưa thể xác minh.*carb thuần/i);
  expect(result.current.result.findings).toEqual(findings);
});
