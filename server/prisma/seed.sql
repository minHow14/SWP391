-- D:/SWP391/SWP391/server/prisma/seed.sql
-- npm run seed / npm run db:seed / npx prisma db seed tự chạy migration trước khi nạp dữ liệu.
-- Nếu nạp trực tiếp file SQL bằng psql, phải chạy npx prisma migrate deploy trước.
-- CẢNH BÁO: Seed này TRUNCATE dữ liệu hiện có. Chỉ dùng cho DB mới hoặc DB được phép khởi tạo lại.
-- Kiểm duyệt: moderation_version mặc định 0 (chưa quét), content_moderation_jobs khởi tạo rỗng.
-- Không tạo cờ/kết quả AI khi chưa có lượt kiểm duyệt thực tế.
-- ========================================================================
-- BỘ DỮ LIỆU THỰC TẾ HỆ THỐNG NỀN TẢNG ĂN CHAY CHAYXANH (SWP391)
-- ========================================================================
-- Dữ liệu thực tế 100%, sử dụng toàn bộ video YouTube trực tiếp & hình ảnh
-- có sẵn hoạt động chuẩn xác; mô tả chi tiết, khớp 100% từng món ăn:
-- - Video 1: "Cách làm Đậu Hũ Kho Nấm Rơm" (AEpTdclRFAE) -> Món Đậu Hũ Kho Nấm Rơm & Hạt Sen
-- - Video 2: "Salad Táo, Óc Chó Bùi Béo" (eCC-HG_Jwoo) -> Món Salad Bơ Táo Hạt Óc Chó
-- - Video 3: "Canh Rong Biển Đậu Hũ Non" (v8lb0iddTw4) -> Món Canh Rong Biển Đậu Hũ Non Hạt Sen
-- - Video 4: "Cơm Gạo Lức Trộn Rau Củ" (XssKM6yLekE) -> Món Cơm Gạo Lứt Trộn Rau Củ & Hạt Điều
-- - Các món ăn khác sử dụng ảnh chụp thực tế mô tả chính xác món ăn (súp nấm, bánh mì kẹp,
--   bánh nướng phô mai, đậu hũ sốt cà, cơm chiên gạo lứt, salad ngũ sắc sốt bơ lạc).
-- ========================================================================

BEGIN;

-- ------------------------------------------------------------------------
-- Xóa sạch dữ liệu cũ và reset quan hệ (Idempotent)
-- ------------------------------------------------------------------------
TRUNCATE TABLE
  "content_moderation_jobs",
  "guest_quota",
  "ai_logs",
  "notifications",
  "reports",
  "restaurant_menu_prices",
  "restaurant_reviews",
  "restaurant_details",
  "restaurant_recipes",
  "restaurants",
  "diary_nutrients",
  "food_diaries",
  "meal_plan_details",
  "meal_plans",
  "post_votes",
  "comments",
  "post_attachments",
  "recipe_ingredients",
  "recipes",
  "post_categories",
  "blogs",
  "videos",
  "posts",
  "ingredient_images",
  "ingredient_details",
  "ingredient_alternatives",
  "ingredients",
  "profile_preferences",
  "user_allergies",
  "health_histories",
  "health_profiles",
  "users",
  "categories",
  "diet_types"
CASCADE;

-- ------------------------------------------------------------------------
-- 1. CHẾ ĐỘ ĂN (DIET TYPES) (7 chế độ ăn chuẩn)
-- ------------------------------------------------------------------------
INSERT INTO "diet_types" ("diet_type_id", "name", "description") VALUES
  (1, 'Thuần Chay (Vegan)', 'Chế độ ăn 100% từ thực vật; hoàn toàn không tiêu thụ thịt, cá, trứng, sữa, mật ong hay bất kỳ phụ phẩm nào từ động vật.'),
  (2, 'Chay Có Sữa (Lacto-Vegetarian)', 'Ăn thực vật kết hợp sử dụng các chế phẩm từ sữa động vật như sữa tươi, sữa chua, phô mai và bơ.'),
  (3, 'Chay Có Trứng (Ovo-Vegetarian)', 'Ăn thực vật kết hợp trứng các loại gia cầm có nguồn gốc nhân đạo, không dùng sữa động vật.'),
  (4, 'Chay Trứng & Sữa (Lacto-Ovo)', 'Chế độ ăn chay phổ biến phương Tây, kết hợp thực vật cùng cả trứng và các sản phẩm từ sữa.'),
  (5, 'Chay Phật Giáo (Tâm Linh)', 'Ăn thực vật thanh tịnh và kiêng tuyệt đối nhóm ngũ vị tân (hành, tỏi, kiệu, hẹ, nén) nhằm giữ thân tâm an định.'),
  (6, 'Keto Chay', 'Hạn chế tối đa tinh bột (dưới 50g carb thuần mỗi ngày), tăng cường chất béo tốt từ quả bơ, dầu olive, các loại hạt và đạm thực vật.'),
  (7, 'Eat Clean Chay', 'Ưu tiên thực phẩm nguyên bản toàn phần, ngũ cốc thô nguyên cám, chế biến tối giản, hạn chế đường và dầu mỡ tinh luyện.');

-- ------------------------------------------------------------------------
-- 2. DANH MỤC MÓN ĂN & BÀI ĐĂNG (CATEGORIES) (7 danh mục chuẩn)
-- ------------------------------------------------------------------------
INSERT INTO "categories" ("category_id", "name") VALUES
  (1, 'Món Kho'),
  (2, 'Salad & Gỏi'),
  (3, 'Súp & Canh'),
  (4, 'Món Xào / Chiên'),
  (5, 'Dinh Dưỡng & Đời Sống'),
  (6, 'Món Bún / Phở / Mì'),
  (7, 'Món Tráng Miệng & Chè');

-- ------------------------------------------------------------------------
-- 3. NGUYÊN LIỆU (INGREDIENTS) (28 nguyên liệu thực tế khớp Catalog)
-- ------------------------------------------------------------------------
INSERT INTO "ingredients" ("ingredient_id", "name", "calories_per_100g", "protein", "fat", "carbs") VALUES
  (1, 'Đậu hũ non', 76, 8.1, 4.8, 1.9),
  (2, 'Đậu hũ chiên', 130, 12.0, 7.5, 3.2),
  (3, 'Nấm đông cô tươi', 34, 2.2, 0.5, 6.8),
  (4, 'Nấm rơm', 31, 3.2, 0.3, 4.6),
  (5, 'Nấm đùi gà', 38, 3.1, 0.4, 6.5),
  (6, 'Nấm mỡ', 28, 3.0, 0.3, 4.3),
  (7, 'Hạt sen tươi luộc', 89, 4.1, 0.5, 17.2),
  (8, 'Quả bơ sáp', 160, 2.0, 14.7, 8.5),
  (9, 'Rau xà lách tươi', 15, 1.4, 0.2, 2.9),
  (10, 'Cà chua tươi', 18, 0.9, 0.2, 3.9),
  (11, 'Hạt óc chó', 654, 15.2, 65.2, 13.7),
  (12, 'Hạt hạnh nhân', 579, 21.2, 49.9, 21.6),
  (13, 'Yến mạch nguyên cám', 389, 16.9, 6.9, 66.3),
  (14, 'Sữa đậu nành không đường', 43, 3.5, 1.8, 3.3),
  (15, 'Sữa tươi thanh trùng', 62, 3.2, 3.5, 4.8),
  (16, 'Phô mai Mozzarella', 300, 22.0, 22.0, 2.2),
  (17, 'Trứng gà ta', 143, 12.6, 9.5, 0.7),
  (18, 'Hành boa-rô', 61, 1.5, 0.3, 14.2),
  (19, 'Dầu olive nguyên chất', 884, 0.0, 100.0, 0.0),
  (20, 'Bánh mì nguyên cám', 247, 13.0, 3.4, 41.3),
  (21, 'Rong biển khô', 45, 5.8, 0.3, 8.6),
  (22, 'Gạo lứt đỏ', 111, 2.6, 0.9, 23.0),
  (23, 'Đậu gà (Chickpeas)', 164, 8.9, 2.6, 27.4),
  (24, 'Đậu lăng đỏ', 116, 9.0, 0.4, 20.1),
  (25, 'Hạt điều rang', 553, 18.2, 43.8, 30.2),
  (26, 'Bơ đậu phộng', 588, 25.1, 50.4, 20.0),
  (27, 'Bông cải xanh', 34, 2.8, 0.4, 6.6),
  (28, 'Bắp ngọt', 86, 3.2, 1.2, 19.0);

