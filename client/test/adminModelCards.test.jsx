// D:/SWP391/SWP391/client/test/adminModelCards.test.jsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import AdminAiModelCards from '../src/features/admin/components/AdminAiModelCards.jsx';

afterEach(cleanup);
const model = { id: 'chatbot', name: 'Chatbot', type: 'Tư vấn', provider: 'DeepSeek' };

it('renders no log data without a false warning or a success percentage', () => {
  render(<AdminAiModelCards models={[{ ...model, status: 'UNKNOWN', totalCalls: 0, successRate: null }]} />);
  expect(screen.getAllByText('Chưa có dữ liệu').length).toBeGreaterThan(0);
  expect(screen.queryByText('Cảnh báo sự cố')).toBeNull();
  expect(screen.queryByText(/\d+%/)).toBeNull();
});

it('does not trust a healthy label with zero observed calls', () => {
  render(<AdminAiModelCards models={[{ ...model, status: 'HEALTHY', totalCalls: 0, successRate: 100 }]} />);
  expect(screen.queryByText('Hoạt động tốt')).toBeNull();
  expect(screen.queryByText('100%')).toBeNull();
});

it('keeps a measured zero percent and a degraded status visible', () => {
  render(<AdminAiModelCards models={[{ ...model, status: 'DEGRADED', totalCalls: 3, successRate: 0 }]} />);
  expect(screen.getByText('Cảnh báo sự cố')).toBeTruthy();
  expect(screen.getByText('0%')).toBeTruthy();
});

it('has an empty state when no models are returned', () => {
  render(<AdminAiModelCards models={[]} />);
  expect(screen.getByText('Chưa có dữ liệu giám sát mô hình AI.')).toBeTruthy();
});
