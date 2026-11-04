// D:/SWP391/SWP391/client/test/restaurantPriceSort.test.jsx
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Restaurants from '../src/pages/Restaurants.jsx';

vi.mock('../src/hooks/useDatabase.js', () => ({ useDatabase: () => ({ data: { restaurants: [
  { id: 1, name: 'Quán giá cao', price: '20.000 - 80.000', menu: [{ price: 90000 }], reviews: [], rating: 5 },
  { id: 2, name: 'Quán chưa có giá', price: '', menu: [{ price: null }], reviews: [], rating: 4 },
  { id: 3, name: 'Quán giá thấp', price: '20.000 - 80.000', menu: [{ price: 20000 }], reviews: [], rating: 3 },
].map((place) => ({ type: 'vegan', city: 'Hồ Chí Minh', address: '', dishes: '', hours: '', latitude: null, longitude: null, ...place })) }, user: null }) }));
vi.mock('../src/features/restaurants/components/NearbyPlaces.jsx', () => ({ default: () => null }));
afterEach(cleanup);

it('orders restaurant cards by the selected genuine menu price with unknown prices last', () => {
  render(<Restaurants />);
  fireEvent.change(screen.getByLabelText('Sắp xếp quán'), { target: { value: 'price' } });
  const list = screen.getByRole('region', { name: 'Danh sách quán chay' });
  expect(within(list).getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
    'Quán giá thấp', 'Quán giá cao', 'Quán chưa có giá',
  ]);
  expect(screen.getByRole('option', { name: /Giá món thấp nhất trước/ })).toBeTruthy();
});
