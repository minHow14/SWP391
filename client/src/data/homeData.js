import bowlPhoto from '../assets/chayxanh-bowl.webp';

export const meals = [
  {
    category: 'MÓN NGON MÙA THU',
    tone: 'success',
    rating: '4.9',
    image: bowlPhoto,
    description:
      'Đậu hũ vàng giòn cùng rau củ tươi, cho bữa ăn nhiều màu sắc và hương vị.',
    ingredients: [
      '200g đậu hũ',
      'Cà rốt, bông cải, bắp ngọt',
      'Dầu ăn, nước tương, tiêu',
    ],
    recipe_id: 201,
    post_id: 301,
    recipe_name: 'Đậu Hũ Áp Chảo & Rau Củ Ngũ Sắc',
    prep_time: 15,
    total_calories: 320,
    instructions:
      'Rửa rau củ, cắt đậu hũ vừa ăn.\nÁp chảo đậu hũ vàng hai mặt.\nXào rau củ, thêm đậu hũ và nêm nước tương.',
    diet_type_id: 1,
  },
  {
    category: 'TƯƠI MÁT MỖI NGÀY',
    tone: 'success',
    rating: '4.8',
    image:
      'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=800&q=80',
    description:
      'Bơ béo mềm, rau xanh giòn và hạt óc chó hòa cùng sốt chanh dây thanh mát.',
    ingredients: [
      '1 quả bơ',
      '100g xà lách, cà chua',
      '20g hạt óc chó',
      'Chanh dây, dầu ô liu, muối',
    ],
    recipe_id: 202,
    post_id: 302,
    recipe_name: 'Salad Bơ & Hạt Óc Chó Sốt Chanh Dây',
    prep_time: 10,
    total_calories: 280,
    instructions:
      'Rửa rau, để ráo và cắt bơ.\nTrộn chanh dây, dầu ô liu và muối.\nXếp rau, bơ, hạt ra đĩa và rưới sốt.',
    diet_type_id: 1,
  },
  {
    category: 'MÓN NHẸ BUỔI CHIỀU',
    tone: 'warning',
    rating: '4.9',
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    description:
      'Rau củ tươi kết hợp sốt đậu phộng thơm bùi, dễ chuẩn bị cho những ngày bận rộn.',
    ingredients: [
      'Xà lách, bắp cải tím, cà rốt',
      'Đậu hũ',
      'Bơ đậu phộng, nước tương, chanh',
    ],
    recipe_id: 203,
    post_id: 303,
    recipe_name: 'Salad Ngũ Sắc Sốt Tương Đậu Phộng',
    prep_time: 20,
    total_calories: 210,
    instructions:
      'Rửa sạch và thái rau củ.\nPha bơ đậu phộng với nước tương, chanh và nước ấm.\nTrộn rau cùng đậu hũ, thêm sốt và dùng ngay.',
    diet_type_id: 1,
  },
  {
    category: 'BỮA TỐI ẤM BỤNG',
    tone: 'primary',
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
    recipe_id: 204,
    post_id: 304,
    recipe_name: 'Cơm Gạo Lứt Rau Củ & Hạt Điều',
    prep_time: 25,
    total_calories: 350,
    instructions:
      'Nấu gạo lứt theo hướng dẫn trên bao bì.\nXào rau củ với dầu và nước tương.\nCho cơm, rau vào bát và rắc hạt điều rang.',
    diet_type_id: 1,
  },
];

export const videos = [
  {
    title: 'Salad Rau Củ Tươi Mát Với Sốt Đậu Phộng',
    views: '12,4k',
    query: 'cách làm salad chay sốt đậu phộng',
    post_id: 401,
    thumbnail_url:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    transcript:
      '1. Rửa và thái rau củ. 2. Pha sốt đậu phộng với chanh và nước tương. 3. Trộn đều, thêm hạt rang và thưởng thức.',
    duration: 525,
  },
  {
    title: 'Bữa Cơm Gạo Lứt Rau Củ Dễ Làm Tại Nhà',
    views: '8,9k',
    query: 'cách làm cơm gạo lứt rau củ chay',
    post_id: 402,
    thumbnail_url: bowlPhoto,
    transcript:
      '1. Chuẩn bị cơm gạo lứt. 2. Xào rau củ vừa chín tới. 3. Xếp vào bát, thêm hạt điều và nước sốt.',
    duration: 320,
  },
];

export const articles = [
  {
    category: 'Dinh Dưỡng Chay',
    tone: 'success',
    title: 'Thêm Đa Dạng Rau Củ Vào Bữa Ăn Mỗi Ngày',
    content:
      'Kết hợp rau xanh, củ và các loại đậu để bữa ăn phong phú hơn. Chuẩn bị rau từ trước, bảo quản riêng nước sốt và thay đổi cách chế biến giữa luộc, hấp, xào hoặc làm salad.',
    post_id: 501,
    author_id: 7001,
    author_full_name: 'ChayXanh',
    vote_count: 142,
  },
  {
    category: 'Kinh Nghiệm',
    tone: 'warning',
    title: 'Kinh Nghiệm Chuẩn Bị Thực Đơn Chay Cho Gia Đình',
    content:
      'Lên danh sách món ăn cho vài ngày, kiểm tra nguyên liệu còn trong bếp và mua vừa đủ. Sơ chế nguyên liệu dùng chung, chia phần để dễ nấu. Hỏi sở thích từng thành viên và luân phiên món chính.',
    post_id: 502,
    author_id: 7002,
    author_full_name: 'Thanh Tâm',
    vote_count: 98,
  },
  {
    category: 'Nguyên Liệu',
    tone: 'primary',
    title: 'Cách Làm Gia Vị Chay Từ Nấm Tại Nhà',
    content:
      'Dùng nấm khô sạch, rang nhẹ cho thơm rồi để nguội hoàn toàn. Xay thành bột và đựng trong lọ khô, kín. Thêm một lượng nhỏ vào món canh hoặc món xào; dùng thìa sạch, khô mỗi khi lấy gia vị.',
    post_id: 503,
    author_id: 7003,
    author_full_name: 'Chay An Lạc',
    vote_count: 215,
  },
];

export const places = [
  {
    restaurant_id: 601,
    category: 'Nhà hàng chay',
    tone: 'success',
    name: 'Nhà Hàng Chay Hum Vegetarian',
    rating: '4.9',
    address: '32 Võ Văn Tần, Quận 3, TP.HCM',
    description: 'Lẩu nấm thảo mộc, cơm chiên dứa tươi, gỏi hoa chuối.',
    price: '150k - 300k/người',
  },
  {
    restaurant_id: 602,
    category: 'Cơm chay bình dân',
    tone: 'primary',
    name: 'Quán Cơm Chay Pi Bistro',
    rating: '4.7',
    address: '19 Huỳnh Khương Ninh, Quận 1, TP.HCM',
    description: 'Cơm phần, đậu hũ sốt cà và các món rau theo mùa.',
    price: '35k - 70k/người',
  },
  {
    restaurant_id: 603,
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
