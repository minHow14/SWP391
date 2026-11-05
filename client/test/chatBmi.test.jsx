// D:/SWP391/SWP391/client/test/chatBmi.test.jsx
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ChatBox from '../src/features/chat/components/ChatBox.jsx';
import { streamChat } from '../src/services/aiApi.js';
import { setSession } from '../src/utils/session.js';

const database = vi.hoisted(() => ({ data: { ingredients: [] }, user: null, refreshUser: vi.fn() }));
vi.mock('../src/hooks/useDatabase.js', () => ({ useDatabase: () => database }));
vi.mock('../src/services/aiApi.js', () => ({ getChatUsage: vi.fn().mockResolvedValue({ unlimited: true }), streamChat: vi.fn() }));
vi.mock('../src/features/videoRecipeSummary/hooks/useVideoRecipeSummary.js', () => ({ useVideoRecipeSummary: () => ({ busy: false }) }));
beforeEach(() => {
  vi.clearAllMocks();
  database.user = { user_id: 7, health_profile: { height: 165, weight: 60 } };
  setSession({ token: 'member', user: database.user });
});
afterEach(() => { cleanup(); setSession(null); });
function mount() {
  render(<MemoryRouter><ChatBox dietTypeId={1} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Mở Trợ Lý Tư Vấn' }));
}

it('calculates BMI from saved measurements and displays the actual inputs without calling inference', () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Chỉ số BMI' }));
  const log = screen.getByRole('log', { name: 'Lịch sử hội thoại' });
  expect(within(log).getByText(/165 cm/)).toBeTruthy();
  expect(within(log).getByText(/60 kg/)).toBeTruthy();
  expect(within(log).getByText(/22,0/)).toBeTruthy();
  expect(within(log).getByText(/Bình thường/)).toBeTruthy();
  expect(streamChat).not.toHaveBeenCalled();
});

it.each(['guest', 'missing measurements'])('offers a real profile or login route for %s instead of sending an incomplete BMI question', (state) => {
  database.user = state === 'guest' ? null : { user_id: 7, health_profile: { height: 165, weight: null } };
  setSession(database.user ? { token: 'member', user: database.user } : null);
  mount();
  const link = screen.getByRole('link', { name: state === 'guest' ? /Đăng nhập để xem BMI/ : /Bổ sung hồ sơ để xem BMI/ });
  expect(link.getAttribute('href')).toBe(state === 'guest' ? '/dang-nhap' : '/ho-so');
  expect(streamChat).not.toHaveBeenCalled();
});
