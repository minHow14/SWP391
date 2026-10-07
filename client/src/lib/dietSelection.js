export const dietOptions = [
  {
    id: "vegan",
    name: "Thuần chay (Vegan)",
    description: "100% thực vật, không thịt, cá, trứng, sữa, mật ong.",
    emoji: "🌱",
  },
  {
    id: "lacto",
    name: "Chay có sữa (Lacto)",
    description: "Dùng thực vật và sữa, sản phẩm từ sữa.",
    emoji: "🥛",
  },
  {
    id: "ovo",
    name: "Chay có trứng (Ovo)",
    description: "Dùng thực vật và trứng gà/vịt.",
    emoji: "🥚",
  },
  {
    id: "lacto-ovo",
    name: "Chay trứng & sữa",
    description: "Dùng thực vật, trứng và sữa.",
    emoji: "🍳",
  },
  {
    id: "buddhist",
    name: "Chay Phật giáo",
    description: "Không thịt, cá và ngũ vị tân.",
    emoji: "☸️",
  },
  {
    id: "explore",
    name: "Tham khảo thêm",
    description: "Hiển thị các món chay nổi bật tổng hợp.",
    emoji: "🔍",
  },
];

// Keep the choice available for navigation even when browser storage is blocked.
let currentSelection = null;

export function getSavedDiet() {
  if (currentSelection) return currentSelection;

  try {
    const saved = sessionStorage.getItem("dietSelection");
    if (saved) {
      try {
        const selection = JSON.parse(saved);
        const diet = dietOptions.find(
          (item) => item.id === selection?.id || item.name === selection?.name
        );
        if (diet) return diet;
      } catch {
        // A corrupt JSON entry must not prevent reading the legacy choice.
      }
    }

    const legacyName = sessionStorage.getItem("selectedDiet");
    return dietOptions.find((item) => item.name === legacyName) || null;
  } catch {
    return null;
  }
}

export function saveDiet(diet) {
  const selection = dietOptions.find((item) => item.id === diet?.id);
  if (!selection) return;
  currentSelection = selection;

  try {
    sessionStorage.setItem(
      "dietSelection",
      JSON.stringify({ id: selection.id, name: selection.name })
    );
    sessionStorage.removeItem("selectedDiet");
  } catch {
    // The in-memory choice still lets the user continue in this page session.
  }
}
