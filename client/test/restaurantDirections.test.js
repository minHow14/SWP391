// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/restaurantDirections.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasCoordinates, restaurantDirections } from '../src/utils/restaurantDirections.js';

test('directions use the address when a restaurant has no coordinates',()=>{
  const place={name:'Quán A',address:'123 Đường B',latitude:null,longitude:null};
  assert.equal(new URL(restaurantDirections(place)).searchParams.get('destination'),'Quán A, 123 Đường B');
  assert.equal(new URL(restaurantDirections({...place,latitude:10,longitude:106})).searchParams.get('destination'),'10,106');
});

test('map and directions reject missing and out-of-range coordinates, but accept zero', () => {
  assert.equal(hasCoordinates({ latitude: 0, longitude: 0 }), true);
  for (const coordinates of [null, {}, { latitude: null, longitude: 106 }, { latitude: NaN, longitude: 106 }, { latitude: 91, longitude: 106 }, { latitude: 10, longitude: 181 }]) {
    assert.equal(hasCoordinates(coordinates), false);
  }
  assert.equal(new URL(restaurantDirections({ name: 'Quán A', address: 'Đường B', latitude: 91, longitude: 106 })).searchParams.get('destination'), 'Quán A, Đường B');
});
