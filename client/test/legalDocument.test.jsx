// D:/SWP391/SWP391/client/test/legalDocument.test.jsx
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import LegalDocument from '../src/pages/LegalDocument.jsx';
import AppRoutes from '../src/routes/AppRoutes.jsx';
import { legalDocumentService } from '../src/services/legalDocumentService.js';
vi.mock('../src/services/legalDocumentService.js', () => ({ legalDocumentService: { getPublished: vi.fn() } }));
vi.mock('../src/components/layout/SiteLayout.jsx', () => ({ default: () => { throw new Error('Legal routes must not load catalog layout'); } }));
const document = { id: 'legal-document', slug: 'terms-of-service', title: 'Điều khoản đã được duyệt', content: '# Quyền sử dụng\n\n**Nội dung được quản trị viên nhập.**\n\n<script>window.legalAttack = true;</script>\n\n[Liên kết](javascript:alert(1))', version: 3, published: true, publishedAt: '2026-11-04T00:00:00Z' };
beforeEach(() => { legalDocumentService.getPublished.mockReset().mockResolvedValue({ data: document }); });
afterEach(cleanup);
it('renders published content as safe Markdown under a semantic page heading', async () => {
  const { container } = render(<MemoryRouter><LegalDocument slug="terms-of-service" /></MemoryRouter>);
  expect(await screen.findByRole('heading', { level: 1, name: document.title })).toBeTruthy();
  expect(screen.getByRole('heading', { level: 2, name: 'Quyền sử dụng' })).toBeTruthy();
  expect(container.querySelector('strong')?.textContent).toBe('Nội dung được quản trị viên nhập.');
  expect(container.querySelector('script')).toBeNull();
  expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  expect(screen.getByText(/Phiên bản 3/)).toBeTruthy();
  expect(legalDocumentService.getPublished).toHaveBeenCalledWith('terms-of-service', expect.any(AbortSignal));
});
it('shows an unpublished empty state when no legal content exists', async () => {
  legalDocumentService.getPublished.mockRejectedValue({ status: 404, message: 'Nội dung này chưa được công bố.' });
  render(<MemoryRouter><LegalDocument slug="privacy-policy" /></MemoryRouter>);
  expect(await screen.findByText('Nội dung này chưa được công bố.')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Trang chủ' })).toBeTruthy();
  expect(screen.queryByText(document.title)).toBeNull();
});
it('shows load errors and recovers by retrying', async () => {
  legalDocumentService.getPublished.mockRejectedValueOnce(new Error('Máy chủ tạm thời không khả dụng'));
  render(<MemoryRouter><LegalDocument slug="privacy-policy" /></MemoryRouter>);
  expect(await screen.findByText('Máy chủ tạm thời không khả dụng')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByRole('heading', { name: document.title })).toBeTruthy();
});
it('ignores an old document response after the slug changes', async () => {
  let resolveOld;
  legalDocumentService.getPublished.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
    .mockResolvedValue({ data: { ...document, title: 'Chính sách hiện tại', slug: 'privacy-policy' } });
  const { rerender } = render(<MemoryRouter><LegalDocument slug="terms-of-service" /></MemoryRouter>);
  rerender(<MemoryRouter><LegalDocument slug="privacy-policy" /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Chính sách hiện tại' })).toBeTruthy();
  await act(async () => { resolveOld({ data: document }); });
  expect(screen.queryByRole('heading', { name: document.title })).toBeNull();
});
for (const [path, slug] of [['/dieu-khoan', 'terms-of-service'], ['/chinh-sach-bao-mat', 'privacy-policy']]) {
  it(`${path} remains accessible without the catalog or onboarding layout`, async () => {
    render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);
    expect(await screen.findByRole('heading', { level: 1, name: document.title })).toBeTruthy();
    expect(legalDocumentService.getPublished).toHaveBeenCalledWith(slug, expect.any(AbortSignal));
  });
}