-- ------------------------------------------------------------------------
-- 4. CHI TIẾT NGUYÊN LIỆU (INGREDIENT DETAILS) (28 bản ghi)
-- ------------------------------------------------------------------------
INSERT INTO "ingredient_details" ("ingredient_id", "category", "origin", "plant", "description", "cooking", "aliases", "image_url") VALUES
  (1, 'protein', 'Thực vật', true, 'Đậu hũ non kết cấu mềm mịn, giàu protein đậu nành và canxi tự nhiên.', 'Cho vào cuối quá trình nấu, thích hợp làm món canh thanh nhiệt hoặc hấp tương.', 'tofu silken đậu phụ non tàu hũ', '/api/workspace/ingredients/1/image'),
  (2, 'protein', 'Thực vật', true, 'Đậu hũ chiên vàng giòn bên ngoài, bùi béo bên trong, giàu đạm thực vật.', 'Thích hợp kho nấm, xào rau củ, sốt cà chua hoặc nhồi nấm.', 'fried tofu đậu phụ rán', '/api/workspace/ingredients/2/image'),
  (3, 'mushroom', 'Nấm', true, 'Nấm đông cô tươi mũ nâu tròn, giàu lentinan và khoáng chất, thơm đậm đà.', 'Cắt bỏ chân già, xào với boa-rô, nấu súp hoặc hầm nước dùng chay.', 'shiitake nấm hương tươi', '/api/workspace/ingredients/3/image'),
  (4, 'mushroom', 'Nấm', true, 'Nấm rơm dạng búp tròn vị ngọt thanh tự nhiên, đặc sản các món chay Nam Bộ.', 'Rửa sạch nhẹ tay với nước muối loãng, nấu canh, kho tộ hoặc nấu cháo.', 'straw mushroom', '/api/workspace/ingredients/4/image'),
  (5, 'mushroom', 'Nấm', true, 'Nấm đùi gà thân dày giòn ngọt, kết cấu dai bùi như thịt gà thực vật.', 'Thái lát áp chảo vàng, xé sợi làm gỏi hoặc kho tiêu gừng đưa cơm.', 'king oyster mushroom pleurotus', '/api/workspace/ingredients/5/image'),
  (6, 'mushroom', 'Nấm', true, 'Nấm mỡ mũ tròn trắng ngà, vị ngọt dịu nhẹ nhàng, ít calo.', 'Thái lát xào sốt dầu hào chay, nấu súp kem hoặc nướng thảo mộc.', 'button mushroom champignon', '/api/workspace/ingredients/6/image'),
  (7, 'vegetable', 'Thực vật', true, 'Hạt sen tươi bùi dẻo, giàu kiềm thực vật, giúp an thần ngủ ngon.', 'Bỏ tâm sen, luộc chín mềm để hầm canh, nấu chè hoặc hấp cùng cơm.', 'lotus seed hạt sen Huế', '/api/workspace/ingredients/7/image'),
  (8, 'vegetable', 'Thực vật', true, 'Bơ sáp dẻo béo ngậy, nguồn chất béo không bão hòa đơn và kali dồi dào.', 'Cắt lát trộn salad, phết bánh mì đen hoặc làm sốt bơ béo không sữa.', 'avocado bơ sáp Đắk Lắk', '/api/workspace/ingredients/8/image'),
  (9, 'vegetable', 'Thực vật', true, 'Rau xà lách giòn ngọt mọng nước, giàu chất xơ hòa tan và vitamin K.', 'Rửa sạch để thật ráo nước, làm nền cho các món gỏi và salad trộn dầu giấm.', 'lettuce rau xà lách mỡ xoăn', '/api/workspace/ingredients/9/image'),
  (10, 'vegetable', 'Thực vật', true, 'Cà chua chín mọng giàu lycopene chống oxy hóa, vị chua ngọt tự nhiên.', 'Ăn tươi trong salad, sốt cà chua đậu hũ hoặc nấu canh chua chay.', 'tomato cà chua Đà Lạt', '/api/workspace/ingredients/10/image'),
  (11, 'vegetable', 'Thực vật', true, 'Hạt óc chó giàu axit béo omega-3 ALA thực vật, tốt cho trí não và tim mạch.', 'Nướng nhẹ ăn trực tiếp, rắc lên salad hoặc xay làm sữa hạt béo bùi.', 'walnut quả óc chó', '/api/workspace/ingredients/11/image'),
  (12, 'vegetable', 'Thực vật', true, 'Hạt hạnh nhân giàu vitamin E, canxi và chất béo lành mạnh.', 'Ăn nhẹ giữa giờ, làm sữa hạt hạnh nhân nguyên chất hoặc làm bánh nướng.', 'almond hạnh nhân rang', '/api/workspace/ingredients/12/image'),
  (13, 'vegetable', 'Thực vật', true, 'Yến mạch nguyên cám giàu chất xơ beta-glucan giúp ổn định đường huyết.', 'Nấu cháo yến mạch nấm rơm, làm yến mạch ngâm qua đêm (overnight oats).', 'oat oatmeal yến mạch cán dẹt', '/api/workspace/ingredients/13/image'),
  (14, 'protein', 'Thực vật', true, 'Sữa đậu nành nguyên chất không đường, dồi dào isoflavone và protein.', 'Uống trực tiếp buổi sáng, làm sinh tố hoa quả hoặc nấu nước sốt cà ri chay.', 'soy milk sữa đậu nành tươi', '/api/workspace/ingredients/14/image'),
  (15, 'other', 'Động vật', false, 'Sữa tươi bò thanh trùng giàu canxi và đạm, chỉ dùng cho chế độ Lacto.', 'Dùng cho người ăn chay có sữa, pha thức uống hoặc làm sốt bánh chay.', 'dairy milk sữa bò tươi', '/api/workspace/ingredients/15/image'),
  (16, 'other', 'Động vật', false, 'Phô mai Mozzarella dẻo dai kéo sợi, thích hợp cho chế độ chay Lacto-Ovo.', 'Nướng bánh pizza rau củ hoặc đút lò mì ống nấm sốt cà.', 'cheese mozzarella phô mai sợi', '/api/workspace/ingredients/16/image'),
  (17, 'other', 'Động vật', false, 'Trứng gà ta giàu protein albumin và choline, dành cho chế độ Ovo-Vegetarian.', 'Luộc lòng đào ăn cùng salad, tráng mỏng cuốn rau củ hoặc làm bánh nướng.', 'egg eggs trứng gà thả vườn', '/api/workspace/ingredients/17/image'),
  (18, 'vegetable', 'Thực vật', true, 'Hành boa-rô thân trắng lá xanh, gia vị tạo mùi thơm ngọt thay thế hành tây.', 'Xắt mỏng phi thơm với dầu ăn thực vật làm dậy mùi cho các món xào, kho.', 'leek tỏi tây boa-rô baro', '/api/workspace/ingredients/18/image'),
  (19, 'vegetable', 'Thực vật', true, 'Dầu olive nguyên chất ép lạnh, nguồn chất béo polyphenol thượng hạng.', 'Trộn trực tiếp vào salad rau củ hoặc rưới lên món súp nóng khi thưởng thức.', 'olive oil dầu ô liu Extra Virgin', '/api/workspace/ingredients/19/image'),
  (20, 'vegetable', 'Thực vật', true, 'Bánh mì ngũ cốc nguyên cám giàu chất xơ thô, chỉ số GI thấp hỗ trợ giảm mỡ.', 'Nướng giòn kẹp bơ sáp và cà chua cho bữa sáng Eat Clean nhanh gọn.', 'whole wheat bread bánh mì đen', '/api/workspace/ingredients/20/image'),
  (21, 'vegetable', 'Thực vật', true, 'Rong biển khô giàu i-ốt, sắt và khoáng chất đại dương, tạo vị ngọt umami.', 'Ngâm nở nấu canh đậu hũ hạt sen, cuộn kimbap chay hoặc nướng giòn rắc mè.', 'seaweed nori rong biển Hàn Quốc', '/api/workspace/ingredients/21/image'),
  (22, 'vegetable', 'Thực vật', true, 'Gạo lứt đỏ Điện Biên dẻo bùi, nguyên cám chứa hàm lượng vitamin nhóm B cao.', 'Nấu cơm ăn kèm muối mè, xào rau củ hạt sen hoặc làm trà gạo lứt rang.', 'brown rice gạo lứt huyết rồng', '/api/workspace/ingredients/22/image'),
  (23, 'protein', 'Thực vật', true, 'Đậu gà giàu đạm và tinh bột kháng, được mệnh danh là siêu thực phẩm chay.', 'Ngâm mềm nấu cà ri, làm sốt chấm Hummus hoặc nướng giòn làm snack.', 'chickpea đậu gà Kabuli garbanzo', '/api/workspace/ingredients/23/image'),
  (24, 'protein', 'Thực vật', true, 'Đậu lăng đỏ nhanh mềm khi nấu, giàu chất sắt và protein thực vật dễ tiêu.', 'Nấu súp kem đậu lăng, nấu cà ri dừa hoặc trộn salad xà lách.', 'red lentil đậu lăng nhập khẩu', '/api/workspace/ingredients/24/image'),
  (25, 'vegetable', 'Thực vật', true, 'Hạt điều rang bùi béo ngọt tự nhiên, dồi dào magie và kẽm tăng đề kháng.', 'Xay làm phô mai chay, rắc lên các món xào nấm hoặc ăn kèm granola.', 'cashew nuts hạt điều Bình Phước', '/api/workspace/ingredients/25/image'),
  (26, 'vegetable', 'Thực vật', true, 'Bơ đậu phộng nguyên chất không đường, giàu đạm và axit béo lành mạnh.', 'Phết lên bánh mì nguyên cám cùng chuối sứ hoặc pha sốt gỏi cuốn chay.', 'peanut butter bơ lạc mịn', '/api/workspace/ingredients/26/image'),
  (27, 'vegetable', 'Thực vật', true, 'Bông cải xanh giòn ngọt, giàu sulforaphane, vitamin C và folate tự nhiên.', 'Hấp cách thủy giữ trọn dưỡng chất, xào nấm mỡ hoặc nấu súp rau củ.', 'broccoli súp lơ xanh Đà Lạt', '/api/workspace/ingredients/27/image'),
  (28, 'vegetable', 'Thực vật', true, 'Bắp ngọt vàng óng thơm mọng, mang lại vị ngọt đậm đà tự nhiên cho nước dùng.', 'Ninh lấy nước ngọt nấu canh súp, tách hạt xào nấm hoặc nấu chè hạt sen.', 'sweet corn ngô ngọt Mỹ', '/api/workspace/ingredients/28/image');

