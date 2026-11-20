// D:/SWP391/SWP391/client/test/adminModelCards.test.jsx
// Kiểm thử thẻ mô hình AI trên trang admin: chỉ hiển thị tỉ lệ thành công khi có số lượt gọi thực tế.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import AdminAiModelCards from '../src/features/admin/components/AdminAiModelCards.jsx';

afterEach(cleanup);
// Thông tin mô hình cơ bản dùng chung, mỗi test ghép thêm trạng thái và số liệu riêng.
const model = { id: 'chatbot', name: 'Chatbot', type: 'Tư vấn', provider: 'DeepSeek' };

// Không có log thì hiển thị "Chưa có dữ liệu", không cảnh báo sai và không hiện phần trăm.
it('renders no log data without a false warning or a success percentage', () => {
  render(<AdminAiModelCards models={[{ ...model, status: 'UNKNOWN', totalCalls: 0, successRate: null }]} />);
  expect(screen.getAllByText('Chưa có dữ liệu').length).toBeGreaterThan(0);
  expect(screen.queryByText('Cảnh báo sự cố')).toBeNull();
  expect(screen.queryByText(/\d+%/)).toBeNull();
});

// Nhãn HEALTHY nhưng 0 lượt gọi thì không đáng tin, nên không hiển thị "Hoạt động tốt" hay 100%.
it('does not trust a healthy label with zero observed calls', () => {
  render(<AdminAiModelCards models={[{ ...model, status: 'HEALTHY', totalCalls: 0, successRate: 100 }]} />);
  expect(screen.queryByText('Hoạt động tốt')).toBeNull();
  expect(screen.queryByText('100%')).toBeNull();
});

// Tỉ lệ 0% đo được thật và trạng thái DEGRADED vẫn phải hiển thị, không bị coi như thiếu dữ liệu.
it('keeps a measured zero percent and a degraded status visible', () => {
  render(<AdminAiModelCards models={[{ ...model, status: 'DEGRADED', totalCalls: 3, successRate: 0 }]} />);
  expect(screen.getByText('Cảnh báo sự cố')).toBeTruthy();
  expect(screen.getByText('0%')).toBeTruthy();
});

// Không có mô hình nào thì hiển thị trạng thái rỗng.
it('has an empty state when no models are returned', () => {
  render(<AdminAiModelCards models={[]} />);
  expect(screen.getByText('Chưa có dữ liệu giám sát mô hình AI.')).toBeTruthy();
});
