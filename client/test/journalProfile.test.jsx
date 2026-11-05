// D:/SWP391/SWP391/client/test/journalProfile.test.jsx
import { useContext } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Journal from '../src/pages/Journal.jsx';
import { DatabaseProvider } from '../src/context/DatabaseProvider.jsx';
import { DatabaseContext } from '../src/context/databaseContext.js';
import { workspaceService } from '../src/services/workspaceService.js';
import { authService } from '../src/services/authService.js';
import { getSession, setSession } from '../src/utils/session.js';
import { subscribeSyncEvent } from '../src/utils/syncEvents.js';

const originalUser = { user_id: 10, health_profile: { height: 165, weight: 60 } };
const updatedUser = { user_id: 10, health_profile: { height: 170, weight: 65 } };
const journal = (weight = 60) => ({ days: {}, plans: {}, profile: { height: 165, weight, calorieGoal: 1800, goal: 'Duy trì' } });
function SharedProfile() {
  const { user } = useContext(DatabaseContext);
  return <output aria-label="Cân nặng hồ sơ dùng chung">{user?.health_profile?.weight}</output>;
}
async function editProfile() {
  fireEvent.click(await screen.findByRole('button', { name: /Chỉnh hồ sơ/ }));
  fireEvent.change(screen.getByLabelText('Chiều cao (cm)'), { target: { value: '170' } });
  fireEvent.change(screen.getByLabelText('Cân nặng (kg)'), { target: { value: '65' } });
}
beforeEach(() => {
  setSession({ token: 'owner-session', user: originalUser });
  vi.spyOn(workspaceService, 'getCatalog').mockResolvedValue({ recipes: [] });
  vi.spyOn(workspaceService, 'getJournal').mockResolvedValue(journal());
  vi.spyOn(authService, 'getMe').mockResolvedValue({ data: { user: originalUser } });
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); setSession(null); vi.restoreAllMocks(); });
function View() {
  const { data } = useContext(DatabaseContext);
  return data && <><Journal /><SharedProfile /></>;
}
const mount = () => render(<MemoryRouter><DatabaseProvider><View /></DatabaseProvider></MemoryRouter>);

it('refreshes the shared profile and session and notifies weight history after saving measurements', async () => {
  vi.spyOn(workspaceService, 'updateProfile').mockImplementation(async () => {
    authService.getMe.mockResolvedValue({ data: { user: updatedUser } });
    workspaceService.getJournal.mockResolvedValue(journal(65));
  });
  const changed = vi.fn();
  const unsubscribe = subscribeSyncEvent('USER_CHANGED', changed);
  mount();
  await editProfile();
  fireEvent.click(screen.getByRole('button', { name: 'Lưu Hồ Sơ' }));
  await waitFor(() => expect(screen.getByLabelText('Cân nặng hồ sơ dùng chung').textContent).toBe('65'));
  expect(getSession().user.health_profile.weight).toBe(65);
  expect(changed).toHaveBeenCalledWith(expect.objectContaining({ payload: { userId: 10 } }));
  expect(screen.queryByRole('button', { name: 'Lưu Hồ Sơ' })).toBeNull();
  unsubscribe();
});

it.each([11, 10])('does not apply or broadcast a completed save after switching to a new session for user %s', async (userId) => {
  let resolveSave;
  vi.spyOn(workspaceService, 'updateProfile').mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
  mount();
  await editProfile();
  fireEvent.click(screen.getByRole('button', { name: 'Lưu Hồ Sơ' }));
  await waitFor(() => expect(workspaceService.updateProfile).toHaveBeenCalledOnce());
  const changed = vi.fn();
  const unsubscribe = subscribeSyncEvent('USER_CHANGED', changed);
  await act(async () => { setSession({ token: 'new-session', user: { user_id: userId, health_profile: { weight: 80 } } }, { remember: false }); });
  const readsBeforeCompletion = workspaceService.getJournal.mock.calls.length;
  await act(async () => { resolveSave(); });
  expect(getSession().user.user_id).toBe(userId);
  expect(workspaceService.getJournal).toHaveBeenCalledTimes(readsBeforeCompletion);
  expect(changed).not.toHaveBeenCalled();
  unsubscribe();
});

it('blocks duplicate profile saves while pending and allows retry after failure', async () => {
  let rejectSave;
  vi.spyOn(workspaceService, 'updateProfile').mockImplementation(() => new Promise((_, reject) => { rejectSave = reject; }));
  mount();
  await editProfile();
  const save = screen.getByRole('button', { name: 'Lưu Hồ Sơ' });
  fireEvent.submit(save.closest('form'));
  fireEvent.submit(save.closest('form'));
  expect(workspaceService.updateProfile).toHaveBeenCalledOnce();
  expect(save.disabled).toBe(true);
  await act(async () => { rejectSave(new Error('Không thể lưu số đo')); });
  expect(screen.getByText('Không thể lưu số đo').closest('[role="status"]')).toBeTruthy();
  expect(save.disabled).toBe(false);
  workspaceService.updateProfile.mockResolvedValue();
  fireEvent.click(save);
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Lưu Hồ Sơ' })).toBeNull());
});

it('finishes a profile save when the access token rotates during the request', async () => {
  vi.spyOn(workspaceService, 'updateProfile').mockImplementation(async () => {
    setSession({ ...getSession(), token: 'refreshed-access' });
    authService.getMe.mockResolvedValue({ data: { user: updatedUser } });
    workspaceService.getJournal.mockResolvedValue(journal(65));
  });
  mount();
  await editProfile();
  fireEvent.click(screen.getByRole('button', { name: 'Lưu Hồ Sơ' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Lưu Hồ Sơ' })).toBeNull());
  expect(getSession().token).toBe('refreshed-access');
  expect(getSession().user.health_profile.weight).toBe(65);
});
