// D:/SWP391/SWP391/client/test/profileForm.test.jsx
import axios from 'axios';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useProfileForm } from '../src/features/profile/hooks/useProfileForm.js';
import apiClient from '../src/services/apiClient.js';
import { getSession, setSession } from '../src/utils/session.js';
import { subscribeSyncEvent } from '../src/utils/syncEvents.js';

const ORIGINAL_USER = { user_id: 10, full_name: 'Profile regression fixture',
  health_profile: { height: 170, weight: 60, diet_type_id: 1 }, allergies: [] };
const UPDATED_USER = { ...ORIGINAL_USER, full_name: 'Saved profile fixture',
  health_profile: { height: 172, weight: 65, diet_type_id: 5 }, allergies: [{ ingredient_id: 3 }] };
const ORIGINAL_ADAPTER = apiClient.defaults.adapter;
let changed;
let unsubscribe;

const response = (config, data) => ({ config, status: 200, headers: {}, data: { success: true, data } });
const expired = (config) => new axios.AxiosError('Expired test access token', 'ERR_BAD_REQUEST', config,
  undefined, { status: 401, headers: {}, config, data: { success: false, message: 'Phiên hết hạn' } });

async function loadForm() {
  const hook = renderHook(() => useProfileForm({ userId: ORIGINAL_USER.user_id }));
  await waitFor(() => expect(hook.result.current.values?.weight).toBe(60));
  act(() => hook.result.current.setValues({ ...hook.result.current.values,
    full_name: UPDATED_USER.full_name, height: 172, weight: 65, diet_type_id: 5, allergy_ids: [3] }));
  return hook;
}

function pendingSave() {
  let resolve;
  let reject;
  let config;
  let writes = 0;
  const pending = new Promise((accept, fail) => { resolve = accept; reject = fail; });
  apiClient.defaults.adapter = (request) => {
    if (request.method === 'get') return Promise.resolve(response(request, { user: ORIGINAL_USER }));
    config = request;
    writes += 1;
    return pending;
  };
  return { ready: () => Boolean(config), writes: () => writes,
    complete: () => resolve(response(config, { user: UPDATED_USER })),
    fail: () => reject(new Error('Old save failed')) };
}

beforeEach(() => {
  setSession(null);
  sessionStorage.clear(); localStorage.clear();
  setSession({ token: 'initial-access', user: ORIGINAL_USER });
  changed = vi.fn();
  unsubscribe = subscribeSyncEvent('USER_CHANGED', changed);
});

afterEach(() => {
  unsubscribe(); cleanup(); setSession(null);
  apiClient.defaults.adapter = ORIGINAL_ADAPTER;
});

it.each([false, true])('applies the saved profile and broadcasts it with refresh=%s', async (refresh) => {
  const calls = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    if (config.url === '/auth/refresh') return response(config, { token: 'refreshed-access', userId: 10 });
    if (config.method === 'get') return response(config, { user: ORIGINAL_USER });
    if (refresh && !config.authRetried) throw expired(config);
    return response(config, { user: UPDATED_USER });
  };
  const { result } = await loadForm();
  await act(async () => result.current.save({ preventDefault() {} }));
  expect(getSession().token).toBe(refresh ? 'refreshed-access' : 'initial-access');
  expect(getSession().user).toEqual(UPDATED_USER);
  expect(result.current.account).toEqual(UPDATED_USER);
  expect(result.current.values).toMatchObject({ weight: 65, diet_type_id: 5, allergy_ids: [3] });
  expect(result.current.notice).toBe('Đã lưu hồ sơ cá nhân.');
  expect(result.current.busy).toBe(false);
  expect(changed).toHaveBeenCalledOnce();
  expect(changed).toHaveBeenCalledWith(expect.objectContaining({ payload: { userId: 10 } }));
  expect(calls.filter((call) => call.url === '/auth/refresh')).toHaveLength(refresh ? 1 : 0);
  expect(JSON.parse(calls.at(-1).data)).toMatchObject({ full_name: UPDATED_USER.full_name,
    health_profile: { height: 172, weight: 65, diet_type_id: 5, dob: null, gender: null, health_goal: null },
    allergy_ids: [3] });
});

it.each([11, 10])('ignores an old response after a new login for user %s, even with the same token value', async (userId) => {
  const pending = pendingSave();
  const { result } = await loadForm();
  let saving;
  act(() => { saving = result.current.save({ preventDefault() {} }); });
  await waitFor(() => expect(pending.ready()).toBe(true));
  const newerUser = { ...ORIGINAL_USER, user_id: userId, full_name: 'New login fixture' };
  act(() => { setSession(null); setSession({ token: 'initial-access', user: newerUser }); });
  await act(async () => { pending.complete(); await saving; });
  expect(getSession().user).toEqual(newerUser);
  expect(result.current.account).toEqual(ORIGINAL_USER);
  expect(result.current.notice).toBe('');
  expect(changed).not.toHaveBeenCalled();
});

it('ignores an old save failure after the user signs in again', async () => {
  const pending = pendingSave();
  const { result } = await loadForm();
  let saving;
  act(() => { saving = result.current.save({ preventDefault() {} }); });
  await waitFor(() => expect(pending.ready()).toBe(true));
  act(() => { setSession(null); setSession({ token: 'new-login', user: ORIGINAL_USER }); });
  await act(async () => { pending.fail(); await saving; });
  expect(result.current.error).toBe('');
  expect(getSession().token).toBe('new-login');
  expect(changed).not.toHaveBeenCalled();
});

it('blocks duplicate saves and allows retry after a current-session failure', async () => {
  const pending = pendingSave();
  const { result } = await loadForm();
  let saving;
  act(() => {
    saving = result.current.save({ preventDefault() {} });
    result.current.save({ preventDefault() {} });
  });
  await waitFor(() => expect(pending.ready()).toBe(true));
  expect(result.current.busy).toBe(true);
  expect(pending.writes()).toBe(1);
  await act(async () => { pending.fail(); await saving; });
  expect(result.current.error).toBe('Old save failed');
  expect(result.current.busy).toBe(false);
  apiClient.defaults.adapter = async (config) => response(config, { user: UPDATED_USER });
  await act(async () => result.current.save({ preventDefault() {} }));
  expect(result.current.error).toBe('');
  expect(getSession().user).toEqual(UPDATED_USER);
  expect(changed).toHaveBeenCalledOnce();
});