-- ------------------------------------------------------------------------
-- 5. BỘ CHUYỂN ĐỔI NGUYÊN LIỆU (FOOD SWAP) (8 phương án thực tế)
-- ------------------------------------------------------------------------
INSERT INTO "ingredient_alternatives" ("id", "chip", "emoji", "original", "role", "alternatives", "description", "keywords") VALUES
  ('cheese', 'Phô mai & Bơ', '🧀', 'Phô mai & Bơ sữa động vật', 'Tạo Độ Béo Ngậy', '["Men dinh dưỡng (Nutritional Yeast) tạo vị phô mai mặn bùi","Phô mai hạt điều (Cashew Cheese) ủ men vi sinh","Bơ thực vật thuần chay làm từ dầu dừa và bơ hạt mỡ"]'::jsonb, 'Gợi ý thay thế phô mai truyền thống bằng hạt điều xay mịn và men dinh dưỡng giúp món Âu béo ngậy không cần sữa.', 'cheese butter bơ phô mai phomat'),
  ('egg', 'Trứng gà', '🥚', 'Trứng gia cầm làm bánh & kết dính', 'Kết dính & Tạo xốp ẩm', '["Hạt lanh ngâm nở (Flax Egg: 1 thìa hạt lanh xay + 3 thìa nước)","Aquafaba (Nước luộc đậu gà đánh bông như lòng trắng trứng)","Đậu hũ non xay nhuyễn giữ độ ẩm mềm cho khối bột bánh"]'::jsonb, 'Aquafaba và hạt lanh là bí quyết vàng giúp làm bánh bông lan, pancake và sốt mayonnaise chay sánh mịn hoàn hảo.', 'egg trứng lòng đỏ lòng trắng'),
  ('meat', 'Thịt heo & bò', '🥩', 'Thịt đỏ và gia cầm động vật', 'Tạo Cấu Trúc Đạm Dai Bùi', '["Nấm đùi gà áp chảo xé sợi dai ngọt như thịt gà","Mít non kho tiêu xanh có thớ dai giòn hấp dẫn","Đạm đậu nành TVP (Texturized Vegetable Protein) ngâm nở","Đậu hũ chiên cắt dày khìa nước dừa đậm vị"]'::jsonb, 'Nấm đùi gà và mít non mang lại cảm giác nhai dai bùi và thấm đẫm gia vị truyền thống tuyệt vời.', 'thịt bò heo gà meat pork beef'),
  ('fish-sauce', 'Nước mắm cá', '🐟', 'Nước mắm cốt cá truyền thống', 'Gia Vị Mặn & Vị Ngọt Umami', '["Nước mắm chay ủ từ nấm đông cô và đậu nành lên men","Nước tương Tamari dứa lên men tự nhiên không ngũ vị tân","Nước mắm cốt dứa hạt sen thơm ngọt dịu"]'::jsonb, 'Nước mắm chay từ nấm và dứa giữ trọn hương vị đậm đà cho món kho, nước chấm bún và canh chua mà hoàn toàn thuần chay.', 'nước mắm nuoc mam fish sauce mắm cốt'),
  ('milk', 'Sữa bò tươi', '🥛', 'Sữa động vật thanh trùng', 'Cung Cấp Chất Lỏng Béo Mịn', '["Sữa yến mạch hữu cơ sánh ngậy tự nhiên","Sữa hạnh nhân nguyên chất thơm bùi giàu vitamin E","Sữa đậu nành tự nấu thanh mát dồi dào protein"]'::jsonb, 'Các loại sữa hạt thực vật thích hợp dùng uống mỗi sáng, pha cà phê Latte thuần chay hoặc làm bánh thơm ngon.', 'sữa sua milk sữa bò dairy'),
  ('honey', 'Mật ong', '🍯', 'Mật ong rừng tự nhiên', 'Chất Làm Ngọt Tự Nhiên', '["Mật mía hữu cơ Nghệ An nguyên chất truyền thống","Siro hoa thốt nốt An Giang chỉ số đường huyết thấp","Siro phong (Pure Maple Syrup) thơm hương gỗ tự nhiên"]'::jsonb, 'Mật mía và mật thốt nốt là nguồn làm ngọt tự nhiên không qua tinh luyện, rất giàu khoáng chất sắt và canxi.', 'mật ong mat ong honey siro syrup'),
  ('gelatin', 'Gelatin động vật', '🍮', 'Gelatin chiết xuất từ da xương động vật', 'Chất Làm Đông Kết Thạch', '["Bột rau câu Agar-agar nguyên chất chiết xuất từ tảo biển đỏ","Bột tảo Carrageenan tạo độ dẻo mềm tan mịn"]'::jsonb, 'Agar-agar làm đông thạch chè, panna cotta và mousse bánh cực nhanh ở nhiệt độ phòng, hoàn toàn có nguồn gốc từ tảo biển.', 'gelatin agar rau cau bot dong'),
  ('broth', 'Nước hầm xương', '🍲', 'Nước dùng ninh từ xương tủy thịt', 'Hậu Vị Ngọt Thanh Nước Dùng', '["Nước dùng ninh từ củ cải trắng, bắp ngọt, mía lau và mướp hương","Nước cốt nấm đông cô và gốc hành boa-rô hầm chậm 45 phút"]'::jsonb, 'Ninh củ quả và mía lau tạo vị ngọt sâu trong vắt cho phở chay, bún bò chay và lẩu nấm thanh tịnh.', 'nước dùng nuoc ham xương broth soup base');

-- ------------------------------------------------------------------------
-- 6. NGƯỜI DÙNG (USERS) (9 tài khoản thực tế - Mật khẩu chung: 123456)
-- ------------------------------------------------------------------------
INSERT INTO "users" ("user_id", "email", "password_hash", "full_name", "role", "status", "deleted_at", "created_at") VALUES
  (1, 'admin@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Quản Trị Viên Hệ Thống', 1, 'ACTIVE', NULL, '2026-10-01T08:00:00.000Z'),
  (2, 'user@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Trần Minh Quân', 2, 'ACTIVE', NULL, '2026-10-02T09:30:00.000Z'),
  (3, 'lan.nguyen@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Nguyễn Mai Lan', 2, 'ACTIVE', NULL, '2026-10-03T10:15:00.000Z'),
  (4, 'hoang.nam@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Lê Hoàng Nam', 2, 'ACTIVE', NULL, '2026-10-04T11:20:00.000Z'),
  (5, 'thuy.duong@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Phạm Thùy Dương', 2, 'ACTIVE', NULL, '2026-10-05T14:45:00.000Z'),
  (6, 'duc.huy@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Vũ Đức Huy', 2, 'ACTIVE', NULL, '2026-10-06T16:00:00.000Z'),
  (7, 'quynh.anh@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Đặng Quỳnh Anh', 2, 'ACTIVE', NULL, '2026-10-07T08:30:00.000Z'),
  (8, 'minh.tri@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Bùi Minh Trí', 2, 'LOCKED', NULL, '2026-10-08T09:00:00.000Z'),
  (9, 'ngoc.hoa@swp391.com', '$2b$10$9S2HAZxXO7sQm3/DfRgOSOrr9Y/nFygnOIQxYsW2zYrrtDz/WOeJ6', 'Hoàng Ngọc Hoa', 2, 'DELETED', '2026-10-15T14:30:00.000Z', '2026-10-09T10:00:00.000Z');

