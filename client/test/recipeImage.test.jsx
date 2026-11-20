// D:/SWP391/SWP391/client/test/recipeImage.test.jsx
// Kiểm thử RecipeImage: gắn nhãn "ảnh tham khảo" cho ảnh món ăn có nguồn, không gắn cho thumbnail video gốc.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import RecipeImage from '../src/components/common/RecipeImage.jsx';

afterEach(cleanup);
// Ảnh món ăn đã tải lên (biến thể có nguồn) phải được gắn nhãn là ảnh tham khảo.
it('labels a sourced dish variant as a reference photo', () => {
  render(<RecipeImage src="/uploads/recipes/recipe-3-verified.jpg" alt="Súp nấm" />);
  expect(screen.getByText('Ảnh món ăn tham khảo')).toBeTruthy();
  expect(screen.getByRole('img').getAttribute('src')).toBe('/uploads/recipes/recipe-3-verified.jpg');
});

// Thumbnail video gốc giữ nguyên, không thêm nhãn ảnh tham khảo.
it('keeps existing original video thumbnails without adding a reference photo label', () => {
  render(<RecipeImage src="https://img.youtube.com/vi/AEpTdclRFAE/hqdefault.jpg" alt="Đậu hũ kho nấm" />);
  expect(screen.queryByText('Ảnh món ăn tham khảo')).toBeNull();
});
