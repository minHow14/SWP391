// D:/SWP391/SWP391/client/src/features/legal/hooks/useLegalDocument.js
import { useCallback, useEffect, useState } from 'react';
import { legalDocumentService } from '../../../services/legalDocumentService.js';

export function useLegalDocument({ slug, admin = false }) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({});
  const key = `${slug}:${admin}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    const load = admin ? legalDocumentService.getAdmin : legalDocumentService.getPublished;
    load(slug, controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      if (!response?.data || typeof response.data.title !== 'string' || typeof response.data.content !== 'string') {
        throw new Error('Dữ liệu văn bản không hợp lệ.');
      }
      setState({ key, document: response.data });
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ key, notFound: error.status === 404,
        error: error.status === 404 ? '' : error.message || 'Không thể tải văn bản. Vui lòng thử lại.' });
    });
    return () => controller.abort();
  }, [key, slug, admin]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const replaceDocument = useCallback((document) => setState((previous) => previous.key === key
    ? { key, document } : previous), [key]);
  const current = state.key === key;
  return { document: current ? state.document : null, loading: !current,
    notFound: current && state.notFound, error: current ? state.error : '', reload, replaceDocument };
}
