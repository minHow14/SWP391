// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/dietSelection.test.js
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  'sessionStorage'
);
let moduleNumber = 0;

async function freshModule(entries = {}) {
  const values = new Map(Object.entries(entries));
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  });
  return {
    values,
    selection: await import(
      `../src/utils/dietSelection.js?test=${moduleNumber++}`
    ),
  };
}

afterEach(() => {
  if (originalStorage)
    Object.defineProperty(globalThis, 'sessionStorage', originalStorage);
  else delete globalThis.sessionStorage;
});

test('valid JSON choice is restored', async () => {
  const { selection } = await freshModule({
    dietSelection: JSON.stringify({ id: 'vegan' }),
  });
  assert.equal(selection.getSavedDiet().diet_type_id, 1);
});

test('legacy choice survives corrupt JSON', async () => {
  const { selection } = await freshModule({
    dietSelection: '{',
    selectedDiet: 'Chay có trứng (Ovo)',
  });
  assert.equal(selection.getSavedDiet().diet_type_id, 3);
});

test('canonical numeric diet_type_id is restored and saved', async () => {
  const { selection, values } = await freshModule({
    dietSelection: JSON.stringify({ diet_type_id: 4 }),
  });
  assert.equal(selection.getSavedDiet().diet_type_id, 4);
  selection.saveDiet({ diet_type_id: 6 });
  assert.deepEqual(JSON.parse(values.get('dietSelection')), {
    diet_type_id: 6,
    name: 'Tham khảo thêm',
  });
});

test('unknown or malformed choices do not skip onboarding', async () => {
  for (const saved of ['{', 'null', '42', '{"name":{}}', '{"id":"unknown"}']) {
    const { selection } = await freshModule({
      dietSelection: saved,
      selectedDiet: 'unknown',
    });
    assert.equal(selection.getSavedDiet(), null);
  }
});

test('saving uses the canonical choice and removes the legacy key', async () => {
  const { selection, values } = await freshModule({
    selectedDiet: 'Chay có trứng (Ovo)',
  });
  selection.saveDiet({ id: 'vegan', name: 'incorrect label' });
  assert.deepEqual(JSON.parse(values.get('dietSelection')), {
    diet_type_id: 1,
    name: 'Thuần chay (Vegan)',
  });
  assert.equal(values.has('selectedDiet'), false);
  assert.equal(selection.getSavedDiet().diet_type_id, 1);
});

test('blocked browser storage still allows confirming and navigating', async () => {
  const { selection } = await freshModule();
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    get() {
      throw new Error('Storage blocked');
    },
  });
  assert.equal(selection.getSavedDiet(), null);
  assert.doesNotThrow(() => selection.saveDiet({ id: 'lacto' }));
  assert.equal(selection.getSavedDiet().diet_type_id, 2);
});

test('failed storage writes keep the confirmed choice in memory', async () => {
  const { selection } = await freshModule();
  globalThis.sessionStorage.setItem = () => {
    throw new Error('Quota exceeded');
  };
  selection.saveDiet({ id: 'ovo' });
  assert.equal(selection.getSavedDiet().diet_type_id, 3);
});

test('database diet labels and new IDs survive saving and reloading', async () => {
  const options = [{diet_type_id:6,name:'Keto Chay'},{diet_type_id:7,name:'Eat Clean Chay'}];
  const {selection,values}=await freshModule();
  selection.saveDiet(options[1],options);
  assert.equal(selection.getSavedDiet(options).name,'Eat Clean Chay');
  const restored=await freshModule({dietSelection:values.get('dietSelection')});
  assert.equal(restored.selection.getSavedDiet(options).diet_type_id,7);
  const keto=await freshModule({dietSelection:JSON.stringify({diet_type_id:6,name:'Tham khảo thêm'})});
  assert.equal(keto.selection.getSavedDiet(options).name,'Keto Chay');
  assert.equal(keto.selection.getSavedDiet([]),null);
});
