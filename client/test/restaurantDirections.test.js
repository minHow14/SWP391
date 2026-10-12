import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restaurantDirections } from '../src/lib/restaurantDirections.js';

test('directions use the address when a restaurant has no coordinates',()=>{
  const place={name:'Quán A',address:'123 Đường B',latitude:null,longitude:null};
  assert.equal(new URL(restaurantDirections(place)).searchParams.get('destination'),'Quán A, 123 Đường B');
  assert.equal(new URL(restaurantDirections({...place,latitude:10,longitude:106})).searchParams.get('destination'),'10,106');
});
