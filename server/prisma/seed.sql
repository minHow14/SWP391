-- ========================================================================
-- FILE TỰ ĐỘNG IMPORT DỮ LIỆU MẪU (SEED DATA) VÀO POSTGRESQL
-- ========================================================================
--
-- Hướng dẫn sử dụng:
--
-- Cách 1: Sử dụng công cụ đồ họa (pgAdmin 4, DBeaver, Navicat, VS Code Extension):
--   1. Kết nối vào cơ sở dữ liệu (ví dụ: 'vegetarian_db').
--   2. Mở file 'seed.sql' này trong Query Tool (hoặc copy toàn bộ nội dung).
--   3. Nhấn Execute / Run (F5).
--
-- Cách 2: Sử dụng dòng lệnh PostgreSQL (psql):
--   psql -U postgres -d vegetarian_db -f server/prisma/seed.sql
--
-- Cách 3: Chạy qua lệnh npm:
--   cd server && npm run seed
--
-- Thông tin tài khoản mẫu sau khi import:
--   - Quản trị viên (Admin): admin@swp391.com    | Mật khẩu: 123456
--   - Người dùng (User):    user@swp391.com     | Mật khẩu: 123456
--   - Người dùng khác:       lan.nguyen@swp391.com | Mật khẩu: 123456
-- ========================================================================

BEGIN;

