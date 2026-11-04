// D:/SWP391/SWP391/client/src/features/admin/components/AdminLegalDocumentsTab.jsx
import { useEffect, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { legalDocumentService } from '../../../services/legalDocumentService.js';
import { useLegalDocument } from '../../legal/hooks/useLegalDocument.js';

const EMPTY_FORM = { title: '', content: '', published: false };
const LEGAL_DOCUMENT_SCHEMA = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề.').max(200, 'Tiêu đề tối đa 200 ký tự.'),
  content: z.string().trim().min(1, 'Vui lòng nhập nội dung.').max(100000, 'Nội dung tối đa 100.000 ký tự.'),
  published: z.boolean(),
});
const PUBLIC_PATHS = { 'terms-of-service': '/dieu-khoan', 'privacy-policy': '/chinh-sach-bao-mat' };

export default function AdminLegalDocumentsTab() {
  const [slug, setSlug] = useState('terms-of-service');
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState('');
  const { document, loading, notFound, error, reload, replaceDocument } = useLegalDocument({ slug, admin: true });
  const { register, reset, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({
    resolver: zodResolver(LEGAL_DOCUMENT_SCHEMA), defaultValues: EMPTY_FORM,
  });
  useEffect(() => {
    if (!loading) reset(document ? { title: document.title, content: document.content, published: document.published } : EMPTY_FORM);
  }, [document, loading, reset]);

  const selectDocument = (event) => {
    if (isDirty && !window.confirm('Bỏ các thay đổi chưa lưu để mở văn bản khác?')) return;
    setNotice('');
    setSaveError('');
    setSlug(event.target.value);
  };
  const saveDocument = async (values) => {
    setNotice('');
    setSaveError('');
    try {
      const response = await legalDocumentService.save(slug, values);
      if (!response?.data) throw new Error('Phản hồi lưu văn bản không hợp lệ.');
      replaceDocument(response.data);
      setNotice(`Đã lưu phiên bản ${response.data.version}.`);
    } catch (failure) {
      setSaveError(failure.message || 'Không thể lưu văn bản. Vui lòng thử lại.');
    }
  };

  return (
    <section aria-labelledby="legalDocumentsTitle">
      <h2 id="legalDocumentsTitle" className="h4 fw-bold">Điều khoản và chính sách bảo mật</h2>
      <p className="text-muted small">Nhập nội dung đã được phê duyệt. Chỉ văn bản được công bố mới xuất hiện ở trang công khai.</p>
      <Form.Group controlId="legalDocumentSlug" className="mb-3">
        <Form.Label>Loại văn bản</Form.Label>
        <Form.Select value={slug} disabled={isSubmitting} onChange={selectDocument}>
          <option value="terms-of-service">Điều khoản sử dụng</option>
          <option value="privacy-policy">Chính sách bảo mật</option>
        </Form.Select>
      </Form.Group>
      {loading && <div role="status" className="py-4"><Spinner size="sm" animation="border" variant="success" /> Đang tải văn bản…</div>}
      {error && <Alert variant="danger">{error} <Button size="sm" variant="outline-danger" onClick={reload}>Thử lại</Button></Alert>}
      {notice && <Alert variant="success" role="status">{notice}</Alert>}
      {saveError && <Alert variant="danger">{saveError}</Alert>}
      {!loading && !error && <>
        {notFound && <Alert variant="secondary">Chưa có văn bản. Nhập nội dung để tạo bản nháp hoặc công bố.</Alert>}
        {document && <p className="small text-muted">Phiên bản {document.version} · {document.published ? 'Đã công bố' : 'Bản nháp'}
          {document.published && <> · <a href={PUBLIC_PATHS[slug]} target="_blank" rel="noopener noreferrer">Xem trang công khai</a></>}
        </p>}
        <Form noValidate onSubmit={handleSubmit(saveDocument)} aria-busy={isSubmitting}>
          <fieldset disabled={isSubmitting}>
            <Form.Group controlId="legalDocumentTitle" className="mb-3">
              <Form.Label>Tiêu đề</Form.Label>
              <Form.Control {...register('title')} maxLength={200} isInvalid={!!errors.title} aria-describedby={errors.title ? 'legalDocumentTitleError' : undefined} />
              <Form.Control.Feedback type="invalid" id="legalDocumentTitleError">{errors.title?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="legalDocumentContent" className="mb-3">
              <Form.Label>Nội dung Markdown</Form.Label>
              <Form.Control as="textarea" rows={14} {...register('content')} maxLength={100000} isInvalid={!!errors.content} aria-describedby={errors.content ? 'legalDocumentContentError' : 'legalDocumentContentHelp'} />
              <Form.Control.Feedback type="invalid" id="legalDocumentContentError">{errors.content?.message}</Form.Control.Feedback>
              <Form.Text id="legalDocumentContentHelp">Có thể dùng tiêu đề, danh sách và liên kết Markdown. HTML thô không được hiển thị.</Form.Text>
            </Form.Group>
            <Form.Check {...register('published')} id="legalDocumentPublished" type="checkbox" label="Công bố công khai" className="mb-2" />
            <p className="text-muted small">Bỏ chọn để lưu bản nháp và ngừng hiển thị văn bản trên trang công khai.</p>
            <Button type="submit" variant="success" disabled={isSubmitting}>
              {isSubmitting && <Spinner size="sm" animation="border" className="me-2" aria-hidden="true" />}Lưu văn bản
            </Button>
          </fieldset>
        </Form>
      </>}
    </section>
  );
}
