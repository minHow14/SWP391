// D:/SWP391/SWP391/client/test/contentImage.test.jsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import ContentImage from '../src/components/common/ContentImage.jsx';

afterEach(cleanup);

it('shows missing real photo text when a photo fails, without replacing it with stock photography', () => {
  render(<ContentImage src="/uploads/restaurants/verified.jpg" alt="Ảnh quán" emptyText="Chưa có ảnh thực tế"
    fallbackSrc="https://images.unsplash.com/stock-photo" />);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByText('Chưa có ảnh thực tế')).toBeTruthy();
  expect(screen.getByRole('img').tagName).toBe('DIV');
});

it('displays a new real photo after a previously failed photo is replaced', () => {
  const { rerender } = render(<ContentImage src="/uploads/old.jpg" alt="Ảnh quán" />);
  fireEvent.error(screen.getByRole('img'));
  rerender(<ContentImage src="/uploads/new.jpg" alt="Ảnh quán" />);
  expect(screen.getByRole('img').getAttribute('src')).toBe('/uploads/new.jpg');
});
