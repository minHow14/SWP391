// D:/SWP391/SWP391/client/src/features/aiHistory/components/AiGenerationHistory.jsx
import { useEffect, useId, useRef, useState } from 'react';
import { Alert, Badge, Button, Form, ListGroup, Spinner } from 'react-bootstrap';
import { aiGenerationApi } from '../../../services/aiGenerationApi.js';

const PAGE_SIZE = 10;
const TYPE_LABELS = { CHAT: 'Hỏi đáp', MEAL_PLAN: 'Thực đơn', FOOD_SCAN: 'Quét món ăn' };
const STATUS_LABELS = { COMPLETED: 'Hoàn tất', FAILED: 'Thất bại', PROCESSING: 'Đang xử lý' };

function title(record) {
  return record.requestPayload?.message || record.responsePayload?.title || record.responsePayload?.dishName || TYPE_LABELS[record.type];
}

export default function AiGenerationHistory({ userId, type, onSelect }) {
  const [filter, setFilter] = useState(type || 'CHAT');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [state, setState] = useState({ loading: true, items: [], meta: null, error: '', ownerId: userId });
  const [selection, setSelection] = useState({ id: null, error: '' });
  const detailRequest = useRef(null);
  const controlId = useId();
  const activeType = type || filter;

  useEffect(() => {
    setPage(1);
    setSelection({ id: null, error: '' });
    return () => detailRequest.current?.abort();
  }, [userId, activeType]);

  useEffect(() => {
    if (!userId) return undefined;
    const request = new AbortController();
    setState({ loading: true, items: [], meta: null, error: '', ownerId: userId });
    aiGenerationApi.list({ page, limit: PAGE_SIZE, type: activeType }, request.signal).then((result) => {
      if (!request.signal.aborted) setState({ ...result, loading: false, error: '', ownerId: userId });
    }).catch((failure) => {
      if (!request.signal.aborted) setState({ loading: false, items: [], error: failure.message, ownerId: userId });
    });
    return () => request.abort();
  }, [userId, activeType, page, reload]);

  async function select(record) {
    detailRequest.current?.abort();
    const request = new AbortController();
    detailRequest.current = request;
    setSelection({ id: record.id, error: '' });
    try {
      const detail = await aiGenerationApi.get(record.id, request.signal);
      if (!request.signal.aborted) onSelect(detail);
    } catch (failure) {
      if (!request.signal.aborted) setSelection({ id: null, error: failure.message });
    } finally {
      if (!request.signal.aborted) setSelection((previous) => ({ ...previous, id: null }));
    }
  }

  if (!userId) return <p>Đăng nhập để xem lịch sử AI.</p>;
  const owned = state.ownerId === userId;
  return <section aria-label="Lịch sử AI" className="p-3 border-top">
    {!type && <Form.Group controlId={controlId} className="mb-2">
      <Form.Label>Loại lịch sử</Form.Label>
      <Form.Select size="sm" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}>
        {Object.entries(TYPE_LABELS).filter(([key]) => key !== 'FOOD_SCAN').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </Form.Select>
    </Form.Group>}
    {(!owned || state.loading) ? <div role="status"><Spinner animation="border" size="sm" /> Đang tải lịch sử…</div> : <>
      {state.error ? <><Alert variant="danger">{state.error}</Alert><Button size="sm" onClick={() => setReload((value) => value + 1)}>Thử lại</Button></> : <>
        {!state.items.length ? <p>Chưa có lịch sử AI.</p> : <ListGroup>
          {state.items.map((record) => <ListGroup.Item key={record.id} className="p-0">
            <Button variant="light" className="w-100 text-start text-break" disabled={Boolean(selection.id)} onClick={() => select(record)}>
              <span>{title(record)}</span>{' '}<Badge bg="secondary">{STATUS_LABELS[record.status] || record.status}</Badge>
              <small className="d-block">{new Date(record.createdAt).toLocaleString('vi-VN')}</small>
              {selection.id === record.id && <Spinner animation="border" size="sm" />}
            </Button>
          </ListGroup.Item>)}
        </ListGroup>}
        <div className="d-flex align-items-center gap-2 mt-2" aria-label="Phân trang lịch sử">
          <Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Trang trước</Button>
          <span>Trang {page}</span>
          <Button size="sm" variant="outline-secondary" disabled={page * PAGE_SIZE >= (state.meta?.total || 0)} onClick={() => setPage((value) => value + 1)}>Trang sau</Button>
        </div>
      </>}
    </>}
    {selection.error && <Alert variant="danger" className="mt-2">{selection.error}</Alert>}
  </section>;
}
