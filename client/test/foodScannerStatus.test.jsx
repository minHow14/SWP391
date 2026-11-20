// D:/SWP391/SWP391/client/test/foodScannerStatus.test.jsx
// Kiểm thử phần kết luận của FoodScannerResults: chỉ đưa kết luận chắc chắn khi có căn cứ và không tự tạo vi phạm.
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it } from 'vitest';
import FoodScannerResults from '../src/features/foodScanner/components/FoodScannerResults.jsx';

afterEach(cleanup);
// Render kết quả quét với trạng thái và danh sách phát hiện truyền vào.
const show = (status, findings = []) => render(
  <MemoryRouter><FoodScannerResults result={{ dishName: 'Phở', summary: 'Tóm tắt', status, findings }} onSave={() => {}} /></MemoryRouter>,
);

// Kết quả "clear" hiển thị phù hợp; có vi phạm thành phần thật thì hiển thị không phù hợp.
it('shows definite verdicts for clear results and actual ingredient violations', () => {
  show('clear');
  expect(screen.getByText('PHÙ HỢP VỚI CHẾ ĐỘ ĂN CHAY')).toBeTruthy();
  cleanup();
  show('warning', [{ ingredient: 'Nước mắm cá', reason: 'Chứa cá', layer: 1, severity: 'violation' }]);
  expect(screen.getByText(/KHÔNG PHÙ HỢP/)).toBeTruthy();
});

// Trạng thái cảnh báo không kèm phát hiện chỉ báo cần kiểm tra thêm, không tự tạo vi phạm thành phần.
it('warns about an unverified diet without inventing an ingredient violation', () => {
  show('warning');
  expect(screen.getByText('CẦN KIỂM TRA THÊM VỀ CHẾ ĐỘ ĂN')).toBeTruthy();
  expect(screen.queryByText(/PHÁT HIỆN THÀNH PHẦN VI PHẠM/)).toBeNull();
});

// Kết quả cũ trạng thái "inconclusive" chỉ hiển thị tiêu đề trung tính, không kết luận phù hợp hay thiếu thông tin.
it('never claims an old saved result was compliant or inconclusive', () => {
  show('inconclusive');
  expect(screen.getByText('KẾT QUẢ PHÂN TÍCH')).toBeTruthy();
  expect(screen.queryByText(/CHƯA ĐỦ THÔNG TIN/)).toBeNull();
  expect(screen.queryByText(/PHÙ HỢP VỚI CHẾ ĐỘ/)).toBeNull();
});

// Loại phát hiện hiển thị bằng chữ dễ hiểu (ví dụ "Ngũ vị tân") thay vì số lớp nội bộ.
it('names the finding category in words instead of an internal layer number', () => {
  render(
    <MemoryRouter><FoodScannerResults result={{ dishName: 'Đậu phụ', summary: 'Tóm tắt', status: 'clear',
      findings: [{ ingredient: 'Hành lá', reason: 'Thuộc ngũ vị tân.', layer: 4, severity: 'warning' }] }} onSave={() => {}} /></MemoryRouter>,
  );
  expect(screen.getByText('Ngũ vị tân')).toBeTruthy();
  expect(screen.queryByText(/Lớp/)).toBeNull();
});

// Kiểm tra văn bản chưa hỗ trợ (Keto, Eat Clean) không được hiển thị như kết luận an toàn.
it('does not present an unsupported text check as a clear verdict', () => {
  render(<MemoryRouter><FoodScannerResults textResult={{ status: 'unknown', findings: [] }} /></MemoryRouter>);
  expect(screen.getByText(/chưa hỗ trợ kiểm tra.*Keto.*Eat Clean/i)).toBeTruthy();
  expect(screen.queryByText(/Chưa phát hiện từ khóa/)).toBeNull();
});

// Hiển thị đúng các gợi ý thay thế do AI trả về.
it('renders actual AI swap suggestions', () => {
  render(<MemoryRouter><FoodScannerResults result={{ status: 'warning', dishName: 'Canh',
    swapSuggestions: ['Thay nước mắm cá bằng nước tương.'] }} /></MemoryRouter>);
  expect(screen.getByText('Thay nước mắm cá bằng nước tương.')).toBeTruthy();
});
