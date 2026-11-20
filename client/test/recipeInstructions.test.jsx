// D:/SWP391/SWP391/client/test/recipeInstructions.test.jsx
// Kiểm thử hiển thị hướng dẫn nấu ăn trong HomeContentDialog: tách bước theo nhiều kiểu xuống dòng và trạng thái rỗng.
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import HomeContentDialog from '../src/features/home/components/HomeContentDialog.jsx';

// Các bước nấu mẫu (không kèm số thứ tự) để so sánh với nội dung hiển thị.
const STEPS = [
  'Cắt đậu hũ miếng vuông, áp chảo vàng đều các mặt trên chảo chống dính với chút dầu ăn thực vật.',
  'Rửa sạch nấm rơm búp tươi, ngâm nước muối loãng 5 phút; hạt sen luộc sơ qua nước sôi 5 phút cho mềm dẻo.',
  'Phi thơm boa-rô thái mỏng, trút nấm rơm và hạt sen vào đảo đều trong 3 phút.',
  'Nêm 2 muỗng nước tương, 1 muỗng đường thốt nốt, nửa chén nước dừa tươi rồi cho đậu hũ vào kho nhỏ lửa đến khi nước sốt sánh mịn óng ả.',
];
// Công thức mẫu dùng chung cho các test.
const recipe = { recipe_name: 'Đậu Hũ Kho Nấm Rơm & Hạt Sen', prep_time: 25, total_calories: 280,
  ingredients: ['200 gram Đậu hũ chiên', '150 gram Nấm rơm', '80 gram Hạt sen tươi luộc', '20 gram Hành boa-rô'] };

afterEach(cleanup);

// Hướng dẫn dùng ký tự xuống dòng thật hoặc dạng chuỗi thoát (\n, \r\n) đều phải tách thành danh sách có số thứ tự, không lặp số.
it.each(['\\n', '\n', '\r\n', '\\r\\n'])('renders separate numbered cooking steps for separator %j without duplicated numbers', (separator) => {
  const instructions = STEPS.map((step, index) => `${index + 1}. ${step}`).join(separator);
  render(<HomeContentDialog detail={{ kind: 'recipe', item: { ...recipe, instructions } }} onClose={() => {}} />);
  const list = screen.getByRole('list', { name: 'Các bước nấu ăn' });
  expect(list.tagName).toBe('OL');
  expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(STEPS);
  expect(list.textContent).not.toContain('\\n');
  expect(screen.getByText('200 gram Đậu hũ chiên')).toBeTruthy();
});

// Thiếu hướng dẫn thì hiển thị trạng thái rỗng trung thực thay vì danh sách trống.
it('shows an honest empty state when cooking instructions are missing', () => {
  render(<HomeContentDialog detail={{ kind: 'recipe', item: recipe }} onClose={() => {}} />);
  expect(screen.getByText('Chưa cập nhật hướng dẫn.')).toBeTruthy();
  expect(screen.queryByRole('list', { name: 'Các bước nấu ăn' })).toBeNull();
});
