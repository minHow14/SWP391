// JavaScript source code
// src/data/mockStore.js

export const posts = [
    { post_id: 1, author_id: 101, post_type: 'BLOG', status: 'PUBLISHED', created_at: new Date('2026-01-10') },
    { post_id: 2, author_id: 102, post_type: 'VIDEO', status: 'PUBLISHED', created_at: new Date('2026-02-15') },
    { post_id: 3, author_id: 101, post_type: 'BLOG', status: 'PUBLISHED', created_at: new Date('2026-03-01') }
];

export const blogs = [
    { post_id: 1, title: 'Keto Diet Essentials for Beginners', content: 'Keto focuses on high-fat, low-carb meals for weight loss.', attached_video_id: null },
    { post_id: 3, title: 'Top High-Protein Meal Prep Hacks', content: 'Learn how to prep chicken and tofu efficiently.', attached_video_id: 2 }
];

export const videos = [
    { post_id: 2, title: 'How to Cook Low-Carb Meal Prep', video_url: 'https://cdn.example.com/videos/2.mp4', thumbnail_url: 'https://cdn.example.com/thumbs/2.jpg', duration: 420, transcript: 'Welcome to keto cooking! Today we prep low-carb chicken bowls.' }
];

export const comments = [
    { comment_id: 1, post_id: 1, user_id: 201, content: 'Great article on keto!', is_flagged_by_ai: false, status: 'ACTIVE', created_at: new Date('2026-01-11') }
];

export const postVotes = [
    { user_id: 201, post_id: 1, vote_type: 'UPVOTE' }
];

export const categories = [
    { category_id: 1, name: 'Keto' },
    { category_id: 2, name: 'High-Protein' }
];

export const postCategories = [
    { post_id: 1, category_id: 1 },
    { post_id: 2, category_id: 1 },
    { post_id: 3, category_id: 2 }
];

export const recipes = [
    { recipe_id: 1, post_id: 2, diet_type_id: 1, recipe_name: 'Keto Chicken Salad', prep_time: 15, total_calories: 450, instructions: 'Mix chicken with olive oil and greens.' }
];

// Quán chay. Các quán có id 3-10 là DỮ LIỆU MẪU (tên, địa chỉ, số điện thoại là giả) để demo
// tìm quán gần vị trí; thay bằng quán thật khi nhóm có dữ liệu. google_place_id để null thì
// link bản đồ dùng toạ độ.
export const restaurants = [
    { restaurant_id: 1, name: 'Keto Corner Eatery', address: '123 Main St', latitude: 10.7769, longitude: 106.7009, diet_type_id: 1, google_place_id: null, phone: null },
    { restaurant_id: 2, name: 'Protein House', address: '456 High St', latitude: 10.7800, longitude: 106.7050, diet_type_id: 2, google_place_id: null, phone: null },
    { restaurant_id: 3, name: '[Mẫu] Chay Sen Hồng', address: '12 Nguyễn Huệ, Quận 1', latitude: 10.7742, longitude: 106.7036, diet_type_id: 1, google_place_id: null, phone: '0900000003' },
    { restaurant_id: 4, name: '[Mẫu] Quán Chay An Lạc', address: '88 Lý Tự Trọng, Quận 1', latitude: 10.7785, longitude: 106.6998, diet_type_id: 1, google_place_id: null, phone: '0900000004' },
    { restaurant_id: 5, name: '[Mẫu] Bếp Chay Thiện Tâm', address: '45 Võ Văn Tần, Quận 3', latitude: 10.7821, longitude: 106.6890, diet_type_id: 1, google_place_id: null, phone: '0900000005' },
    { restaurant_id: 6, name: '[Mẫu] Chay Hoa Sen Xanh', address: '210 Cách Mạng Tháng Tám, Quận 10', latitude: 10.7712, longitude: 106.6715, diet_type_id: 1, google_place_id: null, phone: '0900000006' },
    { restaurant_id: 7, name: '[Mẫu] Nhà Hàng Chay Tịnh Tâm', address: '5 Phan Xích Long, Phú Nhuận', latitude: 10.7992, longitude: 106.6847, diet_type_id: 1, google_place_id: null, phone: '0900000007' },
    { restaurant_id: 8, name: '[Mẫu] Vegan Green Bowl', address: '73 Nguyễn Văn Linh, Quận 7', latitude: 10.7295, longitude: 106.7218, diet_type_id: 3, google_place_id: null, phone: '0900000008' },
    { restaurant_id: 9, name: '[Mẫu] Chay Dung Hòa', address: '19 Quang Trung, Gò Vấp', latitude: 10.8365, longitude: 106.6659, diet_type_id: 1, google_place_id: null, phone: '0900000009' },
    { restaurant_id: 10, name: '[Mẫu] Tiệm Chay Thanh Bình', address: '102 Xô Viết Nghệ Tĩnh, Bình Thạnh', latitude: 10.8012, longitude: 106.7105, diet_type_id: 1, google_place_id: null, phone: '0900000010' }
];

