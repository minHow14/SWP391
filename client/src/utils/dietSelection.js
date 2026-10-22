// client/src/utils/dietSelection.js
import { DIET_TYPE_IDS } from '../constants/dietTypes.js';

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

// Keep the choice available for navigation even when browser storage is blocked.
let currentSelection = null;

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
        // A corrupt JSON entry must not prevent reading the legacy choice.
      }
    }

    const legacyName = sessionStorage.getItem('selectedDiet');
    return options.find((item) => item.name === legacyName) || null;
  } catch {
    return null;
  }
}

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
    // The in-memory choice still lets the user continue in this page session.
  }
}
