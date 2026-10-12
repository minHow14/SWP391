const bowl = '/demo-assets/chayxanh-bowl.webp';
const soup = '/demo-assets/mushroom-soup.webp';

export const ingredientCategories = [
  { id: 'all', name: 'Tất Cả', emoji: '🌱' },
  { id: 'protein', name: 'Đậu & Đạm Chay', emoji: '🫘' },
  { id: 'mushroom', name: 'Các Loại Nấm', emoji: '🍄' },
  { id: 'vegetable', name: 'Rau Củ & Hạt', emoji: '🥑' },
  { id: 'additive', name: 'Phụ Gia Dễ Nhầm', emoji: '⚠️' },
];

export const ingredients = [
  { id: 'tofu', name: 'Đậu Hũ Non / Đậu Hũ Chiên (Tofu)', category: 'protein', origin: 'Thực vật (Đậu nành)', plant: true, image: bowl, description: 'Làm từ đậu nành, có thể hấp, chiên, kho hoặc xay làm sốt. Kiểm tra gia vị và thành phần bổ sung khi mua sản phẩm chế biến sẵn.', aliases: 'đậu phụ tau hu tofu soy', cooking: 'Đậu hũ non dùng trong canh, súp; đậu hũ chắc phù hợp áp chảo và kho.' },
  { id: 'yuba', name: 'Tàu Hũ Ky / Váng Đậu (Yuba)', category: 'protein', origin: 'Thực vật (Lớp màng sữa đậu nành)', plant: true, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=80', description: 'Lớp màng hình thành khi đun sữa đậu nành. Thường dùng cuốn chả chay, nấu lẩu hoặc kho cùng nấm.', aliases: 'phù trúc yuba bean curd', cooking: 'Ngâm loại khô cho mềm trước khi cuộn hoặc nấu; nêm nước tương và gia vị theo món.' },
  { id: 'king-oyster', name: 'Nấm Đùi Gà (King Oyster Mushroom)', category: 'mushroom', origin: 'Nấm', plant: true, image: soup, description: 'Thân nấm dày, kết cấu dai giòn. Thích hợp áp chảo, xé sợi làm gỏi hoặc thay kết cấu thịt trong món xào.', aliases: 'king oyster mushroom nấm đùi gà tươi', cooking: 'Cắt lát dọc để áp chảo hoặc xé sợi rồi xào với rau củ. Tránh nấu quá lâu để giữ kết cấu.' },
  { id: 'shiitake', name: 'Nấm Đông Cô / Shiitake Dried', category: 'mushroom', origin: 'Nấm', plant: true, image: soup, description: 'Hương thơm đậm và vị umami, thường dùng cho nước dùng, lẩu và món kho chay.', aliases: 'nấm hương shiitake', cooking: 'Ngâm nấm khô cho mềm, rửa sạch; nước ngâm đã lọc có thể dùng để tạo hương vị cho món.' },
  { id: 'gelatin', name: 'Gelatin (Phụ Gia E441)', category: 'additive', origin: 'Động vật (Da / xương)', plant: false, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=700&q=80', description: 'Chất tạo đông có nguồn gốc động vật. Có thể chọn agar-agar hoặc pectin cho công thức chay và điều chỉnh tỷ lệ phù hợp.', aliases: 'gelatine e441 e 441 thạch chất tạo đông', cooking: 'Agar và pectin có cách sử dụng khác gelatin; làm theo hướng dẫn của từng sản phẩm.' },
  { id: 'carmine', name: 'Carmine / Cochineal (Mã E120)', category: 'additive', origin: 'Động vật (Côn trùng rệp son)', plant: false, illustration: 'candy', description: 'Phẩm màu có nguồn gốc từ côn trùng, có thể xuất hiện trong kẹo, đồ uống và sản phẩm chế biến. Tra cứu nhãn E120 hoặc carmine.', aliases: 'e120 e 120 cochineal carmin phẩm màu đỏ', cooking: 'Ưu tiên sản phẩm ghi rõ màu thực vật nếu cần tránh thành phần có nguồn gốc động vật.' },
  { id: 'cashew', name: 'Hạt Điều (Cashew)', category: 'vegetable', origin: 'Thực vật (Hạt)', plant: true, image: bowl, description: 'Vị bùi béo, thường được xay làm sốt kem, sữa hạt hoặc phô mai thực vật.', aliases: 'cashew hạt điều sữa hạt', cooking: 'Ngâm hạt điều cho mềm rồi xay với nước để làm nền sốt; điều chỉnh lượng nước theo độ sánh.' },
  { id: 'spinach', name: 'Rau Bina / Cải Bó Xôi (Spinach)', category: 'vegetable', origin: 'Thực vật (Rau lá)', plant: true, image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=700&q=80', description: 'Rau lá xanh có thể dùng trong salad, xào, súp hoặc xay cùng sốt. Rửa sạch và chọn cách chế biến theo món.', aliases: 'spinach rau chân vịt cải bó xôi', cooking: 'Xào nhanh hoặc chần rồi để ráo trước khi trộn vào nhân bánh, pasta hay súp.' },
];

