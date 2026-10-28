// D:/SWP391/SWP391/client/src/features/chat/components/ChatComposer.jsx
import { Button, Form, Spinner } from 'react-bootstrap';

export default function ChatComposer({ chat }) {
  const { draft, setDraft, input, mode, busy, videoBusy, sendMessage, stopAnswer } = chat;
  function handleKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    sendMessage();
  }
  return <Form className="cx-chat-composer" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
    <Form.Group controlId="cx-chat-input" className="cx-chat-input-group">
      <Form.Label className="visually-hidden">Nhập tin nhắn hoặc link YouTube cho Trợ Lý Tư Vấn</Form.Label>
      <Form.Control as="textarea" ref={input} rows={1} maxLength={5000} value={draft}
        disabled={videoBusy} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown}
        placeholder={mode === 'summary' ? 'Dán link YouTube tiếng Việt, tối đa 11 phút…' : 'Hỏi về ăn chay hoặc gửi link YouTube…'} />
    </Form.Group>
    {videoBusy ? <Button type="button" variant="secondary" disabled aria-label="Đang xử lý video">
      <Spinner animation="border" size="sm" aria-hidden="true" />
    </Button> : busy ? <Button type="button" variant="success" aria-label="Dừng trả lời" onClick={stopAnswer}>
      <i className="bi bi-stop-fill" aria-hidden="true" />
    </Button> : <Button type="submit" variant="success" aria-label="Gửi tin nhắn" disabled={!draft.trim()}>
      <i className="bi bi-send-fill" aria-hidden="true" />
    </Button>}
  </Form>;
}
