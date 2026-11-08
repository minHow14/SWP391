// D:/SWP391/SWP391/client/test/mealPlanSavedDiet.test.jsx
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import MealPlanDialog from '../src/features/mealPlan/components/MealPlanDialog.jsx';
import apiClient from '../src/services/apiClient.js';
import { setSession } from '../src/utils/session.js';

const USER = { user_id: 10, health_profile: { height: 165, weight: 60, diet_type_id: 2, health_goal: 'Duy trì' } };
const originalAdapter = apiClient.defaults.adapter;
let savedUser;
let submittedRequest;

beforeEach(() => {
  savedUser = { ...USER, health_profile: { ...USER.health_profile, diet_type_id: 1 } };
  submittedRequest = null;
  setSession({ token: 'saved-diet-session', user: USER });
  apiClient.defaults.adapter = async (config) => ({ data: { success: true, data: { user: savedUser } },
    status: 200, statusText: 'OK', headers: {}, config });
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
    submittedRequest = JSON.parse(options.body);
    return new Response('event: error\ndata: {"errorCode":"AI_PROVIDER_ERROR","message":"Kết thúc tại ranh giới AI"}\n\n',
      { headers: { 'content-type': 'text/event-stream' } });
  }));
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); setSession(null); apiClient.defaults.adapter = originalAdapter; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const mount = () => render(<MemoryRouter><MealPlanDialog user={USER} dietTypeId={2} catalog={{ ingredients: [] }} onClose={() => {}} /></MemoryRouter>);

it.each([[1, 'vegan'], [2, 'lacto'], [3, 'ovo'], [4, 'lacto_ovo'], [5, 'buddhist'], [6, 'keto'], [7, 'eat_clean']])(
  'reads the saved diet %s immediately before submitting the weekly AI request', async (id, dietaryType) => {
    savedUser.health_profile.diet_type_id = id;
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo thực đơn' }));
    await waitFor(() => expect(submittedRequest).not.toBeNull());
    expect(submittedRequest).toMatchObject({ dietaryType, days: 7 });
  },
);

it('explains that authenticated plans use the saved profile diet', () => {
  mount();
  expect(screen.getByLabelText('Chế độ ăn').disabled).toBe(true);
  expect(screen.getByText(/kiểu ăn chay đã lưu/i)).toBeTruthy();
});

it('does not call AI if reading the saved profile fails', async () => {
  apiClient.defaults.adapter = async () => { throw new Error('Không tải được hồ sơ'); };
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Tạo thực đơn' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Không tải được hồ sơ');
  expect(submittedRequest).toBeNull();
});

it('requires a saved diet instead of silently falling back to Vegan', async () => {
  savedUser.health_profile.diet_type_id = null;
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Tạo thực đơn' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/chọn kiểu ăn chay/i);
  expect(submittedRequest).toBeNull();
});

it('never submits an old profile through a newly signed-in account', async () => {
  let finishRead;
  apiClient.defaults.adapter = (config) => new Promise((resolve) => { finishRead = () => resolve({
    data: { success: true, data: { user: savedUser } }, status: 200, statusText: 'OK', headers: {}, config,
  }); });
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Tạo thực đơn' }));
  await waitFor(() => expect(finishRead).toBeTypeOf('function'));
  setSession({ token: 'new-account', user: { user_id: 11 } });
  await act(async () => { finishRead(); });
  expect(submittedRequest).toBeNull();
});

it('does not generate after the user cancels a pending profile read', async () => {
  let finishRead;
  apiClient.defaults.adapter = (config) => new Promise((resolve) => { finishRead = () => resolve({
    data: { success: true, data: { user: savedUser } }, status: 200, statusText: 'OK', headers: {}, config,
  }); });
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Tạo thực đơn' }));
  await waitFor(() => expect(finishRead).toBeTypeOf('function'));
  fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
  await act(async () => { finishRead(); });
  expect(submittedRequest).toBeNull();
  expect(screen.getByRole('button', { name: 'Tạo thực đơn' })).toBeTruthy();
});

it('keeps the saved diet when the access token rotates during the profile read', async () => {
  const adapter = apiClient.defaults.adapter;
  apiClient.defaults.adapter = async (config) => {
    setSession({ token: 'rotated-token', user: USER });
    return adapter(config);
  };
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Tạo thực đơn' }));
  await waitFor(() => expect(submittedRequest?.dietaryType).toBe('vegan'));
});

it('rejects an older profile read after the same account saves a different diet', async () => {
  let finishRead;
  apiClient.defaults.adapter = (config) => new Promise((resolve) => { finishRead = () => resolve({
    data: { success: true, data: { user: savedUser } }, status: 200, statusText: 'OK', headers: {}, config,
  }); });
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Tạo thực đơn' }));
  await waitFor(() => expect(finishRead).toBeTypeOf('function'));
  const newerUser = { ...USER, health_profile: { ...USER.health_profile, diet_type_id: 5 } };
  setSession({ token: 'saved-diet-session', user: newerUser });
  await act(async () => { finishRead(); });
  expect(submittedRequest).toBeNull();
  expect((await screen.findByRole('alert')).textContent).toMatch(/kiểu ăn chay.*thay đổi/i);
});
