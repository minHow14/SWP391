-- ========================================================================
-- FILE DỮ LIỆU MẪU TINH GỌN (MINIMAL SEED DATA) CHO SWP391 - CHAYXANH
-- ========================================================================
-- Chỉ gồm vài bản ghi mẫu chuẩn, tối thiểu để test toàn bộ các tính năng:
-- - Tài khoản: 1 Admin, 2 User
-- - Chế độ ăn: 7 loại cốt lõi
-- - Danh mục: 5 danh mục
-- - Nguyên liệu: 8 nguyên liệu cơ bản
-- - Bài đăng: 1 Video, 2 Blog (1 bài gắn video, 1 bài chia sẻ)
-- - Công thức nấu ăn: 2 công thức
-- - Bình luận & Vote: 2 tương tác mẫu
-- - Kế hoạch bữa ăn & Nhật ký: 1 kế hoạch, 1 nhật ký
-- - Nhà hàng chay: 2 quán mẫu (TP.HCM & Hà Nội)
-- ========================================================================

BEGIN;

-- ------------------------------------------------------------------------
-- Xóa sạch dữ liệu cũ và reset quan hệ (Idempotent)
-- ------------------------------------------------------------------------
TRUNCATE TABLE
  "post_attachments",
  "restaurant_menu_prices",
  "restaurant_reviews",
  "restaurant_details",
  "ingredient_details",
  "ingredient_alternatives",
  "diary_nutrients",
  "profile_preferences",
  "ai_logs",
  "notifications",
  "reports",
  "restaurant_recipes",
  "restaurants",
  "food_diaries",
  "meal_plan_details",
  "meal_plans",
  "post_votes",
  "comments",
  "recipe_ingredients",
  "recipes",
  "post_categories",
  "blogs",
  "videos",
  "posts",
  "user_allergies",
  "health_histories",
  "health_profiles",
  "users",
  "ingredients",
  "categories",
  "diet_types"
CASCADE;

-- ------------------------------------------------------------------------
-- 1. CHẾ ĐỘ ĂN (DIET TYPES) (7 bản ghi chuẩn)
-- ------------------------------------------------------------------------
INSERT INTO "diet_types" ("diet_type_id", "name", "description") VALUES
  (1, 'Thuần Chay (Vegan)', 'Hoàn toàn từ thực vật, không trứng, sữa, mật ong hay phụ phẩm động vật'),
  (2, 'Chay Có Sữa (Lacto-Vegetarian)', 'Ăn thực vật kết hợp các sản phẩm từ sữa như sữa chua, bơ, phô mai'),
  (3, 'Chay Có Trứng (Ovo-Vegetarian)', 'Ăn thực vật kết hợp trứng các loại gia cầm'),
  (4, 'Chay Trứng & Sữa (Lacto-Ovo)', 'Dùng cả trứng và sữa kết hợp thực vật'),
  (5, 'Chay Phật Giáo (Tâm Linh)', 'Ăn thực vật và kiêng nhóm ngũ vị tân (hành, tỏi, kiệu, hẹ, nén)'),
  (6, 'Keto Chay', 'Hạn chế carb dưới 50g/ngày, tăng cường chất béo tốt và đạm thực vật'),
  (7, 'Eat Clean Chay', 'Thực phẩm nguyên bản, ngũ cốc thô, hạn chế dầu mỡ tinh luyện');

