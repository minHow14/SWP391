// D:/SWP391/SWP391/client/test/databaseProviderUser.test.jsx
import { useContext } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DatabaseProvider } from '../src/context/DatabaseProvider.jsx';
import { DatabaseContext } from '../src/context/databaseContext.js';
import { authService } from '../src/services/authService.js';
import { workspaceService } from '../src/services/workspaceService.js';
import { emitSyncEvent } from '../src/utils/syncEvents.js';
import { setSession } from '../src/utils/session.js';

const stale = { user_id: 10, health_profile: { height: null, weight: null } };
const fresh = { user_id: 10, health_profile: { height: 163, weight: 63 } };
const mount = () => renderHook(() => useContext(DatabaseContext), { wrapper: DatabaseProvider });

beforeEach(() => {
  setSession({ token: 'member', user: stale });
  vi.spyOn(workspaceService, 'getCatalog').mockResolvedValue({});
  vi.spyOn(authService, 'getMe').mockResolvedValue({ data: { user: fresh } });
});
afterEach(() => { cleanup(); setSession(null); vi.restoreAllMocks(); });

it('replaces the stale session profile with the server profile on load', async () => {
  const { result } = mount();
  await waitFor(() => expect(result.current.user.health_profile.height).toBe(163));
});

it('refreshes the profile when the user data changes elsewhere', async () => {
  authService.getMe.mockResolvedValueOnce({ data: { user: stale } });
  const { result } = mount();
  await waitFor(() => expect(authService.getMe).toHaveBeenCalledTimes(1));
  await act(async () => { emitSyncEvent('USER_CHANGED', { userId: 10 }); });
  await waitFor(() => expect(result.current.user.health_profile.weight).toBe(63));
});

it('keeps the current profile when refreshing fails', async () => {
  authService.getMe.mockRejectedValue(new Error('offline'));
  const { result } = mount();
  await act(async () => { await result.current.refreshUser(); });
  expect(result.current.user).toEqual(stale);
});
