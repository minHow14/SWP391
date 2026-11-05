// D:/SWP391/SWP391/client/src/pages/LegalDocument.jsx
import { Alert, Button, Card, Container, Spinner } from 'react-bootstrap';
import { Link } from 'react-router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLegalDocument } from '../features/legal/hooks/useLegalDocument.js';

const MARKDOWN_COMPONENTS = {
  h1: ({ children }) => <h2>{children}</h2>,
  h2: ({ children }) => <h3>{children}</h3>,
  h3: ({ children }) => <h4>{children}</h4>,
  h4: ({ children }) => <h5>{children}</h5>,
  h5: ({ children }) => <h6>{children}</h6>,
  h6: ({ children }) => <h6>{children}</h6>,
  a: ({ href, children }) => <a href={href} rel="noopener noreferrer">{children}</a>,
  table: ({ children }) => <div className="table-responsive"><table className="table table-bordered">{children}</table></div>,
};

export default function LegalDocument({ slug }) {
  const { document, loading, notFound, error, reload } = useLegalDocument({ slug });
  return (
    <main id="main-content" className="bg-light min-vh-100 py-4 py-md-5">
      <Container>
        <nav aria-label="Điều hướng" className="d-flex gap-3 mb-4">
          <Link to="/">Trang chủ</Link>
          <Link to="/dang-nhap">Đăng nhập</Link>
        </nav>
        <Card as="article" className="border-0 shadow-sm">
          <Card.Body className="p-3 p-md-5">
            <h1 className="h2 mb-3">{document?.title || 'Nội dung pháp lý'}</h1>
            {loading && <div role="status"><Spinner size="sm" animation="border" variant="success" /> Đang tải văn bản…</div>}
            {error && <Alert variant="danger">{error} <Button variant="outline-danger" size="sm" onClick={reload}>Thử lại</Button></Alert>}
            {notFound && <Alert variant="secondary">Nội dung này chưa được công bố.</Alert>}
            {document && <>
              <p className="small text-muted">Phiên bản {document.version}{document.publishedAt && <> · Công bố <time dateTime={document.publishedAt}>{new Date(document.publishedAt).toLocaleString('vi-VN')}</time></>}</p>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS} skipHtml>{document.content}</ReactMarkdown>
            </>}
          </Card.Body>
        </Card>
      </Container>
    </main>
  );
}
