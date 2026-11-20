// D:/SWP391/SWP391/client/test/contentImage.test.jsx
// Kiểm thử ContentImage: ảnh lỗi thì hiển thị chữ "chưa có ảnh thực tế" thay vì ảnh minh họa, và hiển thị lại khi có ảnh mới.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import ContentImage from '../src/components/common/ContentImage.jsx';

afterEach(cleanup);

// Ảnh thật lỗi thì hiện chữ thay thế, không dùng ảnh stock làm fallback để tránh gây hiểu nhầm.
it('shows missing real photo text when a photo fails, without replacing it with stock photography', () => {
  render(<ContentImage src="/uploads/restaurants/verified.jpg" alt="Ảnh quán" emptyText="Chưa có ảnh thực tế"
    fallbackSrc="https://images.unsplash.com/stock-photo" />);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByText('Chưa có ảnh thực tế')).toBeTruthy();
  expect(screen.getByRole('img').tagName).toBe('DIV');
});

// Sau khi ảnh cũ lỗi, thay bằng ảnh mới thì phải hiển thị ảnh mới.
it('displays a new real photo after a previously failed photo is replaced', () => {
  const { rerender } = render(<ContentImage src="/uploads/old.jpg" alt="Ảnh quán" />);
  fireEvent.error(screen.getByRole('img'));
  rerender(<ContentImage src="/uploads/new.jpg" alt="Ảnh quán" />);
  expect(screen.getByRole('img').getAttribute('src')).toBe('/uploads/new.jpg');
});
