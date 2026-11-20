// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/dietSelection.test.js
// Kiểm thử (node:test) tiện ích dietSelection: khôi phục/lưu kiểu ăn đã chọn trong sessionStorage, tương thích khóa cũ và chịu lỗi storage.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Lưu descriptor gốc của sessionStorage để khôi phục sau mỗi test.
const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  'sessionStorage'
);
// Bộ đếm để mỗi lần import ra một bản module mới.
let moduleNumber = 0;

// Tạo sessionStorage giả với dữ liệu ban đầu và import một bản module dietSelection mới đọc từ đó.
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

// Lựa chọn JSON hợp lệ (theo id chữ) được khôi phục thành diet_type_id tương ứng.
test('valid JSON choice is restored', async () => {
  const { selection } = await freshModule({
    dietSelection: JSON.stringify({ id: 'vegan' }),
  });
  assert.equal(selection.getSavedDiet().diet_type_id, 1);
});

// JSON hỏng thì vẫn khôi phục được từ khóa cũ selectedDiet.
test('legacy choice survives corrupt JSON', async () => {
  const { selection } = await freshModule({
    dietSelection: '{',
    selectedDiet: 'Chay có trứng (Ovo)',
  });
  assert.equal(selection.getSavedDiet().diet_type_id, 3);
});

// diet_type_id dạng số được khôi phục và lưu lại kèm tên chuẩn.
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

// Lựa chọn không xác định hoặc sai định dạng thì trả null để vẫn hiển thị màn hình chọn kiểu ăn ban đầu.
test('unknown or malformed choices do not skip onboarding', async () => {
  for (const saved of ['{', 'null', '42', '{"name":{}}', '{"id":"unknown"}']) {
    const { selection } = await freshModule({
      dietSelection: saved,
      selectedDiet: 'unknown',
    });
    assert.equal(selection.getSavedDiet(), null);
  }
});

// Khi lưu, dùng tên chuẩn (bỏ tên sai truyền vào) và xóa khóa cũ selectedDiet.
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

// Storage bị chặn hoàn toàn vẫn cho xác nhận và dùng tiếp lựa chọn (lưu trong bộ nhớ).
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

// Ghi storage thất bại (ví dụ hết dung lượng) vẫn giữ lựa chọn đã xác nhận trong bộ nhớ.
test('failed storage writes keep the confirmed choice in memory', async () => {
  const { selection } = await freshModule();
  globalThis.sessionStorage.setItem = () => {
    throw new Error('Quota exceeded');
  };
  selection.saveDiet({ id: 'ovo' });
  assert.equal(selection.getSavedDiet().diet_type_id, 3);
});

// Tên kiểu ăn từ database và id mới (ngoài danh sách cố định) phải được giữ khi lưu và tải lại; không có trong catalog thì trả null.
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