-- ------------------------------------------------------------------------
-- Xóa sạch dữ liệu cũ và reset quan hệ (Idempotent)
-- ------------------------------------------------------------------------
TRUNCATE TABLE
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
-- 1. CHẾ ĐỘ ĂN (DIET TYPES) (7 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "diet_types" ("diet_type_id", "name", "description") VALUES
  (1, 'Thuần Chay (Vegan)', 'Hoàn toàn từ thực vật, không trứng, sữa, mật ong hay bất kỳ phụ phẩm động vật nào'),
  (2, 'Chay Có Sữa (Lacto-Vegetarian)', 'Ăn thực vật kết hợp các sản phẩm từ sữa như sữa chua, bơ, phô mai'),
  (3, 'Chay Có Trứng (Ovo-Vegetarian)', 'Ăn thực vật kết hợp trứng các loại gia cầm'),
  (4, 'Chay Trứng & Sữa (Lacto-Ovo)', 'Chế độ ăn chay phổ biến nhất, dùng cả trứng và sữa kết hợp thực vật'),
  (5, 'Chay Phật Giáo (Tâm Linh)', 'Ăn thực vật và kiêng nhóm ngũ vị tân (hành, tỏi, kiệu, hẹ, nén)'),
  (6, 'Keto Chay', 'Hạn chế carb dưới 50g/ngày, tăng cường chất béo tốt và đạm từ hạt thực vật'),
  (7, 'Eat Clean Chay', 'Thực phẩm nguyên bản, ngũ cốc thô, không dầu mỡ tinh luyện và chất điều vị công nghiệp');

-- ------------------------------------------------------------------------
-- 2. DANH MỤC (CATEGORIES) (10 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "categories" ("category_id", "name") VALUES
  (1, 'Món Kho'),
  (2, 'Salad & Gỏi'),
  (3, 'Súp & Lẩu'),
  (4, 'Món Xào / Chiên'),
  (5, 'Món Điểm Tâm'),
  (6, 'Kinh Nghiệm Ăn Chay'),
  (7, 'Hỏi Đáp Dinh Dưỡng'),
  (8, 'Mẹo Nhà Bếp'),
  (9, 'Review Quán Chay'),
  (10, 'Dinh Dưỡng Thực Vật');

-- ------------------------------------------------------------------------
-- 3. NGUYÊN LIỆU (INGREDIENTS) (28 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "ingredients" ("ingredient_id", "name", "calories_per_100g", "protein", "fat", "carbs") VALUES
  (1, 'Đậu hũ non', 76, 8.1, 4.8, 1.9),
  (2, 'Đậu hũ chiên', 130, 12, 7.5, 3.2),
  (3, 'Nấm đông cô tươi', 34, 2.2, 0.5, 6.8),
  (4, 'Nấm rơm', 31, 3.2, 0.3, 4.6),
  (5, 'Nấm đùi gà', 35, 3.3, 0.4, 6),
  (6, 'Nấm mỡ', 22, 3.1, 0.3, 3.3),
  (7, 'Hạt sen tươi luộc', 89, 4.1, 0.5, 17.2),
  (8, 'Quả bơ sáp', 160, 2, 14.7, 8.5),
  (9, 'Rau xà lách tươi', 15, 1.4, 0.2, 2.9),
  (10, 'Cà chua tươi', 18, 0.9, 0.2, 3.9),
  (11, 'Hạt óc chó', 654, 15.2, 65.2, 13.7),
  (12, 'Hạt hạnh nhân', 579, 21.2, 49.9, 21.6),
  (13, 'Yến mạch nguyên cám', 389, 16.9, 6.9, 66.3),
  (14, 'Sữa đậu nành không đường', 33, 2.8, 1.8, 1.6),
  (15, 'Sữa tươi thanh trùng', 61, 3.2, 3.5, 4.8),
  (16, 'Phô mai Mozzarella', 280, 28, 17, 3.1),
  (17, 'Trứng gà ta', 155, 13, 11, 1.1),
  (18, 'Hành boa-rô', 61, 1.5, 0.3, 14.2),
  (19, 'Dầu olive nguyên chất', 884, 0, 100, 0),
  (20, 'Bánh mì nguyên cám', 247, 13, 3.4, 41),
  (21, 'Rong biển khô', 45, 5.8, 0.3, 8.6),
  (22, 'Gạo lứt đỏ', 111, 2.6, 0.9, 23),
  (23, 'Đậu gà (Chickpeas)', 164, 8.9, 2.6, 27.4),
  (24, 'Đậu lăng đỏ', 116, 9, 0.4, 20.1),
  (25, 'Hạt điều rang', 553, 18.2, 43.8, 30.2),
  (26, 'Bơ đậu phộng', 588, 25, 50, 20),
  (27, 'Bông cải xanh', 34, 2.8, 0.4, 6.6),
  (28, 'Bắp ngọt', 86, 3.2, 1.2, 19);

-- ------------------------------------------------------------------------
-- 4. NGƯỜI DÙNG (USERS) - Mật khẩu mặc định: 123456 (9 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "users" ("user_id", "email", "password_hash", "full_name", "role", "status", "created_at") VALUES
  (1, 'admin@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Quản Trị Viên Hệ Thống', 1, 'ACTIVE', '2026-10-08T05:41:33.161Z'),
  (2, 'user@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Trần Minh Quân', 2, 'ACTIVE', '2026-10-08T05:41:33.161Z'),
  (3, 'lan.nguyen@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Nguyễn Mai Lan', 2, 'ACTIVE', '2026-10-08T05:41:33.161Z'),
  (4, 'spammer@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Tài Khoản Vi Phạm', 2, 'LOCKED', '2026-10-08T05:41:33.161Z'),
  (5, 'tung.bepchay@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Bếp Chay Thanh Tùng', 2, 'ACTIVE', '2026-10-08T05:41:33.161Z'),
  (6, 'nam.vegan@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Hoàng Nam Vegan', 2, 'ACTIVE', '2026-10-08T05:41:33.161Z'),
  (7, 'minhanh@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Minh Anh Nguyễn', 2, 'ACTIVE', '2026-10-08T05:41:33.161Z'),
  (8, 'chayxanh@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Chuyên Gia ChayXanh', 2, 'ACTIVE', '2026-10-08T05:41:33.161Z'),
  (9, 'thanhtam@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Thanh Tâm', 2, 'ACTIVE', '2026-10-08T05:41:33.161Z');

-- ------------------------------------------------------------------------
-- 5. HỒ SƠ SỨC KHỎE (HEALTH PROFILES) (5 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "health_profiles" ("profile_id", "user_id", "diet_type_id", "height", "weight", "dob", "gender", "health_goal") VALUES
  (1, 2, 1, 175, 68.5, '1998-05-15', 'MALE', 'Tăng cơ giảm mỡ với chế độ thuần chay và calisthenics'),
  (2, 3, 4, 160, 50, '2001-10-20', 'FEMALE', 'Duy trì vóc dáng thanh mảnh và cải thiện hệ tiêu hóa'),
  (3, 5, 1, 172, 65, '1993-02-10', 'MALE', 'Nấu ăn thanh tịnh và lan tỏa lối sống xanh'),
  (4, 6, 1, 178, 72, '1995-11-28', 'MALE', 'Ăn chay năng động kết hợp chạy bộ đường dài'),
  (5, 7, 2, 162, 52, '1999-07-04', 'FEMALE', 'Bữa trưa chay văn phòng dinh dưỡng & tiện lợi');

-- ------------------------------------------------------------------------
-- 6. LỊCH SỬ CHỈ SỐ SỨC KHỎE (HEALTH HISTORIES) (5 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "health_histories" ("history_id", "user_id", "recorded_date", "weight", "bmi") VALUES
  (1, 2, '2026-08-01', 72, 23.51),
  (2, 2, '2026-09-01', 70, 22.86),
  (3, 2, '2026-10-01', 68.5, 22.37),
  (4, 3, '2026-09-15', 51.5, 20.12),
  (5, 3, '2026-10-01', 50, 19.53);

-- ------------------------------------------------------------------------
-- 7. DỊ ỨNG CỦA NGƯỜI DÙNG (USER ALLERGIES) (2 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "user_allergies" ("user_id", "ingredient_id") VALUES
  (3, 11),
  (3, 15);

-- ------------------------------------------------------------------------
-- 8. BÀI ĐĂNG GỐC (POSTS) (23 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "posts" ("post_id", "author_id", "post_type", "status", "created_at") VALUES
  (1, 5, 'VIDEO', 'PUBLISHED', '2026-03-01T03:00:00.000Z'),
  (2, 2, 'VIDEO', 'PUBLISHED', '2026-03-03T07:00:00.000Z'),
  (3, 5, 'VIDEO', 'PUBLISHED', '2026-03-04T08:00:00.000Z'),
  (4, 2, 'VIDEO', 'PUBLISHED', '2026-03-05T09:00:00.000Z'),
  (5, 3, 'BLOG', 'PUBLISHED', '2026-03-05T07:30:00.000Z'),
  (6, 7, 'BLOG', 'PUBLISHED', '2026-03-07T01:00:00.000Z'),
  (7, 5, 'BLOG', 'PUBLISHED', '2026-03-08T01:30:00.000Z'),
  (8, 3, 'BLOG', 'PUBLISHED', '2026-03-09T02:15:00.000Z'),
  (9, 6, 'BLOG', 'PUBLISHED', '2026-03-10T03:00:00.000Z'),
  (10, 8, 'BLOG', 'PUBLISHED', '2026-03-11T01:00:00.000Z'),
  (11, 9, 'BLOG', 'PUBLISHED', '2026-03-11T02:30:00.000Z'),
  (12, 2, 'BLOG', 'PUBLISHED', '2026-03-11T03:45:00.000Z'),
  (13, 2, 'BLOG', 'PENDING', '2026-03-12T04:30:00.000Z'),
  (14, 4, 'BLOG', 'HIDDEN_BY_AI', '2026-03-12T05:00:00.000Z'),
  (15, 2, 'BLOG', 'PUBLISHED', '2026-10-08T05:46:25.417Z'),
  (16, 2, 'BLOG', 'PUBLISHED', '2026-10-08T06:28:14.884Z'),
  (17, 2, 'BLOG', 'PUBLISHED', '2026-10-08T06:46:00.795Z'),
  (18, 2, 'BLOG', 'PUBLISHED', '2026-10-08T07:33:31.641Z'),
  (19, 2, 'BLOG', 'PUBLISHED', '2026-10-08T17:46:20.632Z'),
  (20, 2, 'BLOG', 'PUBLISHED', '2026-10-08T17:55:41.023Z'),
  (21, 2, 'BLOG', 'PUBLISHED', '2026-10-08T18:31:14.459Z'),
  (22, 2, 'BLOG', 'PUBLISHED', '2026-10-08T18:50:33.789Z'),
  (23, 2, 'BLOG', 'PUBLISHED', '2026-10-09T02:12:09.280Z');

-- ------------------------------------------------------------------------
-- 9. VIDEO HƯỚNG DẪN (VIDEOS) (4 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "videos" ("post_id", "title", "video_url", "thumbnail_url", "duration", "transcript") VALUES
  (1, 'Cách làm Đậu Hũ Kho Nấm Rơm đậm đà đưa cơm', 
   'https://www.youtube.com/watch?v=AEpTdclRFAE', 
   'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80', 
   480, 'Xin chào các bạn, hôm nay chúng ta cùng thực hiện món đậu hũ kho nấm rơm chay thanh tịnh thơm ngon...'),

  (2, 'Bí quyết làm Salad Bơ Hạt Óc Chó sốt mè tỏi thơm lừng', 
   'https://www.youtube.com/watch?v=eCC-HG_Jwoo', 
   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80', 
   360, 'Món salad bơ tươi giòn mát rất giàu chất béo tốt omega-3 thực vật, làm trong vòng 10 phút...'),

  (3, 'Salad Rau Củ Tươi Mát Với Sốt Đậu Phộng', 
   'https://www.youtube.com/watch?v=BFGWlAgcesk', 
   'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80', 
   525, '1. Rửa và thái rau củ. 2. Pha sốt đậu phộng với chanh và nước tương. 3. Trộn đều, thêm hạt rang và thưởng thức.'),

  (4, 'Bữa Cơm Gạo Lứt Rau Củ Dễ Làm Tại Nhà', 
   'https://www.youtube.com/watch?v=iLaJEvVh3u0', 
   'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80', 
   320, '1. Chuẩn bị cơm gạo lứt. 2. Xào rau củ vừa chín tới. 3. Xếp vào bát, thêm hạt điều và nước sốt.');

-- ------------------------------------------------------------------------
-- 10. BÀI VIẾT BLOG (BLOGS) (12 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "blogs" ("post_id", "title", "content", "attached_video_id") VALUES
  (5, 'Top 10 Nguồn Protein Thực Vật Tốt Nhất Cho Gymer Ăn Chay', 'Protein thực vật hoàn toàn có thể đáp ứng đủ nhu cầu tăng cơ nếu bạn biết kết hợp các loại đậu hũ, đậu gà, hạt hạnh nhân và yến mạch...', 1),
  (6, 'Kinh nghiệm chuyển sang ăn thuần chay 30 ngày cho người làm văn phòng', 'Chào cả nhà! Mình thử chuẩn bị bữa chay trong một tháng. Mỗi Chủ Nhật mình lên danh sách món, sơ chế rau và chia phần nguyên liệu. Những ngày đi làm chỉ cần nấu món chính, thêm một phần rau là có bữa trưa mang theo. Mọi người thường chuẩn bị món gì để tiết kiệm thời gian?', NULL),
  (7, 'Mẹo chuẩn bị đậu hũ & nấm nhanh cho bữa cơm nhà', 'Mình thường để đậu hũ ráo nước trước khi áp chảo và cắt nấm thành miếng vừa ăn. Chuẩn bị nguyên liệu, nước sốt và rau từ trước giúp lúc nấu nhẹ nhàng hơn. Đây là bát cơm đậu hũ mình làm hôm nay. Cùng chia sẻ món chay yêu thích của bạn nhé!', 1),
  (8, 'Hỏi đáp: bắt đầu ăn chay nên chuẩn bị thực đơn như thế nào?', 'Mình mới tìm hiểu ăn chay và muốn lên một thực đơn đa dạng, dễ nấu. Mọi người có thể chia sẻ cách chọn món cho cả tuần và những nguồn tài liệu dinh dưỡng đáng tin cậy không? Với câu hỏi sức khỏe cá nhân, mình dự định trao đổi thêm với chuyên gia.', NULL),
  (9, 'Trải nghiệm một tuần tự chuẩn bị bữa chay tại nhà', 'Tuần này mình thử nấu cơm gạo lứt và kết hợp nhiều loại rau củ theo mùa. Mỗi ngày đổi một loại nước sốt nên bữa ăn vẫn thú vị. Mình thích nhất là món đậu hũ áp chảo với salad. Mọi người có gợi ý món nào cho tuần tiếp theo không?', NULL),
  (10, 'Thêm Đa Dạng Rau Củ Vào Bữa Ăn Mỗi Ngày', 'Kết hợp rau xanh, củ và các loại đậu để bữa ăn phong phú hơn. Chuẩn bị rau từ trước, bảo quản riêng nước sốt và thay đổi cách chế biến giữa luộc, hấp, xào hoặc làm salad.', NULL),
  (11, 'Kinh Nghiệm Chuẩn Bị Thực Đơn Chay Cho Gia Đình', 'Lên danh sách món ăn cho vài ngày, kiểm tra nguyên liệu còn trong bếp và mua vừa đủ. Sơ chế nguyên liệu dùng chung, chia phần để dễ nấu. Hỏi sở thích từng thành viên và luân phiên món chính.', NULL),
  (12, 'Cách Làm Gia Vị Chay Từ Nấm Tại Nhà', 'Dùng nấm khô sạch, rang nhẹ cho thơm rồi để nguội hoàn toàn. Xay thành bột và đựng trong lọ khô, kín. Thêm một lượng nhỏ vào món canh hoặc món xào; dùng thìa sạch, khô mỗi khi lấy gia vị.', NULL),
  (13, 'Thực đơn 7 ngày ăn chay dưỡng lành cơ thể', 'Chế độ ăn chay tuần này sẽ tập trung vào sự đa dạng màu sắc thực phẩm tự nhiên, bổ sung vitamin khoáng chất toàn diện...', NULL),
  (14, 'Bán trà giảm cân cấp tốc 3 ngày giảm 5kg', 'Liên hệ mua hàng số điện thoại 0909xxxxxx để nhận ưu đãi lớn...', NULL),
  (22, 'Kinh nghiệm chọn nấm tươi ngon mùa mưa 1791485433787', 'Nấm tươi cần được bảo quản ở ngăn mát tủ lạnh và dùng trong vòng 3 ngày để giữ trọn vẹn vị ngọt thanh mát tự nhiên...', NULL),
  (23, 'Kinh nghiệm chọn nấm tươi ngon mùa mưa 1791511929278', 'Nấm tươi cần được bảo quản ở ngăn mát tủ lạnh và dùng trong vòng 3 ngày để giữ trọn vẹn vị ngọt thanh mát tự nhiên...', NULL);

-- ------------------------------------------------------------------------
-- 11. LIÊN KẾT BÀI ĐĂNG - DANH MỤC (POST CATEGORIES) (28 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "post_categories" ("post_id", "category_id") VALUES
  (1, 1),
  (1, 10),
  (2, 2),
  (2, 10),
  (3, 2),
  (3, 8),
  (4, 4),
  (4, 8),
  (5, 10),
  (5, 6),
  (6, 6),
  (7, 8),
  (8, 7),
  (9, 6),
  (10, 10),
  (11, 6),
  (12, 8),
  (13, 10),
  (14, 6),
  (15, 8),
  (16, 8),
  (17, 8),
  (18, 8),
  (19, 8),
  (20, 8),
  (21, 8),
  (22, 8),
  (23, 8);

-- ------------------------------------------------------------------------
-- 12. CÔNG THỨC MÓN ĂN (RECIPES) (10 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "recipes" ("recipe_id", "post_id", "category_id", "diet_type_id", "recipe_name", "description", "image_url", "prep_time", "total_calories", "instructions") VALUES
  (1, 1, 1, 1, 'Đậu Hũ Kho Nấm Đông Cô & Hạt Sen', 
   'Đậu hũ vàng giòn kho cùng nấm đông cô tươi, hạt sen dẻo và nước dừa thanh ngọt.', 
   'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80', 
   25, 280, '1. Cắt đậu hũ và áp chảo đến khi vàng đều các mặt.
2. Rửa sạch nấm đông cô tươi, ngâm nước muối loãng 5 phút.
3. Cho nấm, đậu hũ, hạt sen vào nồi cùng nước dừa tươi.
4. Nêm nước tương và kho nhỏ lửa đến khi nước sốt sánh lại.'),

  (2, 2, 2, 1, 'Salad Bơ Hạt Óc Chó Sốt Tỏi Olive', 
   'Bơ sáp dẻo ngậy kết hợp hạt óc chó giòn, rau tươi xanh và sốt tỏi dầu olive thơm nhẹ.', 
   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80', 
   15, 210, '1. Rửa sạch rau xà lách, để ráo và cắt bơ sáp thành từng lát vừa ăn.
2. Trộn tỏi băm, dầu olive nguyên chất, nước chanh và chút muối biển.
3. Xếp rau và bơ ra đĩa, rắc hạt óc chó đập dập rồi rưới đều sốt lên trên.'),

  (3, NULL, 3, 2, 'Súp Nấm Mỡ & Váng Sữa Phô Mai', 
   'Súp nấm mỡ mềm mịn với sữa tươi, kem và phô mai. Lựa chọn tuyệt vời cho chế độ chay có sữa.', 
   'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80', 
   25, 320, '1. Thái lát nấm mỡ và hành tây, xào thơm cùng bơ thực vật.
2. Thêm nước dùng rau củ vừa đủ và nấu đến khi nấm chín mềm.
3. Dùng máy xay mịn, cho sữa tươi vào đun ấm nhẹ rồi rắc phô mai bào lên trên.'),

  (4, NULL, 5, 3, 'Bánh Mì Kẹp Trứng Ốp La & Nấm Đùi Gà', 
   'Bánh mì giòn kẹp trứng ốp la béo ngậy, nấm đùi gà áp chảo cùng dưa leo và rau thơm.', 
   'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80', 
   15, 310, '1. Cắt lát nấm đùi gà, áp chảo với chút dầu olive và nước tương thơm lừng.
2. Chiên trứng ốp la lòng đào, nướng nóng giòn ổ bánh mì nguyên cám.
3. Kẹp nấm, trứng và rau xà lách vào bánh mì rồi dùng ngay khi còn nóng.'),

  (5, NULL, 5, 4, 'Bánh Nướng Phô Mai Mozzarella & Trứng', 
   'Bánh nướng mềm với trứng và phô mai mozzarella kéo sợi béo ngậy, dành cho chế độ chay trứng & sữa.', 
   'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80', 
   30, 410, '1. Phết một lớp bơ mỏng lên lát bánh mì nguyên cám rồi xếp vào khay nướng.
2. Tạo hình lòng chảo ở giữa, đập trứng gà và phủ phô mai Mozzarella xung quanh.
3. Nướng ở 180°C trong 12 phút đến khi phô mai tan chảy xém vàng.'),

  (6, NULL, 4, 1, 'Đậu Hũ Sốt Cà Chua & Hành Boa-rô', 
   'Đậu hũ chiên giòn rim cùng sốt cà chua tươi ngọt và hành boa-rô thơm phức.', 
   'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?auto=format&fit=crop&w=900&q=80', 
   20, 260, '1. Cắt đậu hũ miếng vuông, chiên vàng giòn rồi vớt ra thấm ráo dầu.
2. Phi thơm hành boa-rô băm nhỏ, cho cà chua xắt hạt lựu vào đảo nát thành sốt sệt.
3. Cho đậu hũ vào rim nhỏ lửa trong 8 phút cho thấm gia vị, rắc tiêu và boa-rô ngọn.'),

  (7, NULL, 3, 1, 'Canh Rong Biển Đậu Hũ Non Hạt Sen', 
   'Canh thanh nhiệt giải độc, bổ sung i-ốt và khoáng chất tự nhiên từ biển cả.', 
   'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80', 
   20, 180, '1. Ngâm nở rong biển khô trong nước lạnh 10 phút rồi vớt ráo.
2. Nấu sôi nước cùng hạt sen cho chín mềm.
3. Thả đậu hũ non cắt quân cờ và rong biển vào, nêm hạt nêm chay vừa ăn, tắt bếp sau 2 phút.'),

  (8, NULL, 4, 1, 'Cơm Chiên Gạo Lứt Nấm & Củ Quả', 
   'Cơm gạo lứt hạt giòn bùi kết hợp nấm hương, đậu cô ve, cà rốt giàu chất xơ và đạm thực vật.', 
   'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80', 
   25, 340, '1. Nấu chín cơm gạo lứt và để nguội ráo.
2. Cắt hạt lựu nấm đùi gà, cà rốt và đậu cô ve, xào sơ với dầu olive.
3. Cho cơm gạo lứt vào đảo đều tay trên lửa lớn, nêm nước tương và tiêu xay.'),

  (9, 3, 2, 1, 'Salad Ngũ Sắc Sốt Tương Đậu Phộng', 
   'Rau củ tươi kết hợp sốt đậu phộng thơm bùi, dễ chuẩn bị cho những ngày bận rộn.', 
   'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80', 
   20, 210, '1. Rửa sạch và thái rau củ.
2. Pha bơ đậu phộng với nước tương, chanh và nước ấm.
3. Trộn rau cùng đậu hũ, thêm sốt và dùng ngay.'),

  (10, 4, 4, 1, 'Cơm Gạo Lứt Rau Củ & Hạt Điều', 
   'Một bát cơm ấm với rau củ theo mùa và hạt điều rang thơm, đơn giản mà ngon miệng.', 
   'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', 
   25, 350, '1. Nấu gạo lứt theo hướng dẫn trên bao bì.
2. Xào rau củ với dầu và nước tương.
3. Cho cơm, rau vào bát và rắc hạt điều rang.');

-- ------------------------------------------------------------------------
-- 13. NGUYÊN LIỆU CHO CÔNG THỨC (RECIPE INGREDIENTS) (33 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "recipe_ingredients" ("recipe_id", "ingredient_id", "quantity", "unit") VALUES
  (1, 2, 200, 'gram'),
  (1, 3, 100, 'gram'),
  (1, 7, 50, 'gram'),
  (2, 8, 150, 'gram'),
  (2, 9, 80, 'gram'),
  (2, 10, 60, 'gram'),
  (2, 11, 25, 'gram'),
  (2, 19, 15, 'ml'),
  (3, 6, 150, 'gram'),
  (3, 15, 200, 'ml'),
  (3, 16, 40, 'gram'),
  (4, 20, 100, 'gram'),
  (4, 17, 100, 'gram'),
  (4, 5, 80, 'gram'),
  (4, 9, 30, 'gram'),
  (5, 20, 80, 'gram'),
  (5, 17, 50, 'gram'),
  (5, 16, 60, 'gram'),
  (6, 2, 200, 'gram'),
  (6, 10, 150, 'gram'),
  (6, 18, 30, 'gram'),
  (7, 1, 150, 'gram'),
  (7, 21, 20, 'gram'),
  (7, 7, 40, 'gram'),
  (8, 22, 150, 'gram'),
  (8, 5, 60, 'gram'),
  (8, 19, 10, 'ml'),
  (9, 9, 100, 'gram'),
  (9, 2, 100, 'gram'),
  (9, 26, 30, 'gram'),
  (10, 22, 150, 'gram'),
  (10, 25, 20, 'gram'),
  (10, 27, 80, 'gram');

-- ------------------------------------------------------------------------
-- 14. BÌNH LUẬN (COMMENTS) (18 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "comments" ("comment_id", "post_id", "user_id", "content", "is_flagged_by_ai", "status", "created_at") VALUES
  (1, 1, 3, 'Món này nhìn ngon quá, tối nay mình sẽ làm thử luôn!', FALSE, 'ACTIVE', '2026-03-01T04:00:00.000Z'),
  (2, 1, 2, 'Công thức rất dễ làm, nước dừa kho cùng nấm thơm ngọt tự nhiên.', FALSE, 'ACTIVE', '2026-03-01T05:30:00.000Z'),
  (3, 5, 2, 'Bài viết rất chi tiết và khoa học, cảm ơn tác giả!', FALSE, 'ACTIVE', '2026-03-05T09:00:00.000Z'),
  (4, 6, 2, 'Mình thường chuẩn bị đậu hũ kho và rau luộc sẵn từ tối hôm trước!', FALSE, 'ACTIVE', '2026-03-07T02:15:00.000Z'),
  (5, 6, 3, 'Cảm ơn bạn, mình sẽ thử lên thực đơn từ cuối tuần để đỡ cập rập.', FALSE, 'ACTIVE', '2026-03-07T03:20:00.000Z'),
  (6, 7, 7, 'Bát cơm nhiều màu sắc quá, nấm kho nhìn bóng bẩy thơm ngon!', FALSE, 'ACTIVE', '2026-03-08T02:00:00.000Z'),
  (7, 8, 5, 'Bạn có thể bắt đầu từ những món gia đình thường ăn như canh chua chay, nấm kho.', FALSE, 'ACTIVE', '2026-03-09T03:00:00.000Z'),
  (8, 9, 5, 'Thử món nấm kho cùng hạt sen và đậu hũ non nhé bạn!', FALSE, 'ACTIVE', '2026-03-10T04:00:00.000Z'),
  (9, 5, 4, 'Inbox mình mua thuốc bổ sung protein giá rẻ nhé', TRUE, 'HIDDEN_BY_AI', '2026-03-05T11:00:00.000Z'),
  (10, 15, 2, 'Bài viết chia sẻ rất hữu ích cho người mới vào bếp như mình!', FALSE, 'ACTIVE', '2026-10-08T05:46:25.424Z'),
  (11, 16, 2, 'Bài viết chia sẻ rất hữu ích cho người mới vào bếp như mình!', FALSE, 'ACTIVE', '2026-10-08T06:28:14.892Z'),
  (12, 17, 2, 'Bài viết chia sẻ rất hữu ích cho người mới vào bếp như mình!', FALSE, 'ACTIVE', '2026-10-08T06:46:00.803Z'),
  (13, 18, 2, 'Bài viết chia sẻ rất hữu ích cho người mới vào bếp như mình!', FALSE, 'ACTIVE', '2026-10-08T07:33:31.650Z'),
  (14, 19, 2, 'Bài viết chia sẻ rất hữu ích cho người mới vào bếp như mình!', FALSE, 'ACTIVE', '2026-10-08T17:46:20.643Z'),
  (15, 20, 2, 'Bài viết chia sẻ rất hữu ích cho người mới vào bếp như mình!', FALSE, 'ACTIVE', '2026-10-08T17:55:41.033Z'),
  (16, 21, 2, 'Bài viết chia sẻ rất hữu ích cho người mới vào bếp như mình!', FALSE, 'ACTIVE', '2026-10-08T18:31:14.470Z'),
  (17, 22, 2, 'Bài viết chia sẻ rất hữu ích cho người mới vào bếp như mình!', FALSE, 'ACTIVE', '2026-10-08T18:50:33.797Z'),
  (18, 23, 2, 'Bài viết chia sẻ rất hữu ích cho người mới vào bếp như mình!', FALSE, 'ACTIVE', '2026-10-09T02:12:09.288Z');

-- ------------------------------------------------------------------------
-- 15. BÌNH CHỌN UPVOTE/DOWNVOTE (POST VOTES) (32 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "post_votes" ("user_id", "post_id", "vote_type") VALUES
  (2, 1, 'UPVOTE'),
  (3, 1, 'UPVOTE'),
  (7, 1, 'UPVOTE'),
  (2, 2, 'UPVOTE'),
  (3, 2, 'UPVOTE'),
  (2, 5, 'UPVOTE'),
  (5, 5, 'UPVOTE'),
  (6, 5, 'UPVOTE'),
  (7, 5, 'UPVOTE'),
  (2, 6, 'UPVOTE'),
  (3, 6, 'UPVOTE'),
  (5, 6, 'UPVOTE'),
  (2, 7, 'UPVOTE'),
  (6, 7, 'UPVOTE'),
  (3, 8, 'UPVOTE'),
  (7, 8, 'UPVOTE'),
  (2, 9, 'UPVOTE'),
  (5, 9, 'UPVOTE'),
  (2, 10, 'UPVOTE'),
  (7, 10, 'UPVOTE'),
  (3, 11, 'UPVOTE'),
  (5, 11, 'UPVOTE'),
  (2, 12, 'UPVOTE'),
  (6, 12, 'UPVOTE'),
  (2, 15, 'UPVOTE'),
  (2, 16, 'UPVOTE'),
  (2, 17, 'UPVOTE'),
  (2, 18, 'UPVOTE'),
  (2, 19, 'UPVOTE'),
  (2, 20, 'UPVOTE'),
  (2, 21, 'UPVOTE'),
  (2, 22, 'UPVOTE');

-- ------------------------------------------------------------------------
-- 16. KẾ HOẠCH BỮA ĂN (MEAL PLANS) (2 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "meal_plans" ("plan_id", "user_id", "title", "start_date", "end_date", "target_calories") VALUES
  (1, 2, 'Kế hoạch Thuần Chay 7 Ngày Tăng Cơ Năng Động', '2026-10-05', '2026-10-11', 2000),
  (2, 3, 'Thực Đơn Chay Dưỡng Nhan Giảm Mỡ', '2026-10-05', '2026-10-11', 1500);

-- ------------------------------------------------------------------------
-- 17. CHI TIẾT BỮA ĂN THEO NGÀY (MEAL PLAN DETAILS) (42 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "meal_plan_details" ("plan_detail_id", "plan_id", "recipe_id", "meal_type", "day_of_week") VALUES
  (1, 1, 4, 'BREAKFAST', 1),
  (2, 1, 1, 'LUNCH', 1),
  (3, 1, 2, 'DINNER', 1),
  (4, 1, 5, 'BREAKFAST', 2),
  (5, 1, 8, 'LUNCH', 2),
  (6, 1, 7, 'DINNER', 2),
  (7, 1, 4, 'BREAKFAST', 3),
  (8, 1, 6, 'LUNCH', 3),
  (9, 1, 2, 'DINNER', 3),
  (10, 1, 3, 'BREAKFAST', 4),
  (11, 1, 1, 'LUNCH', 4),
  (12, 1, 7, 'DINNER', 4),
  (13, 1, 5, 'BREAKFAST', 5),
  (14, 1, 8, 'LUNCH', 5),
  (15, 1, 2, 'DINNER', 5),
  (16, 1, 4, 'BREAKFAST', 6),
  (17, 1, 6, 'LUNCH', 6),
  (18, 1, 3, 'DINNER', 6),
  (19, 1, 5, 'BREAKFAST', 7),
  (20, 1, 1, 'LUNCH', 7),
  (21, 1, 8, 'DINNER', 7),
  (22, 2, 2, 'BREAKFAST', 1),
  (23, 2, 9, 'LUNCH', 1),
  (24, 2, 7, 'DINNER', 1),
  (25, 2, 2, 'BREAKFAST', 2),
  (26, 2, 10, 'LUNCH', 2),
  (27, 2, 6, 'DINNER', 2),
  (28, 2, 4, 'BREAKFAST', 3),
  (29, 2, 1, 'LUNCH', 3),
  (30, 2, 7, 'DINNER', 3),
  (31, 2, 2, 'BREAKFAST', 4),
  (32, 2, 9, 'LUNCH', 4),
  (33, 2, 6, 'DINNER', 4),
  (34, 2, 4, 'BREAKFAST', 5),
  (35, 2, 10, 'LUNCH', 5),
  (36, 2, 7, 'DINNER', 5),
  (37, 2, 2, 'BREAKFAST', 6),
  (38, 2, 1, 'LUNCH', 6),
  (39, 2, 6, 'DINNER', 6),
  (40, 2, 4, 'BREAKFAST', 7),
  (41, 2, 9, 'LUNCH', 7),
  (42, 2, 7, 'DINNER', 7);

-- ------------------------------------------------------------------------
-- 18. NHẬT KÝ ĂN UỐNG (FOOD DIARIES) (7 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "food_diaries" ("diary_id", "user_id", "consumed_date", "meal_type", "recipe_id", "custom_food_name", "calories") VALUES
  (1, 2, '2026-10-07', 'BREAKFAST', 4, 'Bánh Mì Kẹp Trứng Ốp La & Nấm Đùi Gà', 310),
  (2, 2, '2026-10-07', 'LUNCH', 1, 'Đậu Hũ Kho Nấm Đông Cô & Hạt Sen', 280),
  (3, 2, '2026-10-07', 'DINNER', 2, 'Salad Bơ Hạt Óc Chó Sốt Tỏi Olive', 210),
  (4, 2, '2026-10-08', 'BREAKFAST', 5, 'Bánh Nướng Phô Mai Mozzarella & Trứng', 410),
  (5, 2, '2026-10-08', 'LUNCH', 8, 'Cơm Chiên Gạo Lứt Nấm & Củ Quả', 340),
  (6, 3, '2026-10-08', 'BREAKFAST', 2, 'Salad Bơ Hạt Óc Chó Sốt Tỏi Olive', 210),
  (7, 3, '2026-10-08', 'LUNCH', 7, 'Canh Rong Biển Đậu Hũ Non Hạt Sen', 180);

-- ------------------------------------------------------------------------
-- 19. NHÀ HÀNG & QUÁN CHAY (RESTAURANTS) (8 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "restaurants" ("restaurant_id", "name", "address", "phone", "image_url", "rating", "latitude", "longitude", "diet_type_id") VALUES
  (1, 'Nhà Hàng Chay Hum Vegetarian', '32 Võ Văn Tần, Quận 3, TP.HCM', '028 3930 4555', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', 4.9, 10.7765, 106.6918, 1),
  (2, 'Quán Cơm Chay Pi Bistro', '19 Huỳnh Khương Ninh, Quận 1, TP.HCM', '0903 888 999', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80', 4.7, 10.7912, 106.6965, 1),
  (3, 'Siêu Thị Thực Phẩm Chay Âu Lạc', '145 Nguyễn Trãi, Quận 1, TP.HCM', '028 3839 1234', 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80', 4.8, 10.7689, 106.6854, 1),
  (4, 'Nhà Hàng Chay Thiền Tâm', '123 Đường Nam Kỳ Khởi Nghĩa, Q.3, TP.HCM', '028 3930 1234', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', 4.8, 10.7852, 106.6912, 1),
  (5, 'Quán Chay An Lạc', '45 Đường Lê Văn Sỹ, Q.Phú Nhuận, TP.HCM', '028 3844 5678', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80', 4.6, 10.7925, 106.6781, 4),
  (6, 'Ẩm Thực Chay Om Mani', '78 Đường D2, P.25, Q.Bình Thạnh, TP.HCM', '0903 112 233', 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80', 4.7, 10.8031, 106.7145, 1),
  (7, 'Nhà Hàng Chay Veggie Castle', '7 Yên Ninh, P.Trúc Bạch, Q.Ba Đình, Hà Nội', '0969 990 412', 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=800&q=80', 4.9, 21.0425, 105.8432, 1),
  (8, 'Cơm Chay Diệu Hạnh', '112 Chùa Láng, Q.Đống Đa, Hà Nội', '0912 345 678', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80', 4.5, 21.0238, 105.8012, 5);

-- ------------------------------------------------------------------------
-- 20. THỰC ĐƠN QUÁN ĂN (RESTAURANT RECIPES) (25 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "restaurant_recipes" ("restaurant_id", "recipe_id") VALUES
  (1, 1),
  (1, 2),
  (1, 7),
  (1, 9),
  (2, 6),
  (2, 8),
  (2, 10),
  (3, 1),
  (3, 2),
  (3, 4),
  (4, 1),
  (4, 2),
  (4, 7),
  (5, 4),
  (5, 5),
  (5, 6),
  (6, 1),
  (6, 6),
  (6, 8),
  (7, 2),
  (7, 3),
  (7, 8),
  (8, 1),
  (8, 6),
  (8, 7);

-- ------------------------------------------------------------------------
-- 21. BÁO CÁO VI PHẠM (REPORTS) (2 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "reports" ("report_id", "reporter_id", "post_id", "comment_id", "reason", "status", "created_at") VALUES
  (1, 3, 14, NULL, 'Bài viết có dấu hiệu lừa đảo và quảng cáo sản phẩm giảm cân không rõ nguồn gốc', 'PENDING', '2026-10-08T05:41:33.229Z'),
  (2, 2, NULL, 9, 'Bình luận spam bán hàng trong bài viết kiến thức protein thực vật', 'RESOLVED', '2026-10-08T05:41:33.229Z');

-- ------------------------------------------------------------------------
-- 22. THÔNG BÁO NGƯỜI DÙNG (NOTIFICATIONS) (4 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "notifications" ("notification_id", "user_id", "content", "is_read", "created_at") VALUES
  (1, 2, 'Chào mừng bạn đến với Mạng lưới Chay Xanh SWP391! Khám phá ngay các công thức dinh dưỡng mới nhất.', TRUE, '2026-03-01T03:00:00.000Z'),
  (2, 2, 'Bài viết "Kinh nghiệm chuyển sang ăn thuần chay" đã nhận được 184 lượt yêu thích!', FALSE, '2026-03-08T07:00:00.000Z'),
  (3, 3, 'Bếp Chay Thanh Tùng đã trả lời câu hỏi của bạn trong chủ đề Bắt đầu ăn chay.', FALSE, '2026-03-09T03:05:00.000Z'),
  (4, 2, 'Đã đến lúc cập nhật chỉ số cân nặng tuần này để theo dõi tiến độ sức khỏe.', FALSE, '2026-10-08T05:41:33.226Z');

-- ------------------------------------------------------------------------
-- 23. NHẬT KÝ TRUY VẤN AI (AI LOGS) (3 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "ai_logs" ("log_id", "model_name", "action", "status", "error_feedback", "created_at") VALUES
  (1, 'deepseek-chat', 'NUTRIENT_ANALYSIS', 'SUCCESS', NULL, '2026-03-08T02:00:00.000Z'),
  (2, 'deepseek-chat', 'CHATBOT_GUEST_QUERY', 'SUCCESS', NULL, '2026-03-08T03:15:00.000Z'),
  (3, 'deepseek-chat', 'SPAM_DETECTION', 'SUCCESS', 'Đã gắn cờ phát hiện bài viết quảng cáo trà giảm cân', '2026-03-10T05:00:00.000Z');

-- ------------------------------------------------------------------------
-- ĐỒNG BỘ LẠI CÁC SEQUENCES (TỰ ĐỘNG TĂNG ID) ĐỂ TRÁNH LỖI DUPLICATE KEY KHI INSERT MỚI
-- ------------------------------------------------------------------------
SELECT setval('diet_types_diet_type_id_seq', COALESCE((SELECT MAX(diet_type_id) FROM "diet_types"), 1));
SELECT setval('categories_category_id_seq', COALESCE((SELECT MAX(category_id) FROM "categories"), 1));
SELECT setval('ingredients_ingredient_id_seq', COALESCE((SELECT MAX(ingredient_id) FROM "ingredients"), 1));
SELECT setval('users_user_id_seq', COALESCE((SELECT MAX(user_id) FROM "users"), 1));
SELECT setval('health_profiles_profile_id_seq', COALESCE((SELECT MAX(profile_id) FROM "health_profiles"), 1));
SELECT setval('health_histories_history_id_seq', COALESCE((SELECT MAX(history_id) FROM "health_histories"), 1));
SELECT setval('posts_post_id_seq', COALESCE((SELECT MAX(post_id) FROM "posts"), 1));
SELECT setval('recipes_recipe_id_seq', COALESCE((SELECT MAX(recipe_id) FROM "recipes"), 1));
SELECT setval('comments_comment_id_seq', COALESCE((SELECT MAX(comment_id) FROM "comments"), 1));
SELECT setval('meal_plans_plan_id_seq', COALESCE((SELECT MAX(plan_id) FROM "meal_plans"), 1));
SELECT setval('meal_plan_details_plan_detail_id_seq', COALESCE((SELECT MAX(plan_detail_id) FROM "meal_plan_details"), 1));
SELECT setval('food_diaries_diary_id_seq', COALESCE((SELECT MAX(diary_id) FROM "food_diaries"), 1));
SELECT setval('restaurants_restaurant_id_seq', COALESCE((SELECT MAX(restaurant_id) FROM "restaurants"), 1));
SELECT setval('reports_report_id_seq', COALESCE((SELECT MAX(report_id) FROM "reports"), 1));
SELECT setval('notifications_notification_id_seq', COALESCE((SELECT MAX(notification_id) FROM "notifications"), 1));
SELECT setval('ai_logs_log_id_seq', COALESCE((SELECT MAX(log_id) FROM "ai_logs"), 1));


-- ========================================================================
-- 22. BẢNG MỞ RỘNG VÀ DỮ LIỆU BỔ TRỢ (SUPPLEMENTARY WEBSITE DATA)
-- ========================================================================

-- Tạo cấu trúc các bảng mở rộng nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS "ingredient_details" (
  "ingredient_id" INTEGER PRIMARY KEY REFERENCES "ingredients"("ingredient_id") ON DELETE CASCADE,
  "category" VARCHAR(30) NOT NULL,
  "origin" TEXT NOT NULL,
  "plant" BOOLEAN,
  "description" TEXT NOT NULL,
  "cooking" TEXT NOT NULL,
  "aliases" TEXT NOT NULL DEFAULT '',
  "image_url" TEXT
);

CREATE TABLE IF NOT EXISTS "ingredient_alternatives" (
  "id" VARCHAR(40) PRIMARY KEY,
  "chip" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "original" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "alternatives" JSONB NOT NULL,
  "description" TEXT NOT NULL,
  "keywords" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "restaurant_details" (
  "restaurant_id" INTEGER PRIMARY KEY REFERENCES "restaurants"("restaurant_id") ON DELETE CASCADE,
  "city" TEXT NOT NULL,
  "hours" TEXT,
  "price_range" TEXT,
  "separate_kitchen" BOOLEAN
);

CREATE TABLE IF NOT EXISTS "restaurant_reviews" (
  "review_id" SERIAL PRIMARY KEY,
  "restaurant_id" INTEGER NOT NULL REFERENCES "restaurants"("restaurant_id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "stars" SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "diary_nutrients" (
  "diary_id" INTEGER PRIMARY KEY REFERENCES "food_diaries"("diary_id") ON DELETE CASCADE,
  "serving" TEXT NOT NULL DEFAULT '1 phần',
  "protein" REAL NOT NULL DEFAULT 0,
  "carbs" REAL NOT NULL DEFAULT 0,
  "fat" REAL NOT NULL DEFAULT 0,
  "fiber" REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "profile_preferences" (
  "user_id" INTEGER PRIMARY KEY REFERENCES "users"("user_id") ON DELETE CASCADE,
  "calorie_goal" REAL CHECK (calorie_goal > 0),
  "goal" TEXT,
  "protein_goal" REAL DEFAULT 70,
  "carbs_goal" REAL DEFAULT 230,
  "fat_goal" REAL DEFAULT 45,
  "fiber_goal" REAL DEFAULT 30
);

CREATE INDEX IF NOT EXISTS "restaurant_reviews_place_idx" ON "restaurant_reviews"("restaurant_id");

CREATE TABLE IF NOT EXISTS "restaurant_menu_prices" (
  "restaurant_id" INTEGER NOT NULL,
  "recipe_id" INTEGER NOT NULL,
  "price" INTEGER CHECK (price >= 0),
  PRIMARY KEY("restaurant_id", "recipe_id"),
  FOREIGN KEY("restaurant_id", "recipe_id") REFERENCES "restaurant_recipes"("restaurant_id", "recipe_id") ON DELETE CASCADE
);

-- Xóa dữ liệu các bảng mở rộng khi chạy truncate


-- 22.1. ĐỔI NGUYÊN LIỆU CHAY (INGREDIENT ALTERNATIVES) (8 bản ghi)
INSERT INTO "ingredient_alternatives" ("id", "chip", "emoji", "original", "role", "alternatives", "description", "keywords") VALUES
  ('cheese', 'Phô mai / Bơ', '🧀', 'Phô mai / Bơ động vật', 'Tạo Độ Béo Ngậy', '["Men dinh dưỡng (Nutritional yeast)","Phô mai hạt điều (Cashew cheese)","Bơ thực vật có nhãn thuần chay"]'::jsonb, 'Gợi hương vị phô mai, tạo độ béo và vị bùi cho món Âu hoặc bánh. Chọn loại thay thế phù hợp khi cần độ tan chảy hay đánh bông.', 'cheese butter margarine'),
  ('egg', 'Trứng gà', '🥚', 'Trứng gà (cho làm bánh & kết dính)', 'Kết dính & Tạo xốp', '["Đậu phụ non xay mịn","Hạt lanh ngâm nước (Flaxseed)","Aquafaba (Nước luộc đậu gà)"]'::jsonb, 'Đậu phụ và hạt lanh giúp kết dính, giữ độ ẩm cho khối bột. Aquafaba đánh bông hỗ trợ tạo độ xốp; chọn theo loại bánh.', 'trứng vịt egg bánh ngọt'),
  ('fish-sauce', 'Nước mắm', '🐟', 'Nước mắm truyền thống (Cá cơm)', 'Tạo Vị Umami', '["Nước mắm chay từ dứa (thơm)","Nước mắm chay nấm đông cô","Tương đậu nành tamari / shoyu"]'::jsonb, 'Tạo vị mặn, vị umami và màu nâu hổ phách cho món kho hoặc nước chấm. Điều chỉnh lượng dùng theo độ mặn của sản phẩm.', 'fish sauce nước chấm'),
  ('gelatin', 'Gelatin', '🧪', 'Gelatin (Chiết xuất từ da, xương động vật)', 'Tạo Độ Đông Đặc', '["Bột agar-agar (Tảo biển)","Pectin thực vật (Vỏ táo / cam)","Bột rau câu dẻo"]'::jsonb, 'Tạo độ đông hoặc độ dẻo cho thạch, kẹo và món tráng miệng. Mỗi loại có cách nấu và tỷ lệ riêng, cần điều chỉnh công thức.', 'gelatine thạch panna cotta mousse'),
  ('meat', 'Thịt bò', '🥩', 'Thịt bò / Thịt heo / Thịt băm', 'Đạm & Kết cấu', '["Nấm đùi gà","Đạm đậu nành (TVP)","Seitan (Đạm lúa mì)","Nấm đông cô băm"]'::jsonb, 'Tạo kết cấu dai, giữ gia vị đậm đà cho món xào, kho hoặc nhân bánh. Đạm đậu nành và seitan bổ sung nguồn đạm thực vật.', 'thịt lợn beef pork mince protein'),
  ('milk', 'Sữa tươi / Sữa đặc', '🥛', 'Sữa tươi / Sữa đặc có đường', 'Sữa Thực Vật', '["Sữa đậu nành","Sữa yến mạch (Oat milk)","Sữa hạt điều / Sữa dừa đặc thuần chay"]'::jsonb, 'Tạo độ mịn và độ béo cho đồ uống, sốt hoặc bánh. Dùng loại không đường cho món mặn; sữa dừa đặc phù hợp khi cần độ sánh.', 'milk condensed dairy'),
  ('seafood', 'Thịt gà / Tôm', '🍗', 'Thịt gà / Tôm biển / Hải sản', 'Tạo Độ Dai Giòn', '["Nấm tuyết","Nấm bào ngư xé sợi","Váng đậu (Tàu hũ ky) cuộn","Măng tây"]'::jsonb, 'Tạo độ dai, giòn và mọng nước cho món xào, nộm hoặc gỏi. Xé sợi nấm hay cuộn tàu hũ ky để tạo kết cấu phù hợp với món gốc.', 'cá cua mực chicken shrimp seafood'),
  ('stock', 'Bột nêm thịt/xương', '🧂', 'Bột nêm thịt heo / Chiết xuất xương', 'Tạo Vị Ngọt Thanh', '["Bột nêm nấm shiitake","Nước dùng củ quả ninh (Su su, củ cải, cà rốt)","Bột ngô ngọt & gia vị nấm"]'::jsonb, 'Tạo vị ngọt thanh và umami tự nhiên cho nước dùng, canh hoặc món hầm. Ninh củ quả và nấm để làm nền nước dùng chay.', 'hạt nêm broth stock nước dùng');

-- 22.2. CHI TIẾT NGUYÊN LIỆU (INGREDIENT DETAILS) (28 bản ghi)
INSERT INTO "ingredient_details" ("ingredient_id", "category", "origin", "plant", "description", "cooking", "aliases", "image_url") VALUES
  (1, 'other', 'Thực vật', TRUE, 'Đậu hũ non. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Đậu hũ non', NULL),
  (2, 'other', 'Thực vật', TRUE, 'Đậu hũ chiên. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Đậu hũ chiên', NULL),
  (3, 'other', 'Thực vật', TRUE, 'Nấm đông cô tươi. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Nấm đông cô tươi', NULL),
  (4, 'other', 'Thực vật', TRUE, 'Nấm rơm. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Nấm rơm', NULL),
  (5, 'mushroom', 'Nấm', TRUE, 'Thân nấm dày, kết cấu dai giòn. Thích hợp áp chảo, xé sợi làm gỏi hoặc thay kết cấu thịt trong món xào.', 'Cắt lát dọc để áp chảo hoặc xé sợi rồi xào với rau củ. Tránh nấu quá lâu để giữ kết cấu.', 'king oyster mushroom nấm đùi gà tươi', '/demo-assets/mushroom-soup.webp'),
  (6, 'other', 'Thực vật', TRUE, 'Nấm mỡ. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Nấm mỡ', NULL),
  (7, 'other', 'Thực vật', TRUE, 'Hạt sen tươi luộc. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Hạt sen tươi luộc', NULL),
  (8, 'other', 'Thực vật', TRUE, 'Quả bơ sáp. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Quả bơ sáp', NULL),
  (9, 'other', 'Thực vật', TRUE, 'Rau xà lách tươi. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Rau xà lách tươi', NULL),
  (10, 'other', 'Thực vật', TRUE, 'Cà chua tươi. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Cà chua tươi', NULL),
  (11, 'other', 'Thực vật', TRUE, 'Hạt óc chó. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Hạt óc chó', NULL),
  (12, 'other', 'Thực vật', TRUE, 'Hạt hạnh nhân. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Hạt hạnh nhân', NULL),
  (13, 'other', 'Thực vật', TRUE, 'Yến mạch nguyên cám. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Yến mạch nguyên cám', NULL),
  (14, 'other', 'Thực vật', TRUE, 'Sữa đậu nành không đường. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Sữa đậu nành không đường', NULL),
  (15, 'other', 'Động vật', FALSE, 'Sữa tươi thanh trùng. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Sữa tươi thanh trùng', NULL),
  (16, 'other', 'Thực vật', TRUE, 'Phô mai Mozzarella. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Phô mai Mozzarella', NULL),
  (17, 'other', 'Động vật', FALSE, 'Trứng gà ta. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Trứng gà ta', NULL),
  (18, 'other', 'Thực vật', TRUE, 'Hành boa-rô. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Hành boa-rô', NULL),
  (19, 'other', 'Thực vật', TRUE, 'Dầu olive nguyên chất. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Dầu olive nguyên chất', NULL),
  (20, 'other', 'Thực vật', TRUE, 'Bánh mì nguyên cám. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Bánh mì nguyên cám', NULL),
  (21, 'other', 'Thực vật', TRUE, 'Rong biển khô. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Rong biển khô', NULL),
  (22, 'other', 'Thực vật', TRUE, 'Gạo lứt đỏ. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Gạo lứt đỏ', NULL),
  (23, 'other', 'Thực vật', TRUE, 'Đậu gà (Chickpeas). Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Đậu gà (Chickpeas)', NULL),
  (24, 'other', 'Thực vật', TRUE, 'Đậu lăng đỏ. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Đậu lăng đỏ', NULL),
  (25, 'other', 'Thực vật', TRUE, 'Hạt điều rang. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Hạt điều rang', NULL),
  (26, 'other', 'Thực vật', TRUE, 'Bơ đậu phộng. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Bơ đậu phộng', NULL),
  (27, 'other', 'Thực vật', TRUE, 'Bông cải xanh. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Bông cải xanh', NULL),
  (28, 'other', 'Thực vật', TRUE, 'Bắp ngọt. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.', 'Chế biến theo công thức và hướng dẫn của sản phẩm.', 'Bắp ngọt', NULL);

-- 22.3. CHI TIẾT NHÀ HÀNG (RESTAURANT DETAILS) (8 bản ghi)
INSERT INTO "restaurant_details" ("restaurant_id", "city", "hours", "price_range", "separate_kitchen") VALUES
  (1, 'TP.HCM', '09:00 – 21:00', '80.000đ – 150.000đ', TRUE),
  (2, 'TP.HCM', '09:00 – 21:00', '80.000đ – 150.000đ', TRUE),
  (3, 'TP.HCM', '09:00 – 21:00', '80.000đ – 150.000đ', TRUE),
  (4, 'TP.HCM', '09:00 – 21:00', '80.000đ – 150.000đ', TRUE),
  (5, 'TP.HCM', '09:00 – 21:00', '80.000đ – 150.000đ', TRUE),
  (6, 'TP.HCM', '09:00 – 21:00', '80.000đ – 150.000đ', TRUE),
  (7, 'Hà Nội', '09:00 – 21:00', '80.000đ – 150.000đ', TRUE),
  (8, 'Hà Nội', '09:00 – 21:00', '80.000đ – 150.000đ', TRUE);

-- 22.4. GIÁ THỰC ĐƠN NHÀ HÀNG (RESTAURANT MENU PRICES) (25 bản ghi)
INSERT INTO "restaurant_menu_prices" ("restaurant_id", "recipe_id", "price") VALUES
  (1, 1, 145000),
  (1, 2, 120000),
  (1, 7, 95000),
  (1, 9, 80000),
  (2, 6, 145000),
  (2, 8, 120000),
  (2, 10, 95000),
  (3, 1, 145000),
  (3, 2, 120000),
  (3, 4, 95000),
  (4, 1, 145000),
  (4, 2, 120000),
  (4, 7, 95000),
  (5, 4, 145000),
  (5, 5, 120000),
  (5, 6, 95000),
  (6, 1, 145000),
  (6, 6, 120000),
  (6, 8, 95000),
  (7, 2, 145000),
  (7, 3, 120000),
  (7, 8, 95000),
  (8, 1, 145000),
  (8, 6, 120000),
  (8, 7, 95000);

-- 22.5. ĐÁNH GIÁ NHÀ HÀNG MẪU (RESTAURANT REVIEWS) (4 bản ghi)
INSERT INTO "restaurant_reviews" ("review_id", "restaurant_id", "user_id", "stars", "content", "created_at") VALUES
  (1, 1, 2, 5, 'Không gian ấm cúng, thanh tịnh. Món ăn nêm nếm rất vừa vị, nhân viên chu đáo!', '2026-10-09T10:00:00Z'),
  (2, 1, 3, 5, 'Rau nấm tươi ngon, đậu hũ non mềm mịn. Chắc chắn sẽ quay lại thường xuyên.', '2026-10-10T12:30:00Z'),
  (3, 2, 2, 5, 'Món ăn trang trí đẹp mắt, vị ngọt thanh tự nhiên từ củ quả. Rất đáng trải nghiệm.', '2026-10-11T11:15:00Z'),
  (4, 3, 3, 5, 'Không gian yên tĩnh, thực đơn phong phú từ khai vị đến tráng miệng.', '2026-10-11T14:00:00Z');
SELECT setval('restaurant_reviews_review_id_seq', COALESCE((SELECT MAX(review_id) FROM "restaurant_reviews"), 1));

-- 22.6. MỤC TIÊU DINH DƯỠNG CÁ NHÂN (PROFILE PREFERENCES) (5 bản ghi)
INSERT INTO "profile_preferences" ("user_id", "calorie_goal", "goal", "protein_goal", "carbs_goal", "fat_goal", "fiber_goal") VALUES
  (2, 1850, 'Tăng cơ giảm mỡ với chế độ thuần chay và calisthenics', 70, 230, 45, 30),
  (3, 1850, 'Duy trì', 70, 230, 45, 30),
  (5, 1850, 'Duy trì', 70, 230, 45, 30),
  (6, 1850, 'Duy trì', 70, 230, 45, 30),
  (7, 1850, 'Duy trì', 70, 230, 45, 30);

-- 22.7. DINH DƯỠNG NHẬT KÝ BỮA ĂN (DIARY NUTRIENTS) (7 bản ghi)
INSERT INTO "diary_nutrients" ("diary_id", "serving", "protein", "carbs", "fat", "fiber") VALUES
  (1, '1 phần', 29.06, 47.77, 14.78, 0),
  (2, '1 phần', 28.25, 21.8, 15.75, 0),
  (3, '1 phần', 8.46, 20.835, 53.63, 0),
  (4, '1 phần', 33.7, 35.21, 18.42, 0),
  (5, '1 phần', 5.88, 38.1, 11.59, 0),
  (6, '1 phần', 8.46, 20.835, 53.63, 0),
  (7, '1 phần', 14.95, 11.45, 7.46, 0);

COMMIT;
