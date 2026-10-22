// client/src/features/profile/hooks/useProfileForm.js
import { useState, useEffect, useRef } from 'react';
import { api } from '../../../services/api.js';
import { getSession, setSession } from '../../../utils/session.js';
import { profileValues } from '../utils/profileValues.js';

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
    api('/auth/me', { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted && result.user.user_id === userId) {
          setAccount(result.user);
          setValues(profileValues(result.user));
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
    const session = getSession();
    if (session?.user?.user_id !== userId) return;

    saving.current = true;
    setBusy(true);
    setError('');
    setNotice('');

    const nullableNumber = (value) => (value === '' ? null : Number(value));
    try {
      const result = await api('/auth/me', {
        method: 'PATCH',
        body: {
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
        },
      });

      if (getSession()?.token !== session.token) return;
      setAccount(result.user);
      setValues(profileValues(result.user));
      setSession({ ...session, user: result.user });
      setNotice('Đã lưu hồ sơ cá nhân.');
    } catch (err) {
      setError(err.message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return { account, values, setValues, error, notice, setNotice, busy, setRetry, search, setSearch, change, save };
}
