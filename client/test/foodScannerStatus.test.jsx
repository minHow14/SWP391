// D:/SWP391/SWP391/client/test/foodScannerStatus.test.jsx
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it } from 'vitest';
import FoodScannerResults from '../src/features/foodScanner/components/FoodScannerResults.jsx';

afterEach(cleanup);
const show = (status) => render(
  <MemoryRouter><FoodScannerResults result={{ dishName: 'Phở', summary: 'Tóm tắt', status, findings: [] }} onSave={() => {}} /></MemoryRouter>,
);

it('shows a definite verdict for both supported statuses', () => {
  show('clear');
  expect(screen.getByText('PHÙ HỢP VỚI CHẾ ĐỘ ĂN CHAY')).toBeTruthy();
  cleanup();
  show('warning');
  expect(screen.getByText(/KHÔNG PHÙ HỢP/)).toBeTruthy();
});

it('never claims an old saved result was compliant or inconclusive', () => {
  show('inconclusive');
  expect(screen.getByText('KẾT QUẢ PHÂN TÍCH')).toBeTruthy();
  expect(screen.queryByText(/CHƯA ĐỦ THÔNG TIN/)).toBeNull();
  expect(screen.queryByText(/PHÙ HỢP VỚI CHẾ ĐỘ/)).toBeNull();
});
