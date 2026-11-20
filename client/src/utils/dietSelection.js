// client/src/utils/dietSelection.js
// Danh sách chế độ ăn mặc định và việc lưu/đọc lựa chọn chế độ ăn của người dùng trong sessionStorage.
import { DIET_TYPE_IDS } from '../constants/dietTypes.js';

// Các chế độ ăn hiển thị khi chọn (ID khớp với DIET_TYPE_IDS và bảng diet_types).
export const dietOptions = [
  {
    diet_type_id: 1,
    name: 'Thuần chay (Vegan)',
    description: '100% thực vật, không thịt, cá, trứng, sữa, mật ong.',
    emoji: '🌱',
  },
  {
    diet_type_id: 2,
    name: 'Chay có sữa (Lacto)',
    description: 'Dùng thực vật và sữa, sản phẩm từ sữa.',
    emoji: '🥛',
  },
  {
    diet_type_id: 3,
    name: 'Chay có trứng (Ovo)',
    description: 'Dùng thực vật và trứng gà/vịt.',
    emoji: '🥚',
  },
  {
    diet_type_id: 4,
    name: 'Chay trứng & sữa',
    description: 'Dùng thực vật, trứng và sữa.',
    emoji: '🍳',
  },
  {
    diet_type_id: 5,
    name: 'Chay Phật giáo',
    description: 'Không thịt, cá và ngũ vị tân.',
    emoji: '☸️',
  },
  {
    diet_type_id: 6,
    name: 'Tham khảo thêm',
    description: 'Hiển thị các món chay nổi bật tổng hợp.',
    emoji: '🔍',
  },
];

// Giữ lựa chọn trong bộ nhớ để vẫn điều hướng được khi trình duyệt chặn bộ nhớ lưu trữ.
let currentSelection = null;

// Đọc chế độ ăn đã chọn: ưu tiên bộ nhớ, sau đó sessionStorage (định dạng mới), cuối cùng là khóa cũ selectedDiet.
export function getSavedDiet(options = dietOptions) {
  if (currentSelection) return options.find(item => item.diet_type_id === currentSelection.diet_type_id) || null;

  try {
    const saved = sessionStorage.getItem('dietSelection');
    if (saved) {
      try {
        const selection = JSON.parse(saved);
        const diet = options.find(
          (item) =>
            item.diet_type_id ===
              (selection?.diet_type_id ?? DIET_TYPE_IDS[selection?.id]) ||
            item.name === selection?.name
        );
        if (diet) return diet;
      } catch {
        // Một mục JSON hỏng không được cản trở việc đọc lựa chọn theo định dạng cũ.
      }
    }

    const legacyName = sessionStorage.getItem('selectedDiet');
    return options.find((item) => item.name === legacyName) || null;
  } catch {
    return null;
  }
}

// Lưu chế độ ăn đã chọn vào bộ nhớ và sessionStorage, đồng thời xóa khóa định dạng cũ.
export function saveDiet(diet, options = dietOptions) {
  const selection = options.find(
    (item) =>
      item.diet_type_id === (diet?.diet_type_id ?? DIET_TYPE_IDS[diet?.id])
  );
  if (!selection) return;
  currentSelection = selection;

  try {
    sessionStorage.setItem(
      'dietSelection',
      JSON.stringify({
        diet_type_id: selection.diet_type_id,
        name: selection.name,
      })
    );
    sessionStorage.removeItem('selectedDiet');
  } catch {
    // Lựa chọn trong bộ nhớ vẫn cho phép người dùng tiếp tục trong phiên trang hiện tại.
  }
}
