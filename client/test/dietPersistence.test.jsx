// D:/SWP391/SWP391/client/test/dietPersistence.test.jsx
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import WelcomeModal from '../src/features/diet/components/WelcomeModal.jsx';
import { DatabaseProvider } from '../src/context/DatabaseProvider.jsx';
import { useDatabase } from '../src/hooks/useDatabase.js';
import { workspaceService } from '../src/services/workspaceService.js';
import apiClient from '../src/services/apiClient.js';
import { getSession, setSession } from '../src/utils/session.js';

const OPTIONS = [
  { diet_type_id: 1, name: 'Thuần chay', description: 'Chỉ thực vật' },
  { diet_type_id: 2, name: 'Chay có sữa', description: 'Thực vật và sữa' },
];
const originalAdapter = apiClient.defaults.adapter;
let storedUser;
let writes;
let saveResponse;

// Use the real layout so the regression covers the API write and displayed selection together.
import SiteLayout from '../src/components/layout/SiteLayout.jsx';
import { MemoryRouter } from 'react-router';
vi.mock('../src/components/layout/Header.jsx', () => ({ default: ({ dietName, onChangeDiet }) =>
  <><output aria-label="Kiểu ăn hiện tại">{dietName}</output><button onClick={onChangeDiet}>Đổi kiểu ăn</button></> }));
vi.mock('../src/components/layout/Footer.jsx', () => ({ default: () => null }));
vi.mock('../src/features/chat/components/ChatBox.jsx', () => ({ default: () => null }));

beforeEach(() => {
  storedUser = { user_id: 10, health_profile: { diet_type_id: 2, height: 165, weight: 60 } };
  writes = [];
  saveResponse = null;
  setSession({ token: 'diet-test-session', user: storedUser });
  sessionStorage.setItem('dietSelection', JSON.stringify({ diet_type_id: 1, name: 'Thuần chay' }));
  vi.spyOn(workspaceService, 'getCatalog').mockResolvedValue({ diets: OPTIONS });
  apiClient.defaults.adapter = async (config) => {
    if (config.method === 'patch') {
      writes.push(JSON.parse(config.data));
      if (saveResponse) return saveResponse(config);
      storedUser = { ...storedUser, health_profile: { ...storedUser.health_profile, ...writes.at(-1).health_profile } };
    }
    return { data: { success: true, data: { user: storedUser } }, status: 200, statusText: 'OK', headers: {}, config };
  };
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); setSession(null); apiClient.defaults.adapter = originalAdapter; vi.restoreAllMocks(); });
const mount = () => render(<MemoryRouter><DatabaseProvider><SiteLayout /></DatabaseProvider></MemoryRouter>);
async function chooseVegan() {
  fireEvent.click(await screen.findByRole('button', { name: 'Đổi kiểu ăn' }));
  fireEvent.click(screen.getByRole('radio', { name: /Thuần chay/ }));
  fireEvent.click(screen.getByRole('button', { name: /Xác nhận/ }));
}