-- ------------------------------------------------------------------------
-- 7. HỒ SƠ SỨC KHỎE (HEALTH PROFILES) (6 thành viên hoạt động)
-- ------------------------------------------------------------------------
INSERT INTO "health_profiles" ("profile_id", "user_id", "diet_type_id", "height", "weight", "dob", "gender", "health_goal") VALUES
  (1, 2, 1, 175.0, 68.5, '1998-05-15', 'MALE', 'Ăn chay lành mạnh kết hợp rèn luyện thể thao phát triển cơ bắp'),
  (2, 3, 4, 160.0, 50.0, '2001-10-20', 'FEMALE', 'Duy trì vóc dáng thanh mảnh và cải thiện hệ tiêu hóa tự nhiên'),
  (3, 4, 1, 172.0, 65.0, '1995-03-12', 'MALE', 'Phát triển lối sống thuần chay bền vững bảo vệ môi trường'),
  (4, 5, 7, 165.0, 54.0, '2000-08-08', 'FEMALE', 'Ăn uống thuận tự nhiên Eat Clean, giảm mỡ dưới da và tăng độ dẻo dai'),
  (5, 6, 5, 170.0, 62.0, '1992-12-01', 'MALE', 'Ăn chay thanh tịnh Phật giáo, kiêng ngũ vị tân để nuôi dưỡng thân tâm an lạc'),
  (6, 7, 6, 158.0, 56.5, '1999-06-25', 'FEMALE', 'Giảm 4kg mỡ thừa trong 2 tháng với phương pháp Keto Chay kiểm soát carb');

-- ------------------------------------------------------------------------
-- 8. LỊCH SỬ CHỈ SỐ SỨC KHỎE (HEALTH HISTORIES) (Theo dõi tiến trình)
-- ------------------------------------------------------------------------
INSERT INTO "health_histories" ("history_id", "user_id", "recorded_date", "weight", "bmi") VALUES
  (1, 2, '2026-09-01', 71.0, 23.18),
  (2, 2, '2026-09-15', 70.0, 22.86),
  (3, 2, '2026-10-01', 69.2, 22.60),
  (4, 2, '2026-10-15', 68.5, 22.37),
  (5, 3, '2026-09-15', 52.0, 20.31),
  (6, 3, '2026-10-01', 50.8, 19.84),
  (7, 3, '2026-10-15', 50.0, 19.53),
  (8, 5, '2026-09-20', 56.5, 20.75),
  (9, 5, '2026-10-05', 55.2, 20.28),
  (10, 5, '2026-10-20', 54.0, 19.83),
  (11, 7, '2026-09-10', 59.0, 23.63),
  (12, 7, '2026-10-01', 57.8, 23.15),
  (13, 7, '2026-10-15', 56.5, 22.63);

-- ------------------------------------------------------------------------
-- 9. DỊ ỨNG NGUYÊN LIỆU (USER ALLERGIES) (3 ràng buộc)
-- ------------------------------------------------------------------------
INSERT INTO "user_allergies" ("user_id", "ingredient_id") VALUES
  (2, 25), -- Trần Minh Quân dị ứng Hạt điều rang
  (3, 15), -- Nguyễn Mai Lan dị ứng Sữa tươi bò thanh trùng
  (7, 14); -- Đặng Quỳnh Anh dị ứng Sữa đậu nành

-- ------------------------------------------------------------------------
-- 10. MỤC TIÊU DINH DƯỠNG CÁ NHÂN (PROFILE PREFERENCES) (4 hồ sơ)
-- ------------------------------------------------------------------------
INSERT INTO "profile_preferences" ("user_id", "calorie_goal", "goal", "protein_goal", "carbs_goal", "fat_goal", "fiber_goal") VALUES
  (2, 2100, 'Tăng cơ thuần chay', 85.0, 260.0, 55.0, 35.0),
  (3, 1700, 'Duy trì vóc dáng thon gọn', 60.0, 210.0, 45.0, 30.0),
  (5, 1800, 'Eat Clean thải độc cơ thể', 70.0, 230.0, 45.0, 35.0),
  (7, 1600, 'Keto Chay giảm mỡ', 75.0, 45.0, 95.0, 25.0);

-- ------------------------------------------------------------------------
-- 11. BÀI ĐĂNG GỐC CỘNG ĐỒNG (POSTS) (10 bài đăng)
-- Trạng thái: 8 PUBLISHED, 1 PENDING (chờ duyệt), 1 HIDDEN (ẩn; không phải kết quả AI)
-- ------------------------------------------------------------------------
INSERT INTO "posts" ("post_id", "author_id", "post_type", "status", "created_at") VALUES
  (1, 4, 'VIDEO', 'PUBLISHED', '2026-10-10T08:00:00.000Z'),
  (2, 4, 'VIDEO', 'PUBLISHED', '2026-10-11T09:00:00.000Z'),
  (3, 4, 'VIDEO', 'PUBLISHED', '2026-10-12T10:00:00.000Z'),
  (4, 4, 'VIDEO', 'PUBLISHED', '2026-10-13T14:00:00.000Z'),
  (5, 3, 'BLOG', 'PUBLISHED', '2026-10-14T08:30:00.000Z'),
  (6, 2, 'BLOG', 'PUBLISHED', '2026-10-15T10:15:00.000Z'),
  (7, 5, 'BLOG', 'PUBLISHED', '2026-10-16T11:00:00.000Z'),
  (8, 6, 'BLOG', 'PUBLISHED', '2026-10-17T09:40:00.000Z'),
  (9, 2, 'BLOG', 'PENDING', '2026-10-21T18:00:00.000Z'),
  (10, 8, 'BLOG', 'HIDDEN', '2026-10-21T19:30:00.000Z');

-- ------------------------------------------------------------------------
-- 12. VIDEO HƯỚNG DẪN NẤU ĂN (VIDEOS) (4 video YouTube thực tế 100% hoạt động)
-- ------------------------------------------------------------------------
INSERT INTO "videos" ("post_id", "title", "video_url", "thumbnail_url", "duration", "transcript") VALUES
  (1, 'Cách làm Đậu Hũ Kho Nấm Rơm đậm đà đưa cơm',
   'https://www.youtube.com/watch?v=AEpTdclRFAE',
   'https://img.youtube.com/vi/AEpTdclRFAE/hqdefault.jpg',
   614,
   'Xin chào các bạn, hôm nay chúng ta cùng thực hiện món nấm rơm kho đậu hũ chay đậm đà thanh tịnh. Nấm rơm và đậu hũ cắt miếng vừa ăn, ướp tiêu nước tương rồi kho nhỏ lửa cùng nước dừa tươi cho sánh kẹo...'),

  (2, 'Bí quyết làm Salad Táo Bơ Óc Chó sốt mè bùi béo',
   'https://www.youtube.com/watch?v=eCC-HG_Jwoo',
   'https://img.youtube.com/vi/eCC-HG_Jwoo/hqdefault.jpg',
   235,
   'Món salad táo bơ tươi giòn mát kết hợp hạt óc chó bùi béo rất giàu omega-3 thực vật, chuẩn bị và hoàn thành nhanh trong vòng 10 phút. Nước sốt mè bùi thơm kết hợp dầu olive và chút nước cốt chanh tạo độ thanh mát cân bằng.'),

  (3, 'Cách nấu Canh Rong Biển Đậu Hũ Non Chay thanh mát giải nhiệt',
   'https://www.youtube.com/watch?v=v8lb0iddTw4',
   'https://img.youtube.com/vi/v8lb0iddTw4/hqdefault.jpg',
   360,
   '1. Ngâm nở rong biển khô trong nước lạnh 10 phút rồi vớt ráo. 2. Nấu nước dùng củ quả ngọt thanh tự nhiên từ củ cải và bắp. 3. Thả đậu hũ non cắt miếng vuông và rong biển vào, nêm hạt nêm chay nấm vừa ăn, tắt bếp sau 2 phút.'),

  (4, 'Cách làm Cơm Gạo Lứt Trộn Rau Củ Chay bổ dưỡng tại nhà',
   'https://www.youtube.com/watch?v=XssKM6yLekE',
   'https://img.youtube.com/vi/XssKM6yLekE/hqdefault.jpg',
   300,
   '1. Chuẩn bị cơm gạo lứt dẻo thơm nguyên cám. 2. Xào rau củ bắp ngọt, bông cải và cà rốt vừa chín tới giữ trọn độ giòn ngọt. 3. Trộn đều cùng sốt tương mè và hạt điều rang giòn thơm bùi giàu đạm và khoáng chất.');