-- ------------------------------------------------------------------------
-- 2. DANH MỤC (CATEGORIES) (5 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "categories" ("category_id", "name") VALUES
  (1, 'Món Kho'),
  (2, 'Salad & Gỏi'),
  (3, 'Súp & Canh'),
  (4, 'Món Xào / Chiên'),
  (5, 'Dinh Dưỡng & Đời Sống');

-- ------------------------------------------------------------------------
-- 3. NGUYÊN LIỆU (INGREDIENTS) (8 bản ghi cơ bản)
-- ------------------------------------------------------------------------
INSERT INTO "ingredients" ("ingredient_id", "name", "calories_per_100g", "protein", "fat", "carbs") VALUES
  (1, 'Đậu hũ non', 76, 8.1, 4.8, 1.9),
  (2, 'Đậu hũ chiên', 130, 12.0, 7.5, 3.2),
  (3, 'Nấm đông cô tươi', 34, 2.2, 0.5, 6.8),
  (4, 'Nấm rơm', 31, 3.2, 0.3, 4.6),
  (5, 'Quả bơ sáp', 160, 2.0, 14.7, 8.5),
  (6, 'Hạt sen tươi luộc', 89, 4.1, 0.5, 17.2),
  (7, 'Cà rốt tươi', 41, 0.9, 0.2, 9.6),
  (8, 'Rau xà lách', 15, 1.4, 0.2, 2.9);

-- ------------------------------------------------------------------------
-- 4. NGƯỜI DÙNG (USERS) (3 bản ghi - Mật khẩu mặc định: 123456)
-- ------------------------------------------------------------------------
INSERT INTO "users" ("user_id", "email", "password_hash", "full_name", "role", "status", "created_at") VALUES
  (1, 'admin@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Quản Trị Viên Hệ Thống', 1, 'ACTIVE', '2026-10-08T05:41:33.161Z'),
  (2, 'user@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Trần Minh Quân', 2, 'ACTIVE', '2026-10-08T05:41:33.161Z'),
  (3, 'lan.nguyen@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Nguyễn Mai Lan', 2, 'ACTIVE', '2026-10-08T05:41:33.161Z');

-- ------------------------------------------------------------------------
-- 5. HỒ SƠ SỨC KHỎE (HEALTH PROFILES) (2 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "health_profiles" ("profile_id", "user_id", "diet_type_id", "height", "weight", "dob", "gender", "health_goal") VALUES
  (1, 2, 1, 175, 68.5, '1998-05-15', 'MALE', 'Ăn chay lành mạnh và rèn luyện thể thao'),
  (2, 3, 4, 160, 50.0, '2001-10-20', 'FEMALE', 'Duy trì vóc dáng thanh mảnh');

-- ------------------------------------------------------------------------
-- 6. LỊCH SỬ CHỈ SỐ SỨC KHỎE (HEALTH HISTORIES) (2 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "health_histories" ("history_id", "user_id", "recorded_date", "weight", "bmi") VALUES
  (1, 2, '2026-10-01', 68.5, 22.37),
  (2, 3, '2026-10-01', 50.0, 19.53);

-- ------------------------------------------------------------------------
-- 7. BÀI ĐĂNG GỐC (POSTS) (3 bản ghi: 1 Video, 2 Blog)
-- ------------------------------------------------------------------------
INSERT INTO "posts" ("post_id", "author_id", "post_type", "status", "created_at") VALUES
  (1, 2, 'VIDEO', 'PUBLISHED', '2026-10-10T08:00:00.000Z'),
  (2, 3, 'BLOG', 'PUBLISHED', '2026-10-11T09:00:00.000Z'),
  (3, 2, 'BLOG', 'PUBLISHED', '2026-10-12T10:00:00.000Z');

-- ------------------------------------------------------------------------
-- 8. VIDEO HƯỚNG DẪN (VIDEOS) (1 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "videos" ("post_id", "title", "video_url", "thumbnail_url", "duration", "transcript") VALUES
  (1, 'Cách làm Đậu Hũ Kho Nấm Rơm đậm đà đưa cơm',
   'https://www.youtube.com/watch?v=AEpTdclRFAE',
   'https://img.youtube.com/vi/AEpTdclRFAE/hqdefault.jpg',
   614, 'Hướng dẫn chi tiết cách làm nấm rơm kho đậu hũ chay thơm ngon, đậm đà thanh tịnh...');

-- ------------------------------------------------------------------------
-- 9. BÀI VIẾT BLOG (BLOGS) (2 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "blogs" ("post_id", "title", "content", "attached_video_id") VALUES
  (2, 'Top Nguồn Protein Thực Vật Cho Người Ăn Chay',
   'Protein thực vật hoàn toàn có thể đáp ứng đủ nhu cầu dinh dưỡng hàng ngày khi bạn kết hợp đa dạng các loại đậu hũ, nấm tươi, các loại hạt dinh dưỡng và ngũ cốc nguyên hạt.', 1),
  (3, 'Kinh nghiệm chuẩn bị thực đơn chay 7 ngày cho người bận rộn',
   'Lên danh sách món ăn từ đầu tuần, sơ chế nguyên liệu rau củ và bảo quản đúng cách giúp bạn tiết kiệm thời gian mà vẫn đảm bảo bữa ăn chay thơm ngon, đủ chất dinh dưỡng.', NULL);

-- ------------------------------------------------------------------------
-- 10. LIÊN KẾT BÀI ĐĂNG - DANH MỤC (POST CATEGORIES) (3 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "post_categories" ("post_id", "category_id") VALUES
  (1, 1),
  (2, 5),
  (3, 5);

-- ------------------------------------------------------------------------
-- 11. CÔNG THỨC MÓN ĂN (RECIPES) (2 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "recipes" ("recipe_id", "post_id", "category_id", "diet_type_id", "recipe_name", "description", "image_url", "prep_time", "total_calories", "instructions") VALUES
  (1, 1, 1, 1, 'Đậu Hũ Kho Nấm Rơm & Hạt Sen',
   'Đậu hũ vàng giòn kho cùng nấm rơm tươi và hạt sen dẻo bùi.',
   'https://img.youtube.com/vi/AEpTdclRFAE/hqdefault.jpg',
   25, 280, '1. Cắt đậu hũ và áp chảo vàng đều các mặt.\n2. Rửa sạch nấm rơm tươi và hạt sen.\n3. Kho nhỏ lửa với nước tương và nước dừa tươi đến khi nước sốt sánh lại.'),
  (2, NULL, 2, 1, 'Salad Bơ & Hạt Sen Sốt Olive',
   'Bơ sáp dẻo ngậy kết hợp rau xà lách tươi xanh và hạt sen bùi mát.',
   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
   15, 210, '1. Rửa sạch rau xà lách, cắt lát bơ sáp vừa ăn.\n2. Trộn đều sốt dầu olive, nước cốt chanh và chút muối biển.\n3. Rưới đều nước sốt lên đĩa rau và dùng ngay.');

-- ------------------------------------------------------------------------
-- 12. NGUYÊN LIỆU CHO CÔNG THỨC (RECIPE INGREDIENTS) (6 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "recipe_ingredients" ("recipe_id", "ingredient_id", "quantity", "unit") VALUES
  (1, 1, 200, 'gram'),
  (1, 4, 150, 'gram'),
  (1, 6, 80, 'gram'),
  (2, 5, 1, 'trái'),
  (2, 6, 50, 'gram'),
  (2, 8, 100, 'gram');

-- ------------------------------------------------------------------------
-- 13. BÌNH LUẬN (COMMENTS) (2 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "comments" ("comment_id", "post_id", "user_id", "content", "status", "created_at") VALUES
  (1, 2, 2, 'Bài viết chia sẻ rất chi tiết và hữu ích!', 'ACTIVE', '2026-10-11T10:00:00.000Z'),
  (2, 3, 3, 'Mình cũng đang áp dụng cách sơ chế trước này, rất tiện lợi khi đi làm.', 'ACTIVE', '2026-10-12T11:00:00.000Z');

-- ------------------------------------------------------------------------
-- 14. BÌNH CHỌN (POST VOTES) (2 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "post_votes" ("post_id", "user_id", "vote_type") VALUES
  (2, 2, 'UPVOTE'),
  (3, 3, 'UPVOTE');

-- ------------------------------------------------------------------------
-- 15. KẾ HOẠCH BỮA ĂN (MEAL PLANS) (1 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "meal_plans" ("plan_id", "user_id", "title", "start_date", "end_date", "target_calories") VALUES
  (1, 2, 'Kế hoạch ăn chay thanh nhẹ trong tuần', '2026-10-19', '2026-10-25', 1800);

-- ------------------------------------------------------------------------
-- 16. CHI TIẾT BỮA ĂN THEO NGÀY (MEAL PLAN DETAILS) (3 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "meal_plan_details" ("plan_detail_id", "plan_id", "day_of_week", "meal_type", "recipe_id") VALUES
  (1, 1, 1, 'BREAKFAST', 2),
  (2, 1, 1, 'LUNCH', 1),
  (3, 1, 1, 'DINNER', 1);

-- ------------------------------------------------------------------------
-- 17. NHẬT KÝ ĂN UỐNG (FOOD DIARIES) (1 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "food_diaries" ("diary_id", "user_id", "consumed_date", "meal_type", "recipe_id", "custom_food_name", "calories") VALUES
  (1, 2, '2026-10-19', 'LUNCH', 1, 'Đậu Hũ Kho Nấm Rơm', 280);

-- ------------------------------------------------------------------------
-- 18. NHÀ HÀNG & QUÁN CHAY (RESTAURANTS) (2 bản ghi: 1 TP.HCM, 1 Hà Nội)
-- ------------------------------------------------------------------------
INSERT INTO "restaurants" ("restaurant_id", "name", "address", "latitude", "longitude", "phone", "rating", "image_url", "diet_type_id") VALUES
  (1, 'Nhà Hàng Chay Thanh Lương', '11 Nguyễn Thái Học, Quận 1, TP. Hồ Chí Minh', 10.7769, 106.7009, '02838221234', 4.8, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80', 1),
  (2, 'Quán Cơm Chay An Lạc', '45 Tràng Tiền, Quận Hoàn Kiếm, Hà Nội', 21.0285, 105.8542, '02439334567', 4.6, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', 1);

-- ------------------------------------------------------------------------
-- 19. THỰC ĐƠN QUÁN ĂN (RESTAURANT RECIPES & PRICES) (2 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "restaurant_recipes" ("restaurant_id", "recipe_id") VALUES
  (1, 1),
  (2, 2);

INSERT INTO "restaurant_menu_prices" ("restaurant_id", "recipe_id", "price") VALUES
  (1, 1, 65000),
  (2, 2, 55000);

INSERT INTO "restaurant_details" ("restaurant_id", "city", "hours", "price_range", "separate_kitchen") VALUES
  (1, 'Hồ Chí Minh', '08:00 - 21:00', '50.000đ - 120.000đ', true),
  (2, 'Hà Nội', '09:00 - 21:30', '40.000đ - 100.000đ', true);

-- ------------------------------------------------------------------------
-- 20. BẢNG MỞ RỘNG (ĐỔI NGUYÊN LIỆU & CHI TIẾT)
-- ------------------------------------------------------------------------
INSERT INTO "ingredient_alternatives" ("id", "chip", "emoji", "original", "role", "alternatives", "description", "keywords") VALUES
  ('cheese', 'Phô mai / Bơ', '🧀', 'Phô mai / Bơ động vật', 'Tạo Độ Béo Ngậy', '["Men dinh dưỡng (Nutritional yeast)","Phô mai hạt điều (Cashew cheese)","Bơ thực vật có nhãn thuần chay"]'::jsonb, 'Gợi hương vị phô mai, tạo độ béo và vị bùi cho món Âu hoặc bánh.', 'cheese butter margarine'),
  ('egg', 'Trứng gà', '🥚', 'Trứng gà (cho làm bánh & kết dính)', 'Kết dính & Tạo xốp', '["Đậu phụ non xay mịn","Hạt lanh ngâm nước (Flaxseed)","Aquafaba (Nước luộc đậu gà)"]'::jsonb, 'Đậu phụ và hạt lanh giúp kết dính, giữ độ ẩm cho khối bột.', 'trứng egg');

INSERT INTO "ingredient_details" ("ingredient_id", "category", "origin", "plant", "description", "cooking", "aliases", "image_url") VALUES
  (1, 'protein', 'Thực vật', true, 'Đậu hũ non mềm mịn, giàu đạm đậu nành tự nhiên', 'Thích hợp nấu canh hoặc hấp', 'Đậu hũ non', '/api/workspace/ingredients/1/image'),
  (2, 'protein', 'Thực vật', true, 'Đậu hũ chiên vàng giòn bên ngoài, mềm bên trong', 'Thích hợp kho hoặc sốt cà chua', 'Đậu hũ chiên', '/api/workspace/ingredients/2/image'),
  (3, 'mushroom', 'Nấm', true, 'Nấm đông cô tươi giàu khoáng chất và hương vị thơm ngọt', 'Thích hợp xào, nấu súp hoặc kho', 'Nấm hương tươi', '/api/workspace/ingredients/3/image'),
  (4, 'mushroom', 'Nấm', true, 'Nấm rơm tươi giòn ngọt tự nhiên', 'Rửa sạch nhẹ tay, nấu canh hoặc kho', 'Nấm rơm', '/api/workspace/ingredients/4/image'),
  (5, 'fruit', 'Thực vật', true, 'Bơ sáp béo ngậy, nguồn chất béo không bão hòa đơn dồi dào', 'Ăn trực tiếp, làm salad hoặc sinh tố', 'Bơ sáp', '/api/workspace/ingredients/5/image'),
  (6, 'grain', 'Thực vật', true, 'Hạt sen tươi bùi dẻo, giúp an thần ngủ ngon', 'Luộc chín hoặc hầm cùng các món canh', 'Hạt sen', '/api/workspace/ingredients/6/image'),
  (7, 'vegetable', 'Thực vật', true, 'Cà rốt tươi giàu beta-carotene và vitamin A', 'Nấu canh, xào hoặc ăn sống làm salad', 'Cà rốt', '/api/workspace/ingredients/7/image'),
  (8, 'vegetable', 'Thực vật', true, 'Rau xà lách tươi giòn thanh mát', 'Rửa sạch ráo nước làm món salad trộn', 'Xà lách', '/api/workspace/ingredients/8/image');

INSERT INTO "diary_nutrients" ("diary_id", "serving", "protein", "carbs", "fat", "fiber") VALUES
  (1, '1 phần', 12.0, 20.0, 7.5, 4.0);

-- ------------------------------------------------------------------------
-- 21. RESET CHUỖI TỰ TĂNG (SEQUENCES) TRONG POSTGRESQL
-- ------------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('users', 'user_id'), COALESCE((SELECT MAX(user_id) FROM "users"), 1));
SELECT setval(pg_get_serial_sequence('posts', 'post_id'), COALESCE((SELECT MAX(post_id) FROM "posts"), 1));
SELECT setval(pg_get_serial_sequence('recipes', 'recipe_id'), COALESCE((SELECT MAX(recipe_id) FROM "recipes"), 1));
SELECT setval(pg_get_serial_sequence('ingredients', 'ingredient_id'), COALESCE((SELECT MAX(ingredient_id) FROM "ingredients"), 1));
SELECT setval(pg_get_serial_sequence('categories', 'category_id'), COALESCE((SELECT MAX(category_id) FROM "categories"), 1));
SELECT setval(pg_get_serial_sequence('diet_types', 'diet_type_id'), COALESCE((SELECT MAX(diet_type_id) FROM "diet_types"), 1));
SELECT setval(pg_get_serial_sequence('comments', 'comment_id'), COALESCE((SELECT MAX(comment_id) FROM "comments"), 1));
SELECT setval(pg_get_serial_sequence('meal_plans', 'plan_id'), COALESCE((SELECT MAX(plan_id) FROM "meal_plans"), 1));
SELECT setval(pg_get_serial_sequence('meal_plan_details', 'plan_detail_id'), COALESCE((SELECT MAX(plan_detail_id) FROM "meal_plan_details"), 1));
SELECT setval(pg_get_serial_sequence('food_diaries', 'diary_id'), COALESCE((SELECT MAX(diary_id) FROM "food_diaries"), 1));
SELECT setval(pg_get_serial_sequence('restaurants', 'restaurant_id'), COALESCE((SELECT MAX(restaurant_id) FROM "restaurants"), 1));
SELECT setval(pg_get_serial_sequence('health_profiles', 'profile_id'), COALESCE((SELECT MAX(profile_id) FROM "health_profiles"), 1));
SELECT setval(pg_get_serial_sequence('health_histories', 'history_id'), COALESCE((SELECT MAX(history_id) FROM "health_histories"), 1));

COMMIT;
