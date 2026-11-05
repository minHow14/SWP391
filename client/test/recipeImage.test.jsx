// D:/SWP391/SWP391/client/test/recipeImage.test.jsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import RecipeImage from '../src/components/common/RecipeImage.jsx';

afterEach(cleanup);
it('labels a sourced dish variant as a reference photo', () => {
  render(<RecipeImage src="/uploads/recipes/recipe-3-verified.jpg" alt="Súp nấm" />);
  expect(screen.getByText('Ảnh món ăn tham khảo')).toBeTruthy();
  expect(screen.getByRole('img').getAttribute('src')).toBe('/uploads/recipes/recipe-3-verified.jpg');
});

it('keeps existing original video thumbnails without adding a reference photo label', () => {
  render(<RecipeImage src="https://img.youtube.com/vi/AEpTdclRFAE/hqdefault.jpg" alt="Đậu hũ kho nấm" />);
  expect(screen.queryByText('Ảnh món ăn tham khảo')).toBeNull();
});
