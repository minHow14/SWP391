import bowlPhoto from '../assets/chayxanh-bowl.webp';

const photo = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

export const meals = [
  {
    id: 'tofu',
    name: 'Đậu Hũ Áp Chảo & Rau Củ Ngũ Sắc',
    category: 'MÓN NGON MÙA THU',
    tone: 'success',
    calories: 320,
    minutes: 15,
    rating: '4.9',
    image: bowlPhoto,
    description:
      'Đậu hũ vàng giòn cùng rau củ tươi, cho bữa ăn nhiều màu sắc và hương vị.',
    ingredients: [
      '200g đậu hũ',
      'Cà rốt, bông cải, bắp ngọt',
      'Dầu ăn, nước tương, tiêu',
    ],
    steps: [
      'Rửa rau củ, cắt đậu hũ vừa ăn.',
      'Áp chảo đậu hũ vàng hai mặt.',
      'Xào rau củ, thêm đậu hũ và nêm nước tương.',
    ],
  },
  {
    id: 'salad',
    name: 'Salad Bơ & Hạt Óc Chó Sốt Chanh Dây',
    category: 'TƯƠI MÁT MỖI NGÀY',
    tone: 'success',
    calories: 280,
    minutes: 10,
    rating: '4.8',
    image: photo('photo-1511690743698-d9d85f2fbf38'),
    description:
      'Bơ béo mềm, rau xanh giòn và hạt óc chó hòa cùng sốt chanh dây thanh mát.',
    ingredients: [
      '1 quả bơ',
      '100g xà lách, cà chua',
      '20g hạt óc chó',
      'Chanh dây, dầu ô liu, muối',
    ],
    steps: [
      'Rửa rau, để ráo và cắt bơ.',
      'Trộn chanh dây, dầu ô liu và muối.',
      'Xếp rau, bơ, hạt ra đĩa và rưới sốt.',
    ],
  },
  {
    id: 'colorful',
    name: 'Salad Ngũ Sắc Sốt Tương Đậu Phộng',
    category: 'MÓN NHẸ BUỔI CHIỀU',
    tone: 'warning',
    calories: 210,
    minutes: 20,
    rating: '4.9',
    image: photo('photo-1540420773420-3366772f4999'),
    description:
      'Rau củ tươi kết hợp sốt đậu phộng thơm bùi, dễ chuẩn bị cho những ngày bận rộn.',
    ingredients: [
      'Xà lách, bắp cải tím, cà rốt',
      'Đậu hũ',
      'Bơ đậu phộng, nước tương, chanh',
    ],
    steps: [
      'Rửa sạch và thái rau củ.',
      'Pha bơ đậu phộng với nước tương, chanh và nước ấm.',
      'Trộn rau cùng đậu hũ, thêm sốt và dùng ngay.',
    ],
  },
  {
    id: 'rice',
    name: 'Cơm Gạo Lứt Rau Củ & Hạt Điều',
    category: 'BỮA TỐI ẤM BỤNG',
    tone: 'primary',
    calories: 350,
    minutes: 25,
    rating: '4.7',
    image: bowlPhoto,
    description:
      'Một bát cơm ấm với rau củ theo mùa và hạt điều rang thơm, đơn giản mà ngon miệng.',
    ingredients: [
      '1 bát cơm gạo lứt',
      'Rau củ theo mùa',
      '20g hạt điều',
      'Nước tương, dầu ăn',
    ],
    steps: [
      'Nấu gạo lứt theo hướng dẫn trên bao bì.',
      'Xào rau củ với dầu và nước tương.',
      'Cho cơm, rau vào bát và rắc hạt điều rang.',
    ],
  },
];

export const videos = [
  {
    id: 'salad',
    title: 'Salad Rau Củ Tươi Mát Với Sốt Đậu Phộng',
    image: meals[2].image,
    duration: '08:45',
    views: '12,4k',
    summary:
      '1. Rửa và thái rau củ. 2. Pha sốt đậu phộng với chanh và nước tương. 3. Trộn đều, thêm hạt rang và thưởng thức.',
    query: 'cách làm salad chay sốt đậu phộng',
  },
  {
    id: 'rice',
    title: 'Bữa Cơm Gạo Lứt Rau Củ Dễ Làm Tại Nhà',
    image: meals[3].image,
    duration: '05:20',
    views: '8,9k',
    summary:
      '1. Chuẩn bị cơm gạo lứt. 2. Xào rau củ vừa chín tới. 3. Xếp vào bát, thêm hạt điều và nước sốt.',
    query: 'cách làm cơm gạo lứt rau củ chay',
  },
];

export const articles = [
  {
    id: 'nutrition',
    category: 'Dinh Dưỡng Chay',
    tone: 'success',
    title: 'Thêm Đa Dạng Rau Củ Vào Bữa Ăn Mỗi Ngày',
    author: 'ChayXanh',
    votes: 142,
    content:
      'Kết hợp rau xanh, củ và các loại đậu để bữa ăn phong phú hơn. Chuẩn bị rau từ trước, bảo quản riêng nước sốt và thay đổi cách chế biến giữa luộc, hấp, xào hoặc làm salad.',
  },
  {
    id: 'planning',
    category: 'Kinh Nghiệm',
    tone: 'warning',
    title: 'Kinh Nghiệm Chuẩn Bị Thực Đơn Chay Cho Gia Đình',
    author: 'Thanh Tâm',
    votes: 98,
    content:
      'Lên danh sách món ăn cho vài ngày, kiểm tra nguyên liệu còn trong bếp và mua vừa đủ. Sơ chế nguyên liệu dùng chung, chia phần để dễ nấu. Hỏi sở thích từng thành viên và luân phiên món chính.',
  },
  {
    id: 'mushrooms',
    category: 'Nguyên Liệu',
    tone: 'primary',
    title: 'Cách Làm Gia Vị Chay Từ Nấm Tại Nhà',
    author: 'Chay An Lạc',
    votes: 215,
    content:
      'Dùng nấm khô sạch, rang nhẹ cho thơm rồi để nguội hoàn toàn. Xay thành bột và đựng trong lọ khô, kín. Thêm một lượng nhỏ vào món canh hoặc món xào; dùng thìa sạch, khô mỗi khi lấy gia vị.',
  },
];

export const places = [
  {
    id: 'hum',
    category: 'Nhà hàng chay',
    tone: 'success',
    name: 'Nhà Hàng Chay Hum Vegetarian',
    rating: '4.9',
    address: '32 Võ Văn Tần, Quận 3, TP.HCM',
    description: 'Lẩu nấm thảo mộc, cơm chiên dứa tươi, gỏi hoa chuối.',
    price: '150k - 300k/người',
  },
  {
    id: 'bistro',
    category: 'Cơm chay bình dân',
    tone: 'primary',
    name: 'Quán Cơm Chay Pi Bistro',
    rating: '4.7',
    address: '19 Huỳnh Khương Ninh, Quận 1, TP.HCM',
    description: 'Cơm phần, đậu hũ sốt cà và các món rau theo mùa.',
    price: '35k - 70k/người',
  },
  {
    id: 'aulac',
    category: 'Cửa hàng thực phẩm',
    tone: 'secondary',
    name: 'Siêu Thị Thực Phẩm Chay Âu Lạc',
    rating: '4.8',
    address: '145 Nguyễn Trãi, Quận 1, TP.HCM',
    description:
      'Thực phẩm chay, nước tương và nguyên liệu cho căn bếp của bạn.',
    price: 'Đa dạng nguyên liệu',
  },
];
