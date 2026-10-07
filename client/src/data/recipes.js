import bowlPhoto from '../assets/chayxanh-bowl.webp';
import soupPhoto from '../assets/mushroom-soup.webp';

export const recipeCategories = [
  {
    category_id: null,
    name: 'Tất Cả Món',
    icon: 'grid',
  },
  {
    category_id: 1,
    name: 'Món Kho',
    icon: 'pot',
  },
  {
    category_id: 2,
    name: 'Salad & Gỏi',
    icon: 'leaf',
  },
  {
    category_id: 3,
    name: 'Súp & Lẩu',
    icon: 'cup-hot',
  },
  {
    category_id: 4,
    name: 'Món Xào/Chiên',
    icon: 'fire',
  },
  {
    category_id: 5,
    name: 'Món Điểm Tâm',
    icon: 'sun',
  },
];

export const recipeDietLabels = [
  {
    diet_type_id: 1,
    name: 'Thuần Chay',
    icon: 'leaf',
    tone: 'green',
  },
  {
    diet_type_id: 2,
    name: 'Chay Có Sữa',
    icon: 'cup-straw',
    tone: 'blue',
  },
  {
    diet_type_id: 3,
    name: 'Chay Có Trứng',
    icon: 'egg',
    tone: 'yellow',
  },
  {
    diet_type_id: 4,
    name: 'Chay Trứng & Sữa',
    icon: 'egg-fried',
    tone: 'orange',
  },
  {
    diet_type_id: 5,
    name: 'Chay Phật Giáo',
    icon: 'flower1',
    tone: 'purple',
  },
];

export const recipes = [
  {
    image: bowlPhoto,
    description:
      'Đậu hũ vàng giòn kho cùng nấm đông cô tươi, hạt sen dẻo và nước dừa thanh ngọt.',
    ingredients: [
      '200g đậu hũ',
      '100g nấm đông cô',
      '50g hạt sen đã luộc',
      'Nước dừa, nước tương, dầu ăn',
    ],
    recipe_id: 101,
    post_id: 201,
    recipe_name: 'Đậu Hũ Kho Nấm Đông Cô & Hạt Sen',
    prep_time: 25,
    total_calories: 280,
    instructions:
      'Cắt đậu hũ và áp chảo đến khi vàng. Rửa sạch nấm.\nCho nấm, đậu hũ, hạt sen vào nồi cùng nước dừa.\nNêm nước tương và kho nhỏ lửa đến khi nước sốt sánh lại.',
    compatible_diet_type_ids: [1, 2, 3, 4, 5],
    diet_type_id: 1,
    category_id: 1,
  },
  {
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
    description:
      'Bơ sáp dẻo ngậy kết hợp hạt óc chó giòn, rau tươi xanh và sốt tỏi dầu olive thơm nhẹ.',
    ingredients: [
      '1 quả bơ',
      'Rau xà lách, cà chua',
      '20g hạt óc chó',
      'Tỏi, dầu olive, nước chanh, muối',
    ],
    recipe_id: 102,
    post_id: 202,
    recipe_name: 'Salad Bơ Hạt Óc Chó Sốt Tỏi Olive',
    prep_time: 15,
    total_calories: 210,
    instructions:
      'Rửa rau, để ráo và cắt bơ thành lát.\nTrộn tỏi băm, dầu olive, nước chanh và một chút muối.\nXếp rau và bơ ra đĩa, thêm hạt óc chó rồi rưới sốt.',
    compatible_diet_type_ids: [1, 2, 3, 4],
    diet_type_id: 1,
    category_id: 2,
  },
  {
    image: soupPhoto,
    description:
      'Súp nấm mỡ mềm mịn với sữa tươi, kem và phô mai. Một lựa chọn cho chế độ chay có sữa.',
    ingredients: [
      '150g nấm mỡ',
      '200ml sữa tươi',
      '50ml kem sữa',
      'Phô mai, bơ, hành tây, muối',
    ],
    recipe_id: 103,
    post_id: 203,
    recipe_name: 'Súp Nấm Mỡ & Váng Sữa Phô Mai',
    prep_time: 25,
    total_calories: 320,
    instructions:
      'Thái nấm và hành tây, xào với bơ.\nThêm nước vừa đủ và nấu đến khi nấm mềm.\nXay mịn, thêm sữa và kem, làm nóng nhẹ rồi thêm phô mai.',
    compatible_diet_type_ids: [2, 4],
    diet_type_id: 2,
    category_id: 3,
  },
  {
    image:
      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80',
    description:
      'Bánh mì giòn kẹp trứng ốp la, nấm đùi gà áp chảo cùng dưa leo và rau xanh.',
    ingredients: [
      '1 ổ bánh mì không sữa',
      '2 quả trứng',
      '100g nấm đùi gà',
      'Dưa leo, xà lách, dầu ăn, nước tương',
    ],
    recipe_id: 104,
    post_id: 204,
    recipe_name: 'Bánh Mì Kẹp Trứng Ốp La & Nấm Đùi Gà',
    prep_time: 15,
    total_calories: 310,
    instructions:
      'Áp chảo nấm với ít dầu và nước tương.\nChiên trứng đến độ chín mong muốn, làm nóng bánh mì.\nKẹp nấm, trứng và rau vào bánh mì rồi dùng ngay.',
    compatible_diet_type_ids: [3, 4],
    diet_type_id: 3,
    category_id: 5,
  },
  {
    image:
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80',
    description:
      'Bánh nướng mềm với trứng và phô mai mozzarella kéo sợi, dành cho chế độ chay trứng và sữa.',
    ingredients: [
      '2 lát bánh mì',
      '1 quả trứng',
      '50g mozzarella',
      'Bơ, muối, tiêu',
    ],
    recipe_id: 105,
    post_id: 205,
    recipe_name: 'Bánh Nướng Phô Mai Mozzarella & Trứng',
    prep_time: 30,
    total_calories: 410,
    instructions:
      'Phết bơ lên bánh và xếp vào khay.\nThêm trứng và phô mai lên bánh.\nNướng ở 180°C đến khi trứng chín và phô mai vàng nhẹ.',
    compatible_diet_type_ids: [4],
    diet_type_id: 4,
    category_id: 5,
  },
  {
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
    description:
      'Đậu hũ chiên giòn rim cùng sốt cà chua và hành boa-rô. Món ăn giản dị cho bữa cơm nhà.',
    ingredients: [
      '200g đậu hũ',
      '2 quả cà chua',
      'Hành boa-rô',
      'Dầu ăn, nước tương, muối',
    ],
    recipe_id: 106,
    post_id: 206,
    recipe_name: 'Đậu Hũ Sốt Cà Chua & Hành Boa-rô',
    prep_time: 20,
    total_calories: 260,
    instructions:
      'Cắt và chiên đậu hũ đến khi vàng.\nXào hành boa-rô, thêm cà chua thái nhỏ và nấu thành sốt.\nCho đậu hũ vào rim, nêm vừa ăn và dùng với cơm.',
    compatible_diet_type_ids: [1, 2, 3, 4],
    diet_type_id: 1,
    category_id: 4,
  },
];