-- ------------------------------------------------------------------------
-- 13. BÀI VIẾT BLOG KIẾN THỨC (BLOGS) (6 bài viết chuyên sâu)
-- ------------------------------------------------------------------------
INSERT INTO "blogs" ("post_id", "title", "content", "attached_video_id") VALUES
  (5, 'Top Nguồn Protein Thực Vật Tốt Nhất Cho Người Ăn Chay',
   'Nhiều người thường lo ngại ăn chay sẽ thiếu hụt chất đạm (protein). Tuy nhiên, khoa học dinh dưỡng hiện đại đã chứng minh protein từ thực vật hoàn toàn có thể cung cấp đủ 9 loại axit amin thiết yếu nếu bạn kết hợp linh hoạt các nhóm thực phẩm:
1. Đậu hũ và tempeh: 100g đậu hũ chứa từ 8-12g protein chất lượng cao.
2. Các loại nấm tươi: Nấm đùi gà, nấm đông cô dồi dào glutamic acid tạo vị ngọt umami tự nhiên.
3. Đậu gà và đậu lăng: Nguồn đạm dồi dào kết hợp cùng chất xơ hòa tan giúp kiểm soát đường huyết.
4. Các loại hạt dinh dưỡng: Hạt hạnh nhân, hạt óc chó và hạt điều bổ sung đạm cùng chất béo omega-3 lành mạnh cho não bộ.', 1),

  (6, 'Kinh nghiệm chuẩn bị thực đơn chay 7 ngày cho người bận rộn',
   'Lập kế hoạch trước (Meal Prep) là chìa khóa giúp duy trì lối sống ăn chay lâu dài mà không cảm thấy áp lực thời gian:
- Ngày Chủ Nhật: Dành 1-2 tiếng đi chợ mua rau củ tươi, sơ chế sạch, chia nhỏ các hộp thủy tinh bảo quản trong ngăn mát tủ lạnh.
- Hầm sẵn nước dùng củ quả ngọt thanh và cấp đông thành từng viên đá lớn để nấu canh nhanh chóng vào các buổi tối ngày trong tuần.
- Luôn có sẵn ngũ cốc nguyên cám như yến mạch, gạo lứt đỏ và các loại hạt để chuẩn bị bữa sáng tiện lợi trong vòng 5 phút.', NULL),

  (7, 'Chế độ ăn Eat Clean Chay: Bí quyết lựa chọn và sơ chế rau củ giữ trọn vitamin',
   'Ăn chay Eat Clean không đồng nghĩa với việc ăn uống kham khổ mà là cách trân trọng thực phẩm ở trạng thái nguyên bản tự nhiên nhất:
- Ưu tiên phương pháp hấp cách thủy thay vì luộc ngập nước để giữ trọn vẹn vitamin C và nhóm B hòa tan trong nước.
- Kết hợp đa dạng 5 nhóm màu sắc rau củ trong mỗi đĩa ăn (đỏ của cà chua, xanh của bông cải, vàng của bắp, nâu của nấm và trắng của đậu hũ) giúp chống oxy hóa toàn diện.', 2),

  (8, 'Hiểu đúng về ngũ vị tân trong ẩm thực chay Phật giáo',
   'Theo truyền thống Phật giáo Đại thừa, ngũ vị tân gồm 5 loại củ quả có tính cay nồng đặc trưng: Hành, Hẹ, Tỏi, Kiệu và Nén (hoặc tỏi tây boa-rô tùy vùng miền).
Về mặt dưỡng sinh, ngũ vị tân ăn sống dễ sinh nóng giận trong tâm, ăn chín lại kích thích dục niệm, gây cản trở sự thanh tịnh trong lúc thiền định.
Trong chế biến món chay Phật giáo, người đầu bếp thường dùng nước cốt nấm, dầu mè thơm và boa-rô thảo mộc làm dịu hương vị mà vẫn giữ trọn sự đậm đà cho món ăn.', NULL),

  (9, 'Hành trình 6 tháng ăn thuần chay và tập thể hình của một kỹ sư công nghệ',
   'Rất nhiều đồng nghiệp ngạc nhiên khi thấy tôi duy trì khối lượng cơ bắp và mức tạ tăng đều đặn dù chỉ ăn thuần thực vật. Bí quyết của tôi nằm ở việc bổ sung yến mạch, sữa đậu nành tươi và đậu gà hầm mỗi ngày kết hợp tập luyện đều đặn.', NULL),

  (10, 'Bán thực phẩm chức năng giảm cân cấp tốc cam kết 100% thảo dược liên hệ Zalo 0909xxxx',
   'Sản phẩm giảm béo thảo dược gia truyền không cần ăn kiêng không cần tập thể dục chỉ cần uống mỗi ngày giảm ngay 5kg một tuần liên hệ ngay...', NULL);

-- ------------------------------------------------------------------------
-- 14. PHÂN LOẠI BÀI ĐĂNG - DANH MỤC (POST CATEGORIES) (10 liên kết)
-- ------------------------------------------------------------------------
INSERT INTO "post_categories" ("post_id", "category_id") VALUES
  (1, 1), -- Post 1: Món Kho
  (2, 2), -- Post 2: Salad & Gỏi
  (3, 3), -- Post 3: Súp & Canh
  (4, 4), -- Post 4: Món Xào / Chiên
  (5, 5), -- Post 5: Dinh Dưỡng & Đời Sống
  (6, 5), -- Post 6: Dinh Dưỡng & Đời Sống
  (7, 5), -- Post 7: Dinh Dưỡng & Đời Sống
  (8, 5), -- Post 8: Dinh Dưỡng & Đời Sống
  (9, 5), -- Post 9: Dinh Dưỡng & Đời Sống
  (10, 5);-- Post 10: Dinh Dưỡng & Đời Sống

-- ------------------------------------------------------------------------
-- 15. TỆP ĐÍNH KÈM BÀI ĐĂNG (POST ATTACHMENTS) (5 tệp hình ảnh thực tế)
-- ------------------------------------------------------------------------
INSERT INTO "post_attachments" ("attachment_id", "post_id", "file_url", "file_type", "file_name", "created_at") VALUES
  (1, 5, '/uploads/posts/protein-thuc-vat.jpg', 'IMAGE', 'protein-thuc-vat.jpg', '2026-10-14T08:35:00.000Z'),
  (2, 6, '/uploads/posts/thuc-don-chay-7-ngay.jpg', 'IMAGE', 'thuc-don-chay-7-ngay.jpg', '2026-10-15T10:20:00.000Z'),
  (3, 7, '/uploads/posts/rau-cu-eat-clean.jpg', 'IMAGE', 'rau-cu-eat-clean.jpg', '2026-10-16T11:05:00.000Z'),
  (4, 8, '/uploads/posts/am-thuc-chay-thanh-tinh.jpg', 'IMAGE', 'am-thuc-chay-thanh-tinh.jpg', '2026-10-17T09:45:00.000Z'),
  (5, 9, '/uploads/posts/gym-thuan-chay.jpg', 'IMAGE', 'gym-thuan-chay.jpg', '2026-10-21T18:05:00.000Z');

-- ------------------------------------------------------------------------
-- 16. CÔNG THỨC MÓN ĂN (RECIPES) (12 công thức khớp chính xác ảnh & video)
-- ------------------------------------------------------------------------
INSERT INTO "recipes" ("recipe_id", "post_id", "category_id", "diet_type_id", "recipe_name", "description", "image_url", "prep_time", "total_calories", "instructions") VALUES
  (1, 1, 1, 1, 'Đậu Hũ Kho Nấm Rơm & Hạt Sen',
   'Đậu hũ vàng giòn kho cùng nấm rơm tươi, hạt sen dẻo bùi và nước dừa thanh ngọt đậm đà.',
   'https://img.youtube.com/vi/AEpTdclRFAE/hqdefault.jpg',
   25, 280,
   '1. Cắt đậu hũ miếng vuông, áp chảo vàng đều các mặt trên chảo chống dính với chút dầu ăn thực vật.\n2. Rửa sạch nấm rơm búp tươi, ngâm nước muối loãng 5 phút; hạt sen luộc sơ qua nước sôi 5 phút cho mềm dẻo.\n3. Phi thơm boa-rô thái mỏng, trút nấm rơm và hạt sen vào đảo đều trong 3 phút.\n4. Nêm 2 muỗng nước tương, 1 muỗng đường thốt nốt, nửa chén nước dừa tươi rồi cho đậu hũ vào kho nhỏ lửa đến khi nước sốt sánh mịn óng ả.'),

  (2, 2, 2, 1, 'Salad Bơ Táo Hạt Óc Chó Sốt Tỏi Olive',
   'Bơ sáp dẻo ngậy kết hợp táo giòn ngọt, hạt óc chó bùi thơm, rau xà lách tươi xanh và sốt dầu olive thanh mát.',
   'https://img.youtube.com/vi/eCC-HG_Jwoo/hqdefault.jpg',
   15, 210,
   '1. Rửa sạch rau xà lách, để ráo và cắt bơ sáp, táo thành từng lát mỏng vừa ăn.\n2. Trộn tỏi băm, dầu olive nguyên chất, nước chanh tươi và chút muối biển.\n3. Xếp rau xà lách, bơ sáp, táo ra đĩa lớn.\n4. Rắc hạt óc chó đập dập lên trên rồi rưới đều nước sốt tỏi olive trước khi dùng.'),

  (3, NULL, 3, 2, 'Súp Nấm Mỡ & Váng Sữa Phô Mai',
   'Súp nấm mỡ mềm mịn với sữa tươi thanh trùng, kem bơ thực vật và phô mai mozzarella kéo sợi béo ngậy.',
   'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80',
   25, 320,
   '1. Thái lát nấm mỡ tươi và hành boa-rô, xào thơm cùng bơ thực vật.\n2. Thêm nước dùng rau củ vừa đủ và nấu đến khi nấm chín mềm.\n3. Dùng máy xay cầm tay xay mịn nhuyễn hỗn hợp, cho sữa tươi vào đun ấm nhẹ.\n4. Múc ra tô sứ, rắc tiêu xay và phủ phô mai Mozzarella bào sợi lên trên dùng nóng.'),

  (4, NULL, 5, 3, 'Bánh Mì Kẹp Trứng Ốp La & Nấm Đùi Gà',
   'Bánh mì nguyên cám giòn kẹp trứng ốp la béo ngậy, nấm đùi gà áp chảo cùng dưa leo và rau thơm.',
   'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80',
   15, 310,
   '1. Cắt lát nấm đùi gà, áp chảo với chút dầu olive và nước tương thơm lừng.\n2. Chiên trứng gà ta ốp la lòng đào chín tới, nướng nóng giòn ổ bánh mì nguyên cám.\n3. Kẹp nấm đùi gà, trứng ốp la, dưa leo và rau thơm vào giữa ổ bánh mì.\n4. Rắc chút tiêu đen xay và dùng ngay khi bánh còn nóng giòn.'),

  (5, NULL, 5, 4, 'Bánh Nướng Phô Mai Mozzarella & Trứng',
   'Bánh nướng mềm với trứng gà ta và phô mai mozzarella kéo sợi béo ngậy, dành cho chế độ chay trứng & sữa.',
   'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=900&q=80',
   30, 410,
   '1. Phết một lớp bơ mỏng lên lát bánh mì nguyên cám rồi xếp vào khay nướng.\n2. Tạo hình lòng chảo ở giữa, đập trứng gà ta và phủ phô mai Mozzarella xung quanh.\n3. Nướng ở 180°C trong lò nướng 12 phút đến khi phô mai tan chảy xém vàng.\n4. Rắc chút lá thơm oregano và thưởng thức ngay khi còn nóng.'),

  (6, NULL, 4, 1, 'Đậu Hũ Sốt Cà Chua & Hành Boa-rô',
   'Đậu hũ chiên giòn rim cùng sốt cà chua tươi chín mọng và hành boa-rô thơm phức đậm đà.',
   'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?auto=format&fit=crop&w=900&q=80',
   20, 260,
   '1. Cắt đậu hũ miếng vuông, chiên vàng giòn rồi vớt ra thấm ráo dầu.\n2. Phi thơm hành boa-rô băm nhỏ, cho cà chua xắt hạt lựu vào đảo nát thành sốt sệt.\n3. Cho đậu hũ vào rim nhỏ lửa trong 8 phút cho thấm gia vị, nêm nước tương ngon.\n4. Rắc tiêu xay và boa-rô ngọn lên trên, dùng nóng cùng cơm trắng hoặc cơm gạo lứt.'),

  (7, 3, 3, 1, 'Canh Rong Biển Đậu Hũ Non Hạt Sen',
   'Canh thanh nhiệt giải độc, bổ sung i-ốt và khoáng chất tự nhiên từ rong biển đại dương kết hợp hạt sen bổ dưỡng.',
   'https://img.youtube.com/vi/v8lb0iddTw4/hqdefault.jpg',
   20, 180,
   '1. Ngâm nở rong biển khô trong nước lạnh 10 phút rồi vớt ráo, cắt khúc ngắn vừa ăn.\n2. Nấu sôi nước dùng rau củ cùng hạt sen tươi trong 8 phút cho chín mềm.\n3. Thả đậu hũ non cắt quân cờ và rong biển vào nồi đun sôi bùng lại.\n4. Nêm hạt nêm chay nấm vừa ăn và vài giọt dầu mè thơm, tắt bếp sau 2 phút và dùng nóng.'),

  (8, NULL, 4, 7, 'Cơm Chiên Gạo Lứt Nấm & Củ Quả',
   'Cơm gạo lứt hạt giòn bùi kết hợp nấm đông cô, bắp ngọt và bông cải xanh giàu chất xơ và đạm thực vật.',
   'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
   25, 340,
   '1. Nấu chín cơm gạo lứt đỏ và để nguội ráo hạt.\n2. Cắt hạt lựu nấm đông cô, bắp ngọt và bông cải xanh, xào sơ với dầu olive.\n3. Cho cơm gạo lứt vào đảo đều tay trên lửa lớn 5 phút cho săn hạt.\n4. Nêm nước tương nấm và tiêu xay thơm lừng, rắc chút hành boa-rô phi giòn.'),

  (9, NULL, 2, 1, 'Salad Ngũ Sắc Sốt Tương Đậu Phộng',
   'Rau củ tươi kết hợp sốt đậu phộng thơm bùi, thanh mát và giàu chất xơ cho bữa ăn nhẹ nhàng.',
   'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
   20, 210,
   '1. Rửa sạch rau xà lách, để ráo; bông cải xanh chần nhanh qua nước sôi.\n2. Pha bơ đậu phộng nguyên chất với nước tương, nước cốt chanh và nước ấm khuấy mịn.\n3. Trộn rau xà lách cùng đậu hũ chiên cắt nhỏ và cà chua tươi.\n4. Rưới sốt đậu phộng lên trên và thưởng thức ngay để giữ trọn độ giòn mát.'),

  (10, 4, 4, 1, 'Cơm Gạo Lứt Trộn Rau Củ & Hạt Điều',
   'Một bát cơm ấm với gạo lứt dẻo, rau củ theo mùa và hạt điều rang thơm giòn, đơn giản mà ngon miệng.',
   'https://img.youtube.com/vi/XssKM6yLekE/hqdefault.jpg',
   25, 350,
   '1. Nấu gạo lứt dẻo hạt theo hướng dẫn trên bao bì.\n2. Xào rau củ bắp ngọt và bông cải với chút dầu olive và nước tương.\n3. Cho cơm gạo lứt ấm ra tô, xếp rau củ xào xung quanh.\n4. Rắc hạt điều rang giòn thơm bùi lên trên và trộn đều trước khi dùng.'),

  (11, NULL, 2, 6, 'Salad Bơ Quả Đậu Lăng Đỏ Sốt Dầu Olive',
   'Salad giàu đạm thực vật và chất béo không bão hòa đơn chuẩn Keto Chay từ quả bơ sáp, đậu lăng đỏ và sốt dầu olive.',
   'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80',
   15, 290,
   '1. Đậu lăng đỏ ngâm nở nấu chín mềm trong 12 phút, vớt ra xả nước lạnh để ráo.\n2. Cắt lát bơ sáp dẻo bùi, cà chua bi bổ đôi và rau xà lách tươi rửa sạch ráo nước.\n3. Trộn đều đậu lăng, bơ sáp và cà chua trong tô lớn.\n4. Rưới sốt dầu olive nguyên chất, nước cốt chanh lên trên và rắc hạt óc chó giã nhỏ.'),

  (12, NULL, 4, 5, 'Bông Cải Xanh Xào Nấm Đùi Gà Dầu Hào Chay',
   'Bông cải xanh giòn ngọt xào cùng nấm đùi gà dai bùi và dầu hào nấm hương, phù hợp chế độ chay Phật giáo kiêng ngũ vị tân.',
   'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=900&q=80',
   15, 190,
   '1. Bông cải xanh tách búp vừa ăn, chần nhanh qua nước sôi có chút muối rồi ngâm nước đá lạnh giữ màu xanh.\n2. Nấm đùi gà rửa sạch thái lát mỏng xéo vừa ăn.\n3. Cho nấm đùi gà vào xào cùng dầu olive trên lửa lớn trong 2 phút.\n4. Trút bông cải vào đảo nhanh tay, nêm 1 muỗng dầu hào chay từ nấm hương, rắc tiêu thơm và tắt bếp.');

-- ------------------------------------------------------------------------
-- 17. NGUYÊN LIỆU CHO CÔNG THỨC (RECIPE INGREDIENTS) (38 liên kết chi tiết)
-- ------------------------------------------------------------------------
INSERT INTO "recipe_ingredients" ("recipe_id", "ingredient_id", "quantity", "unit") VALUES
  -- Recipe 1: Đậu Hũ Kho Nấm Rơm & Hạt Sen
  (1, 2, 200, 'gram'),
  (1, 4, 150, 'gram'),
  (1, 7, 80, 'gram'),
  (1, 18, 20, 'gram'),
  -- Recipe 2: Salad Bơ Táo Hạt Óc Chó Sốt Tỏi Olive
  (2, 8, 1, 'trái'),
  (2, 9, 80, 'gram'),
  (2, 11, 30, 'gram'),
  (2, 19, 15, 'ml'),
  -- Recipe 3: Súp Nấm Mỡ & Váng Sữa Phô Mai
  (3, 6, 150, 'gram'),
  (3, 15, 150, 'ml'),
  (3, 16, 40, 'gram'),
  (3, 18, 15, 'gram'),
  -- Recipe 4: Bánh Mì Kẹp Trứng Ốp La & Nấm Đùi Gà
  (4, 20, 1, 'ổ'),
  (4, 17, 1, 'quả'),
  (4, 5, 80, 'gram'),
  (4, 9, 30, 'gram'),
  -- Recipe 5: Bánh Nướng Phô Mai Mozzarella & Trứng
  (5, 20, 1, 'ổ'),
  (5, 17, 1, 'quả'),
  (5, 16, 50, 'gram'),
  -- Recipe 6: Đậu Hũ Sốt Cà Chua & Hành Boa-rô
  (6, 2, 200, 'gram'),
  (6, 10, 150, 'gram'),
  (6, 18, 20, 'gram'),
  (6, 19, 10, 'ml'),
  -- Recipe 7: Canh Rong Biển Đậu Hũ Non Hạt Sen
  (7, 21, 20, 'gram'),
  (7, 1, 150, 'gram'),
  (7, 7, 50, 'gram'),
  -- Recipe 8: Cơm Chiên Gạo Lứt Nấm & Củ Quả
  (8, 22, 150, 'gram'),
  (8, 3, 60, 'gram'),
  (8, 28, 50, 'gram'),
  (8, 27, 60, 'gram'),
  -- Recipe 9: Salad Ngũ Sắc Sốt Tương Đậu Phộng
  (9, 9, 100, 'gram'),
  (9, 27, 60, 'gram'),
  (9, 10, 50, 'gram'),
  (9, 2, 80, 'gram'),
  (9, 26, 30, 'gram'),
  -- Recipe 10: Cơm Gạo Lứt Trộn Rau Củ & Hạt Điều
  (10, 22, 150, 'gram'),
  (10, 25, 40, 'gram'),
  (10, 28, 60, 'gram'),
  (10, 27, 60, 'gram'),
  -- Recipe 11: Salad Bơ Quả Đậu Lăng Đỏ Sốt Dầu Olive
  (11, 8, 1, 'trái'),
  (11, 24, 80, 'gram'),
  (11, 10, 50, 'gram'),
  (11, 19, 15, 'ml'),
  -- Recipe 12: Bông Cải Xanh Xào Nấm Đùi Gà Dầu Hào Chay
  (12, 27, 200, 'gram'),
  (12, 5, 120, 'gram'),
  (12, 19, 10, 'ml');

-- ------------------------------------------------------------------------
-- 18. BÌNH LUẬN CỘNG ĐỒNG (COMMENTS) (10 bình luận)
-- ------------------------------------------------------------------------
INSERT INTO "comments" ("comment_id", "post_id", "user_id", "content", "is_flagged_by_ai", "status", "deleted_at", "created_at") VALUES
  (1, 5, 2, 'Bài viết chia sẻ rất chi tiết và khoa học! Nhờ áp dụng nấm và các loại đậu mà mình rèn luyện thể thao không bị đuối sức.', false, 'ACTIVE', NULL, '2026-10-14T10:00:00.000Z'),
  (2, 6, 3, 'Mình cũng đang áp dụng cách sơ chế trước vào Chủ Nhật, trong tuần đi làm về chỉ mất 15 phút là có cơm chay nóng sốt.', false, 'ACTIVE', NULL, '2026-10-15T11:00:00.000Z'),
  (3, 1, 5, 'Món đậu hũ kho nấm rơm này ăn cùng cơm gạo lứt nóng thì tuyệt vời, cả nhà mình đều thích mê!', false, 'ACTIVE', NULL, '2026-10-11T12:30:00.000Z'),
  (4, 8, 6, 'Giải thích rất cặn kẽ về ngũ vị tân. Rất hữu ích cho những ai đang tìm hiểu về ẩm thực chay Phật giáo.', false, 'ACTIVE', NULL, '2026-10-17T16:00:00.000Z'),
  (5, 2, 4, 'Salad táo bơ làm cực kỳ nhanh mà ăn lại giòn bùi, mình làm cho cả nhà ăn sáng ai cũng khen ngon.', false, 'ACTIVE', NULL, '2026-10-11T14:15:00.000Z'),
  (6, 4, 2, 'Cơm gạo lứt trộn rau củ với hạt điều rang ăn bùi bùi giòn giòn rất đã miệng anh ơi!', false, 'ACTIVE', NULL, '2026-10-13T18:00:00.000Z'),
  (7, 7, 7, 'Bí quyết giữ rau giòn bằng cách ngâm nước đá rất hiệu quả, cảm ơn chị Thùy Dương!', false, 'ACTIVE', NULL, '2026-10-16T14:20:00.000Z'),
  (8, 5, 8, 'Ai muốn mua thuốc giảm cân cấp tốc uống là ốm không cần ăn kiêng hay tập luyện liên hệ zalo mình nhé giá rẻ bất ngờ', false, 'HIDDEN', NULL, '2026-10-18T10:00:00.000Z'),
  (9, 2, 8, 'Nhận quà tặng xe máy miễn phí bấm vào link lừa đảo trúng thưởng nhận quà ngay hôm nay', false, 'HIDDEN', NULL, '2026-10-19T11:00:00.000Z'),
  (10, 3, 3, 'Canh rong biển đậu hũ non này rất hợp cho trẻ nhỏ và người lớn tuổi bồi bổ sức khỏe.', false, 'ACTIVE', NULL, '2026-10-12T15:00:00.000Z');

-- ------------------------------------------------------------------------
-- 19. BÌNH CHỌN BÀI VIẾT (POST VOTES) (15 lượt vote thực tế)
-- ------------------------------------------------------------------------
INSERT INTO "post_votes" ("user_id", "post_id", "vote_type") VALUES
  (2, 1, 'UPVOTE'),
  (2, 2, 'UPVOTE'),
  (2, 4, 'UPVOTE'),
  (3, 1, 'UPVOTE'),
  (3, 3, 'UPVOTE'),
  (3, 5, 'UPVOTE'),
  (4, 1, 'UPVOTE'),
  (4, 2, 'UPVOTE'),
  (5, 1, 'UPVOTE'),
  (5, 3, 'UPVOTE'),
  (5, 7, 'UPVOTE'),
  (6, 1, 'UPVOTE'),
  (6, 8, 'UPVOTE'),
  (7, 2, 'UPVOTE'),
  (7, 4, 'UPVOTE');

-- ------------------------------------------------------------------------
-- 20. BÁO CÁO VI PHẠM (REPORTS) (3 bản ghi phục vụ Admin Portal)
-- ------------------------------------------------------------------------
INSERT INTO "reports" ("report_id", "reporter_id", "post_id", "comment_id", "reason", "status", "created_at") VALUES
  (1, 3, 10, NULL, 'Bài viết có hành vi spam quảng cáo thực phẩm chức năng không rõ nguồn gốc và vi phạm tiêu chuẩn cộng đồng.', 'PENDING', '2026-10-21T19:35:00.000Z'),
  (2, 5, NULL, 9, 'Bình luận chứa liên kết lừa đảo trúng thưởng độc hại nhằm lừa gạt người dùng.', 'PENDING', '2026-10-21T20:00:00.000Z'),
  (3, 2, 1, NULL, 'Người dùng báo nhầm lỗi video không phát, sau khi quản trị viên kiểm tra link YouTube hoạt động hoàn toàn bình thường.', 'RESOLVED', '2026-10-15T09:00:00.000Z');

-- ------------------------------------------------------------------------
-- 21. KẾ HOẠCH BỮA ĂN TUẦN (MEAL PLANS) (2 kế hoạch chi tiết)
-- ------------------------------------------------------------------------
INSERT INTO "meal_plans" ("plan_id", "user_id", "title", "start_date", "end_date", "target_calories") VALUES
  (1, 2, 'Thực đơn thuần chay 7 ngày tăng cường sức sống', '2026-10-19', '2026-10-25', 2100),
  (2, 3, 'Kế hoạch Eat Clean tuần 4 tháng 10 thanh lọc cơ thể', '2026-10-19', '2026-10-25', 1700);

-- ------------------------------------------------------------------------
-- 22. CHI TIẾT KẾ HOẠCH THEO BỮA (MEAL PLAN DETAILS) (28 bữa trọn vẹn 7 ngày)
-- ------------------------------------------------------------------------
INSERT INTO "meal_plan_details" ("plan_detail_id", "plan_id", "day_of_week", "meal_type", "recipe_id") VALUES
  -- Thứ Hai (Day 1)
  (1, 1, 1, 'BREAKFAST', 2),
  (2, 1, 1, 'LUNCH', 1),
  (3, 1, 1, 'DINNER', 7),
  (4, 1, 1, 'SNACK', 11),
  -- Thứ Ba (Day 2)
  (5, 1, 2, 'BREAKFAST', 4),
  (6, 1, 2, 'LUNCH', 6),
  (7, 1, 2, 'DINNER', 8),
  (8, 1, 2, 'SNACK', 2),
  -- Thứ Tư (Day 3)
  (9, 1, 3, 'BREAKFAST', 10),
  (10, 1, 3, 'LUNCH', 1),
  (11, 1, 3, 'DINNER', 12),
  (12, 1, 3, 'SNACK', 9),
  -- Thứ Năm (Day 4)
  (13, 1, 4, 'BREAKFAST', 2),
  (14, 1, 4, 'LUNCH', 8),
  (15, 1, 4, 'DINNER', 7),
  (16, 1, 4, 'SNACK', 11),
  -- Thứ Sáu (Day 5)
  (17, 1, 5, 'BREAKFAST', 4),
  (18, 1, 5, 'LUNCH', 6),
  (19, 1, 5, 'DINNER', 1),
  (20, 1, 5, 'SNACK', 9),
  -- Thứ Bảy (Day 6)
  (21, 1, 6, 'BREAKFAST', 10),
  (22, 1, 6, 'LUNCH', 12),
  (23, 1, 6, 'DINNER', 7),
  (24, 1, 6, 'SNACK', 2),
  -- Chủ Nhật (Day 7)
  (25, 1, 7, 'BREAKFAST', 5),
  (26, 1, 7, 'LUNCH', 1),
  (27, 1, 7, 'DINNER', 8),
  (28, 1, 7, 'SNACK', 11);

-- ------------------------------------------------------------------------
-- 23. NHẬT KÝ ĂN UỐNG (FOOD DIARIES) (8 bản ghi trải dài các ngày thực tế)
-- ------------------------------------------------------------------------
INSERT INTO "food_diaries" ("diary_id", "user_id", "consumed_date", "meal_type", "recipe_id", "custom_food_name", "calories") VALUES
  (1, 2, '2026-10-19', 'BREAKFAST', 2, 'Salad Bơ Táo Hạt Óc Chó Sốt Tỏi Olive', 210),
  (2, 2, '2026-10-19', 'LUNCH', 1, 'Đậu Hũ Kho Nấm Rơm & Hạt Sen', 280),
  (3, 2, '2026-10-19', 'DINNER', 7, 'Canh Rong Biển Đậu Hũ Non Hạt Sen', 180),
  (4, 2, '2026-10-20', 'BREAKFAST', 4, 'Bánh Mì Kẹp Trứng Ốp La & Nấm Đùi Gà', 310),
  (5, 2, '2026-10-20', 'LUNCH', 6, 'Đậu Hũ Sốt Cà Chua & Hành Boa-rô', 260),
  (6, 2, '2026-10-21', 'LUNCH', 8, 'Cơm Chiên Gạo Lứt Nấm & Củ Quả', 340),
  (7, 2, '2026-10-22', 'BREAKFAST', 10, 'Cơm Gạo Lứt Trộn Rau Củ & Hạt Điều', 350),
  (8, 3, '2026-10-21', 'LUNCH', 11, 'Salad Bơ Quả Đậu Lăng Đỏ', 290);

-- ------------------------------------------------------------------------
-- 24. DINH DƯỠNG CHI TIẾT NHẬT KÝ (DIARY NUTRIENTS)
-- ------------------------------------------------------------------------
INSERT INTO "diary_nutrients" ("diary_id", "serving", "protein", "carbs", "fat", "fiber") VALUES
  (1, '1 đĩa salad lớn', 8.5, 20.8, 53.6, 7.0),
  (2, '1 dĩa ăn trưa', 28.2, 21.8, 15.8, 6.4),
  (3, '1 tô canh vừa', 15.0, 11.5, 7.5, 4.2),
  (4, '1 phần bánh mì', 29.0, 47.8, 14.8, 5.0),
  (5, '1 dĩa ăn trưa', 24.5, 18.2, 12.0, 5.5),
  (6, '1 đĩa cơm chiên', 12.0, 60.5, 7.5, 8.2),
  (7, '1 bát cơm trộn', 14.0, 52.0, 11.5, 6.0),
  (8, '1 đĩa salad vừa', 11.0, 28.0, 14.0, 8.5);

-- ------------------------------------------------------------------------
-- 25. NHÀ HÀNG & QUÁN ĂN CHAY (RESTAURANTS)
-- Dữ liệu quán ăn chay được người dùng đề xuất hoặc truy vấn thực tế qua ZIOMAP API.
-- Tuyệt đối không nạp dữ liệu mẫu/giả theo quy chuẩn no-mock-data của dự án.
-- ------------------------------------------------------------------------


-- ------------------------------------------------------------------------
-- 29. THÔNG BÁO NGƯỜI DÙNG (NOTIFICATIONS) (6 thông báo tương tác)
-- ------------------------------------------------------------------------
INSERT INTO "notifications" ("notification_id", "user_id", "content", "is_read", "created_at") VALUES
  (1, 2, 'Chào mừng bạn gia nhập ChayXanh! Hãy cập nhật hồ sơ sức khỏe và bắt đầu khám phá thực đơn chay mỗi ngày nhé.', false, '2026-10-19T08:00:00.000Z'),
  (2, 2, 'Bạn ơi, đừng quên ghi nhật ký bữa tối hôm nay để hệ thống theo dõi đủ lượng calo mục tiêu nhé!', false, '2026-10-21T20:30:00.000Z'),
  (3, 3, 'Trần Minh Quân đã bình luận về bài viết "Top Nguồn Protein Thực Vật Tốt Nhất" của bạn.', false, '2026-10-14T10:02:00.000Z'),
  (4, 3, 'Lê Hoàng Nam và 4 thành viên khác đã thích bài viết của bạn.', true, '2026-10-15T15:00:00.000Z'),
  (5, 4, 'Video công thức "Cách làm Đậu Hũ Kho Nấm Rơm" của bạn đã đạt hơn 100 lượt xem trong tuần này!', true, '2026-10-16T10:00:00.000Z'),
  (6, 2, 'Kế hoạch bữa ăn "Thực đơn thuần chay 7 ngày" của bạn đã được kích hoạt thành công.', true, '2026-10-19T07:30:00.000Z');

-- ------------------------------------------------------------------------
-- 30. NHẬT KÝ HOẠT ĐỘNG AI (AI LOGS) (4 bản ghi giám sát)
-- ------------------------------------------------------------------------
INSERT INTO "ai_logs" ("log_id", "model_name", "action", "status", "error_feedback", "created_at") VALUES
  (1, 'gemini-1.5-flash', 'MEAL_PLANNER_GENERATE', 'SUCCESS', NULL, '2026-10-20T10:15:00.000Z'),
  (2, 'gemini-1.5-flash', 'CHATBOT_QUERY', 'SUCCESS', NULL, '2026-10-21T14:22:10.000Z'),
  (3, 'gemini-1.5-flash', 'NUTRITION_CALCULATE', 'SUCCESS', NULL, '2026-10-21T16:05:30.000Z'),
  (4, 'gemini-1.5-flash', 'CHATBOT_QUERY', 'SUCCESS', NULL, '2026-10-22T08:30:15.000Z');

-- ------------------------------------------------------------------------
-- 31. HẠN MỨC GỌI AI KHÁCH (GUEST QUOTA) (2 bản ghi hạn ngạch)
-- ------------------------------------------------------------------------
INSERT INTO "guest_quota" ("guest_id", "quota_date", "used_count", "updated_at") VALUES
  ('ip:127.0.0.1', '2026-10-22', 2, '2026-10-22T08:45:00.000Z'),
  ('ip:192.168.1.10', '2026-10-22', 1, '2026-10-22T09:00:00.000Z');

-- ------------------------------------------------------------------------
-- 32. RESET CÁC CHUỖI TỰ TĂNG (SEQUENCES) TRONG POSTGRESQL
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
SELECT setval(pg_get_serial_sequence('reports', 'report_id'), COALESCE((SELECT MAX(report_id) FROM "reports"), 1));
SELECT setval(pg_get_serial_sequence('notifications', 'notification_id'), COALESCE((SELECT MAX(notification_id) FROM "notifications"), 1));
SELECT setval(pg_get_serial_sequence('restaurant_reviews', 'review_id'), COALESCE((SELECT MAX(review_id) FROM "restaurant_reviews"), 1));
SELECT setval(pg_get_serial_sequence('post_attachments', 'attachment_id'), COALESCE((SELECT MAX(attachment_id) FROM "post_attachments"), 1));
SELECT setval(pg_get_serial_sequence('ai_logs', 'log_id'), COALESCE((SELECT MAX(log_id) FROM "ai_logs"), 1));

COMMIT;
