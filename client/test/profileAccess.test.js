// client/test/profileAccess.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAuthDestination } from '../src/features/auth/utils/authRedirect.js';
import { hasBodyMeasurements } from '../src/features/profile/utils/healthProfile.js';
import { profileValues } from '../src/features/profile/utils/profileValues.js';

test('registration opens optional profile setup while login keeps its destination', () => {
  const user = { role: 0 };
  assert.equal(getAuthDestination({ user, isRegister: true }), '/ho-so?setup=1');
  assert.equal(getAuthDestination({ user, isRegister: false }), '/');
  assert.equal(getAuthDestination({ user: { role: 1 }, isRegister: false }), '/admin');
  assert.equal(getAuthDestination({ user: { role: 1 }, isRegister: true }), '/admin');
});

test('missing or invalid measurements cannot enable BMI features', () => {
  for (const profile of [null, undefined, {}, { height: 170 }, { weight: 65 }]) {
    assert.equal(hasBodyMeasurements(profile), false);
  }
  for (const invalid of [null, undefined, '', ' ', 0, -1, NaN, Infinity, 'invalid', true, []]) {
    assert.equal(hasBodyMeasurements({ height: invalid, weight: 65 }), false);
    assert.equal(hasBodyMeasurements({ height: 170, weight: invalid }), false);
  }
});

test('BMI needs measurements without requiring an allergy or all optional fields', () => {
  assert.equal(hasBodyMeasurements({ height: 170, weight: 65 }), true);
  assert.equal(hasBodyMeasurements({ height: '170', weight: '65' }), true);
});

test('new account profile stays empty without fabricated health values or allergies', () => {
  const values = profileValues({ full_name: '', health_profile: null, allergies: [] });
  assert.equal(values.height, '');
  assert.equal(values.weight, '');
  assert.equal(values.dob, '');
  assert.equal(values.gender, '');
  assert.deepEqual(values.allergy_ids, []);
});
