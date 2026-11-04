// D:/SWP391/SWP391/client/test/adminLegalDocuments.test.jsx
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import AdminLegalDocumentsTab from '../src/features/admin/components/AdminLegalDocumentsTab.jsx';
import AdminPortal from '../src/pages/admin/AdminPortal.jsx';
import { legalDocumentService } from '../src/services/legalDocumentService.js';
vi.mock('../src/services/legalDocumentService.js', () => ({ legalDocumentService: { getAdmin: vi.fn(), save: vi.fn() } }));
vi.mock('../src/hooks/useDatabase.js', () => ({ useDatabase: () => ({ user: { role: 1, full_name: 'Quản trị viên' } }) }));
const document = { id: 'document-id', slug: 'terms-of-service', title: 'Văn bản đã nhập', content: 'Nội dung do người quản trị cung cấp.', version: 3, published: false };
beforeEach(() => {
  legalDocumentService.getAdmin.mockReset().mockResolvedValue({ data: document });
  legalDocumentService.save.mockReset().mockResolvedValue({ data: { ...document, version: 4 } });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(cleanup);
it('starts with an empty creation form after404 and validates the actual content before saving', async () => {
  legalDocumentService.getAdmin.mockRejectedValue({ status: 404 });
  render(<AdminLegalDocumentsTab />);
  const title = await screen.findByRole('textbox', { name: 'Tiêu đề' });
  expect(title.value).toBe('');
  expect(screen.getByRole('textbox', { name: 'Nội dung Markdown' }).value).toBe('');
  expect(screen.getByRole('checkbox', { name: 'Công bố công khai' }).checked).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));
  expect(await screen.findByText('Vui lòng nhập tiêu đề.')).toBeTruthy();
  expect(screen.getByText('Vui lòng nhập nội dung.')).toBeTruthy();
  expect(legalDocumentService.save).not.toHaveBeenCalled();
});
it('loads an existing draft and saves entered content with explicit publication choice', async () => {
  let resolveSave;
  legalDocumentService.save.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
  render(<AdminLegalDocumentsTab />);
  const title = await screen.findByRole('textbox', { name: 'Tiêu đề' });
  await waitFor(() => expect(title.value).toBe(document.title));
  fireEvent.change(title, { target: { value: 'Điều khoản người quản trị cập nhật' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Nội dung Markdown' }), { target: { value: 'Nội dung được phê duyệt để công bố.' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Công bố công khai' }));
  fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));
  await waitFor(() => expect(legalDocumentService.save).toHaveBeenCalledWith('terms-of-service', { title: 'Điều khoản người quản trị cập nhật', content: 'Nội dung được phê duyệt để công bố.', published: true }));
  expect(screen.getByRole('button', { name: /Lưu văn bản/ }).disabled).toBe(true);
  expect(screen.getByRole('combobox', { name: 'Loại văn bản' }).disabled).toBe(true);
  await act(async () => { resolveSave({ data: { ...document, version: 4, published: true } }); });
  expect(await screen.findByText('Đã lưu phiên bản 4.')).toBeTruthy();
});
it('preserves unsaved content on save failure and can retry', async () => {
  legalDocumentService.save.mockRejectedValueOnce(new Error('Không thể lưu văn bản'));
  render(<AdminLegalDocumentsTab />);
  const title = await screen.findByRole('textbox', { name: 'Tiêu đề' });
  await waitFor(() => expect(title.value).toBe(document.title));
  fireEvent.change(title, { target: { value: 'Nội dung chưa lưu' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));
  expect(await screen.findByText('Không thể lưu văn bản')).toBeTruthy();
  expect(title.value).toBe('Nội dung chưa lưu');
  fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));
  expect(await screen.findByText('Đã lưu phiên bản 4.')).toBeTruthy();
});
it('confirms discarding unsaved changes when choosing the other document', async () => {
  render(<AdminLegalDocumentsTab />);
  const title = await screen.findByRole('textbox', { name: 'Tiêu đề' });
  await waitFor(() => expect(title.value).toBe(document.title));
  fireEvent.change(title, { target: { value: 'Chỉnh sửa chưa lưu' } });
  window.confirm.mockReturnValue(false);
  fireEvent.change(screen.getByRole('combobox', { name: 'Loại văn bản' }), { target: { value: 'privacy-policy' } });
  expect(title.value).toBe('Chỉnh sửa chưa lưu');
  expect(screen.getByRole('combobox', { name: 'Loại văn bản' }).value).toBe('terms-of-service');
  window.confirm.mockReturnValue(true);
  fireEvent.change(screen.getByRole('combobox', { name: 'Loại văn bản' }), { target: { value: 'privacy-policy' } });
  await waitFor(() => expect(legalDocumentService.getAdmin).toHaveBeenLastCalledWith('privacy-policy', expect.any(AbortSignal)));
});
it('retries failed loading without creating a document', async () => {
  legalDocumentService.getAdmin.mockRejectedValueOnce(new Error('Không thể tải văn bản'));
  render(<AdminLegalDocumentsTab />);
  expect(await screen.findByText('Không thể tải văn bản')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByRole('textbox', { name: 'Tiêu đề' })).toBeTruthy();
  expect(legalDocumentService.save).not.toHaveBeenCalled();
});
it('opens the legal editor from the persistent admin portal tab', async () => {
  render(<MemoryRouter initialEntries={['/admin?tab=legal-documents']}><AdminPortal /></MemoryRouter>);
  expect(await screen.findByRole('textbox', { name: 'Tiêu đề' })).toBeTruthy();
});
it('uses the actual versioned legal API paths through the shared Axios instance', async () => {
  const { legalDocumentService: actualService } = await vi.importActual('../src/services/legalDocumentService.js');
  const { default: apiClient } = await import('../src/services/apiClient.js');
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: document });
  const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: document });
  const signal = new AbortController().signal;
  expect(typeof actualService.getPublished).toBe('function');
  await actualService.getPublished('terms-of-service', signal);
  await actualService.getAdmin('privacy-policy', signal);
  await actualService.save('privacy-policy', { title: document.title, content: document.content, published: true });
  expect(get).toHaveBeenCalledWith('/v1/legal-documents/terms-of-service', { signal });
  expect(get).toHaveBeenCalledWith('/v1/admin/legal-documents/privacy-policy', { signal });
  expect(put).toHaveBeenCalledWith('/v1/admin/legal-documents/privacy-policy', { title: document.title, content: document.content, published: true });
});