// Menu dạng văn bản của từng quán, dùng để tìm quán theo món (Restaurant_MenuItem đề xuất với nhóm).
export const restaurantMenuItems = [
    { restaurant_id: 3, dish_name: 'Phở chay', description: 'Nước dùng nấm, đậu hũ chiên, rau thơm' },
    { restaurant_id: 3, dish_name: 'Bún riêu chay', description: 'Riêu từ đậu hũ và cà chua' },
    { restaurant_id: 3, dish_name: 'Cơm gạo lứt muối mè', description: 'Gạo lứt, mè rang, rau luộc' },
    { restaurant_id: 4, dish_name: 'Cơm chiên chay', description: 'Cơm chiên nấm và rau củ' },
    { restaurant_id: 4, dish_name: 'Bún chả giò chay', description: 'Chả giò nấm, bún, rau sống' },
    { restaurant_id: 4, dish_name: 'Đậu hũ kho nấm', description: 'Đậu hũ kho nấm đông cô' },
    { restaurant_id: 5, dish_name: 'Bánh mì chay', description: 'Bánh mì nhân đậu hũ, chả lụa chay' },
    { restaurant_id: 5, dish_name: 'Hủ tiếu chay', description: 'Hủ tiếu nước trong, nấm rơm' },
    { restaurant_id: 5, dish_name: 'Gỏi cuốn chay', description: 'Gỏi cuốn rau củ, tương đậu phộng' },
    { restaurant_id: 6, dish_name: 'Mì xào chay', description: 'Mì xào rau cải, nấm' },
    { restaurant_id: 6, dish_name: 'Lẩu nấm chay', description: 'Lẩu nấm thập cẩm, đậu hũ non' },
    { restaurant_id: 6, dish_name: 'Phở chay', description: 'Phở bò chay từ đạm lúa mì' },
    { restaurant_id: 7, dish_name: 'Cơm tấm chay', description: 'Sườn chay, bì chay, trứng chay' },
    { restaurant_id: 7, dish_name: 'Bún Huế chay', description: 'Bún Huế nước dùng sả, chả chay' },
    { restaurant_id: 7, dish_name: 'Chè đậu xanh', description: 'Chè đậu xanh nước cốt dừa' },
    { restaurant_id: 8, dish_name: 'Buddha bowl', description: 'Tô cơm gạo lứt, đậu gà, rau nướng' },
    { restaurant_id: 8, dish_name: 'Salad quinoa', description: 'Quinoa, bơ, hạt hướng dương' },
    { restaurant_id: 8, dish_name: 'Sinh tố bơ chuối', description: 'Sữa hạt, bơ, chuối' },
    { restaurant_id: 9, dish_name: 'Bánh xèo chay', description: 'Bánh xèo nhân nấm, giá' },
    { restaurant_id: 9, dish_name: 'Cơm chiên chay', description: 'Cơm chiên rau củ' },
    { restaurant_id: 10, dish_name: 'Mì Quảng chay', description: 'Mì Quảng đậu hũ, đậu phộng rang' },
    { restaurant_id: 10, dish_name: 'Bún riêu chay', description: 'Bún riêu cà chua đậu hũ' },
    { restaurant_id: 10, dish_name: 'Sữa đậu nành', description: 'Sữa đậu nành nóng' }
];

export const restaurantRecipes = [
    { restaurant_id: 1, recipe_id: 1 }
];
