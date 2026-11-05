// D:/SWP391/SWP391/client/src/features/admin/hooks/useAdminPagination.js
import { useCallback, useEffect, useState } from 'react';

export function useAdminPagination({ fetchPage, filterKey, limit, errorMessage }) {
  const [position, setPosition] = useState({ filterKey, page: 1 });
  const [revision, setRevision] = useState(0);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const page = position.filterKey === filterKey ? position.page : 1;
  if (position.filterKey !== filterKey) setPosition({ filterKey, page: 1 });
  const total = response?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const setPage = useCallback((nextPage) => setPosition({ filterKey, page: nextPage }), [filterKey]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchPage({ page, limit }).then((result) => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil((result.meta?.total ?? 0) / limit));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setResponse(result);
    }).catch((failure) => {
      if (active) setError(failure.message || errorMessage);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [fetchPage, page, limit, revision, setPage, errorMessage]);

  return { data: response?.data ?? [], response, loading, error, setError, refresh, page, limit, total, totalPages, setPage };
}