it('restores the account diet instead of an unrelated guest choice and saves a confirmed change', async () => {
  mount();
  await waitFor(() => expect(screen.getByLabelText('Kiểu ăn hiện tại').textContent).toBe('Chay có sữa'));
  await chooseVegan();
  await waitFor(() => expect(storedUser.health_profile.diet_type_id).toBe(1));
  expect(writes).toEqual([{ health_profile: { diet_type_id: 1 } }]);
  expect(getSession().user.health_profile.diet_type_id).toBe(1);
  expect(screen.getByLabelText('Kiểu ăn hiện tại').textContent).toBe('Thuần chay');
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('keeps the picker open on a failed save and permits a successful retry', async () => {
  saveResponse = async () => { throw new Error('Không lưu được kiểu ăn chay'); };
  mount();
  await chooseVegan();
  expect((await screen.findByRole('alert')).textContent).toContain('Không lưu được kiểu ăn chay');
  expect(storedUser.health_profile.diet_type_id).toBe(2);
  expect(screen.getByLabelText('Kiểu ăn hiện tại').textContent).toBe('Chay có sữa');
  saveResponse = null;
  fireEvent.click(screen.getByRole('button', { name: /Xác nhận/ }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(storedUser.health_profile.diet_type_id).toBe(1);
});

it('awaits confirmation and blocks duplicate submissions while the save is pending', async () => {
  let finishSave;
  const confirm = vi.fn(() => new Promise((resolve) => { finishSave = resolve; }));
  render(<WelcomeModal options={OPTIONS} onConfirm={confirm} />);
  fireEvent.click(screen.getByRole('radio', { name: /Thuần chay/ }));
  const form = screen.getByRole('button', { name: /Xác nhận/ }).closest('form');
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(confirm).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: /Đang lưu/ }).disabled).toBe(true);
  await act(async () => { finishSave(); });
});

it('loads the account profile when login happens without remounting the provider', async () => {
  setSession(null);
  mount();
  await screen.findByRole('button', { name: 'Đổi kiểu ăn' });
  await act(async () => { setSession({ token: 'new-login', user: { user_id: 10 } }); });
  await waitFor(() => expect(getSession().user.health_profile?.diet_type_id).toBe(2));
  expect(screen.getByLabelText('Kiểu ăn hiện tại').textContent).toBe('Chay có sữa');
  expect(writes).toEqual([]);
});

it.each([11, 10])('does not replace a new session for account %s when an earlier save finishes', async (userId) => {
  let finishSave;
  saveResponse = (config) => new Promise((resolve) => { finishSave = () => resolve({
    data: { success: true, data: { user: { user_id: 10, health_profile: { diet_type_id: 1 } } } },
    status: 200, statusText: 'OK', headers: {}, config,
  }); });
  mount();
  await chooseVegan();
  await waitFor(() => expect(writes).toHaveLength(1));
  storedUser = { user_id: userId, health_profile: { diet_type_id: 2 } };
  await act(async () => { setSession({ token: 'different-account', user: storedUser }); });
  await act(async () => { finishSave(); });
  expect(getSession().user.user_id).toBe(userId);
  expect(getSession().user.health_profile.diet_type_id).toBe(2);
  expect(screen.getByLabelText('Kiểu ăn hiện tại').textContent).toBe('Chay có sữa');
});

it('requires a first account choice and saves it without copying the guest preference', async () => {
  storedUser = { user_id: 10, health_profile: null };
  setSession({ token: 'first-account-diet', user: storedUser });
  mount();
  const choice = await screen.findByRole('radio', { name: /Chay có sữa/ });
  expect(screen.getByRole('button', { name: /Xác nhận/ }).disabled).toBe(true);
  expect(writes).toEqual([]);
  fireEvent.click(choice);
  fireEvent.click(screen.getByRole('button', { name: /Xác nhận/ }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(storedUser.health_profile.diet_type_id).toBe(2);
});

it('shows profile load errors and retries instead of using a guest diet for the account', async () => {
  setSession({ token: 'profile-loading', user: { user_id: 10 } });
  const adapter = apiClient.defaults.adapter;
  apiClient.defaults.adapter = async () => { throw new Error('Không tải được hồ sơ'); };
  mount();
  expect((await screen.findByRole('alert')).textContent).toContain('Không tải được hồ sơ');
  expect(screen.queryByLabelText('Kiểu ăn hiện tại')).toBeNull();
  apiClient.defaults.adapter = adapter;
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  await waitFor(() => expect(screen.getByLabelText('Kiểu ăn hiện tại').textContent).toBe('Chay có sữa'));
});

it('keeps unauthenticated choices in the tab without writing an account profile', async () => {
  setSession(null);
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Đổi kiểu ăn' }));
  fireEvent.click(screen.getByRole('radio', { name: /Chay có sữa/ }));
  fireEvent.click(screen.getByRole('button', { name: /Xác nhận/ }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(JSON.parse(sessionStorage.getItem('dietSelection')).diet_type_id).toBe(2);
  expect(writes).toEqual([]);
});

function SharedDiet() {
  const { user } = useDatabase();
  return <output aria-label="Kiểu ăn hồ sơ">{user?.health_profile?.diet_type_id}</output>;
}

it('reloads a profile diet changed outside the picker', async () => {
  const view = render(<MemoryRouter><DatabaseProvider><SiteLayout /><SharedDiet /></DatabaseProvider></MemoryRouter>);
  await screen.findByRole('button', { name: 'Đổi kiểu ăn' });
  storedUser = { ...storedUser, health_profile: { ...storedUser.health_profile, diet_type_id: 1 } };
  view.unmount();
  mount();
  await waitFor(() => expect(screen.getByLabelText('Kiểu ăn hiện tại').textContent).toBe('Thuần chay'));
});
