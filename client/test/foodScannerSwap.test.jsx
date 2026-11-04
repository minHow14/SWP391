// D:/SWP391/SWP391/client/test/foodScannerSwap.test.jsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import FoodScannerResults from '../src/features/foodScanner/components/FoodScannerResults.jsx';
import FoodSwap from '../src/pages/FoodSwap.jsx';

vi.mock('../src/hooks/useDatabase.js', () => ({ useDatabase: () => ({ data: { swaps: [
  { id: 1, original: 'Nước mắm', role: 'Gia vị', alternatives: ['Nước tương'], keywords: 'nước mắm cá', description: 'Gia vị thực vật' },
  { id: 2, original: 'Trứng', role: 'Kết dính', alternatives: ['Bột hạt lanh'], keywords: 'trứng', description: 'Kết dính thực vật' },
] } }) }));
afterEach(cleanup);

it('carries the scanned dish, finding and actual suggestions into the swap page', () => {
  render(<MemoryRouter><Routes>
    <Route path="/" element={<FoodScannerResults result={{ status: 'warning', dishName: 'Canh rau',
      findings: [{ ingredient: 'Nước mắm', reason: 'Chứa cá', layer: 1 }], swapSuggestions: ['Dùng nước tương cho canh rau.'] }} />} />
    <Route path="/doi-mon-chay" element={<FoodSwap />} />
  </Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Tìm món chay thay thế' }));
  expect(screen.getByLabelText('Tìm nguyên liệu cần thay thế').value).toBe('Nước mắm');
  expect(screen.getByText(/Canh rau/)).toBeTruthy();
  expect(screen.getByText('Dùng nước tương cho canh rau.')).toBeTruthy();
  expect(screen.queryByRole('rowheader', { name: /Trứng/ })).toBeNull();
});
