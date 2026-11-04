// D:/SWP391/SWP391/client/src/features/profile/hooks/useProfileForm.js
import { useState, useEffect, useRef } from 'react';
import { authService } from '../../../services/authService.js';
import { getSession, getSessionSnapshot, setSession } from '../../../utils/session.js';
import { emitSyncEvent } from '../../../utils/syncEvents.js';
import { profileValues } from '../utils/profileValues.js';

function profileRequest(values) {
  const nullableNumber = (value) => (value === '' ? null : Number(value));
  return {
    full_name: values.full_name.trim(),
    health_profile: {
      height: nullableNumber(values.height),
      weight: nullableNumber(values.weight),
      dob: values.dob || null,
      gender: values.gender.trim() || null,
      diet_type_id: nullableNumber(values.diet_type_id),
      health_goal: values.health_goal.trim() || null,
    },
    allergy_ids: values.allergy_ids,
  };
}

export function useProfileForm({ userId }) {
  const [account, setAccount] = useState(null);
  const [values, setValues] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const saving = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    authService
      .getMe({ signal: controller.signal })
      .then((result) => {
        const user = result?.user || result?.data?.user;
        if (!controller.signal.aborted && user && user.user_id === userId) {
          setAccount(user);
          setValues(profileValues(user));
          setError('');
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [userId, retry]);

  const change = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setNotice('');
  };

  async function save(event) {
    event.preventDefault();
    if (saving.current) return;
    const snapshot = getSessionSnapshot();
    if (snapshot.userId !== userId) return;

    saving.current = true;
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const result = await authService.updateMe(profileRequest(values));
      const user = result?.user || result?.data?.user;
      const session = getSession();
      if (snapshot.identityRevision !== getSessionSnapshot().identityRevision || session?.user?.user_id !== userId) return;
      setAccount(user);
      setValues(profileValues(user));
      setSession({ ...session, user });
      setNotice('Đã lưu hồ sơ cá nhân.');
      emitSyncEvent('USER_CHANGED', { userId });
    } catch (err) {
      if (snapshot.identityRevision === getSessionSnapshot().identityRevision) setError(err.message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return { account, values, setValues, error, notice, setNotice, busy, setRetry, search, setSearch, change, save };
}
