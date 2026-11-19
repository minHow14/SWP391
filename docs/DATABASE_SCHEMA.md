# Từ điển Cơ sở Dữ liệu & Danh mục Bảng Hệ thống (Database Schema & Data Dictionary)

> **Dự án:** Healthy Food Community & AI Diet Assistant (SWP391)
> **Hệ quản trị CSDL:** PostgreSQL 15+ (vận hành qua Prisma ORM v6.19.3)
> **Trạng thái:** Đã tối ưu hóa giảm 6 bảng 1:1 dư thừa (từ 41 bảng xuống 35 bảng vật lý)
> **Tài liệu liên quan:** [Sơ đồ ERD](ERD.md) · [Tích hợp AI](AI_INTEGRATION.md) · [Kiểm duyệt nội dung](CONTENT_MODERATION.md)

---

## 1. Tổng quan Kiến trúc Dữ liệu & Lịch sử Tối ưu hóa

Nhằm nâng cao hiệu năng truy vấn, loại bỏ các phép `JOIN` không cần thiết và chuẩn hóa mô hình dữ liệu quan hệ, hệ thống đã thực hiện **Gói 1: Tối ưu 6 bảng 1:1 dư thừa** (migration `20261119213000_consolidate_redundant_tables`).

| Bảng cũ (Đã Drop) | Bảng cha hợp nhất | Các cột tiếp nhận | Lợi ích tối ưu |
| :--- | :--- | :--- | :--- |
| `restaurant_details` | `restaurants` | `city`, `hours`, `price_range`, `separate_kitchen` | Giảm 1 JOIN khi tìm kiếm và hiển thị quán chay |
| `restaurant_menu_prices` | `restaurant_recipes` | `price` | Giảm 1 JOIN khi tải giá thực đơn món ăn |
| `diary_nutrients` | `food_diaries` | `serving`, `protein`, `carbs`, `fat`, `fiber` | Giảm 1 JOIN khi đọc nhật ký dinh dưỡng hàng ngày |
| `liquid_ingredient_densities` | `ingredients` | `density` | Giảm 1 JOIN khi tra cứu quy đổi thể tích (ml) sang gram |
| `profile_preferences` | `health_profiles` | `calorie_goal`, `goal`, `protein_goal`, `carbs_goal`, `fat_goal`, `fiber_goal` | Giảm 1 JOIN khi tính toán và hiển thị mục tiêu dinh dưỡng |
| `video_recipe_summaries` | `video_recipe_summary_jobs` | `recipe` (`JSONB`) | Gom trực tiếp kết quả trích xuất vào hàng đợi job tương ứng |

Toàn bộ dữ liệu lịch sử được chuyển đổi an toàn 100%, bảo toàn tính toàn vẹn và đảm bảo tương thích ngược hoàn toàn với API Frontend và AI Service.

---

## 2. Bảng Tổng hợp 35 Thực thể Dữ liệu (Master Entity Directory)

| STT | Tên bảng PostgreSQL | Prisma Model | Phân hệ nghiệp vụ | Số cột | Khóa chính (PK) |
| :---: | :--- | :--- | :--- | :---: | :--- |
| 1 | `users` | `User` | 1. Người dùng, Sức khỏe & Xác thực | 9 | `user_id` |
| 2 | `password_reset_otps` | `PasswordResetOtp` | 1. Người dùng, Sức khỏe & Xác thực | 10 | `id` |
| 3 | `password_reset_tokens` | `PasswordResetToken` | 1. Người dùng, Sức khỏe & Xác thực | 8 | `id` |
| 4 | `diet_types` | `DietType` | 1. Người dùng, Sức khỏe & Xác thực | 3 | `diet_type_id` |
| 5 | `health_profiles` | `HealthProfile` | 1. Người dùng, Sức khỏe & Xác thực | 14 | `profile_id` |
| 6 | `health_histories` | `HealthHistory` | 1. Người dùng, Sức khỏe & Xác thực | 5 | `history_id` |
| 7 | `user_allergies` | `UserAllergy` | 1. Người dùng, Sức khỏe & Xác thực | 2 | `Composite` |
| 8 | `categories` | `Category` | 2. Bài viết, Nội dung & Tương tác Cộng đồng | 2 | `category_id` |
| 9 | `posts` | `Post` | 2. Bài viết, Nội dung & Tương tác Cộng đồng | 8 | `post_id` |
| 10 | `videos` | `Video` | 2. Bài viết, Nội dung & Tương tác Cộng đồng | 6 | `post_id` |
| 11 | `blogs` | `Blog` | 2. Bài viết, Nội dung & Tương tác Cộng đồng | 4 | `post_id` |
| 12 | `post_categories` | `PostCategory` | 2. Bài viết, Nội dung & Tương tác Cộng đồng | 2 | `Composite` |
| 13 | `post_attachments` | `PostAttachment` | 2. Bài viết, Nội dung & Tương tác Cộng đồng | 6 | `attachment_id` |
| 14 | `comments` | `Comment` | 2. Bài viết, Nội dung & Tương tác Cộng đồng | 10 | `comment_id` |
| 15 | `post_votes` | `PostVote` | 2. Bài viết, Nội dung & Tương tác Cộng đồng | 3 | `Composite` |
| 16 | `ingredients` | `Ingredient` | 3. Nguyên liệu, Dinh dưỡng & Công thức | 8 | `ingredient_id` |
| 17 | `ingredient_details` | `IngredientDetails` | 3. Nguyên liệu, Dinh dưỡng & Công thức | 8 | `ingredient_id` |
| 18 | `ingredient_images` | `IngredientImage` | 3. Nguyên liệu, Dinh dưỡng & Công thức | 7 | `ingredient_id` |
| 19 | `ingredient_alternatives` | `IngredientAlternative` | 3. Nguyên liệu, Dinh dưỡng & Công thức | 8 | `id` |
| 20 | `recipes` | `Recipe` | 3. Nguyên liệu, Dinh dưỡng & Công thức | 10 | `recipe_id` |
| 21 | `recipe_ingredients` | `RecipeIngredient` | 3. Nguyên liệu, Dinh dưỡng & Công thức | 4 | `Composite` |
| 22 | `meal_plans` | `MealPlan` | 4. Thực đơn Tuần & Nhật ký Ăn uống | 6 | `plan_id` |
| 23 | `meal_plan_details` | `MealPlanDetail` | 4. Thực đơn Tuần & Nhật ký Ăn uống | 10 | `plan_detail_id` |
| 24 | `food_diaries` | `FoodDiary` | 4. Thực đơn Tuần & Nhật ký Ăn uống | 12 | `diary_id` |
| 25 | `restaurants` | `Restaurant` | 5. Quán ăn Chay, Địa điểm & Đánh giá | 19 | `restaurant_id` |
| 26 | `restaurant_recipes` | `RestaurantRecipe` | 5. Quán ăn Chay, Địa điểm & Đánh giá | 3 | `Composite` |
| 27 | `restaurant_reviews` | `RestaurantReview` | 5. Quán ăn Chay, Địa điểm & Đánh giá | 6 | `review_id` |
| 28 | `ai_generations` | `AiGeneration` | 6. Tác vụ Nền AI, Kiểm duyệt, Hạn mức & Báo cáo Hệ thống | 13 | `id` |
| 29 | `ai_logs` | `AiLog` | 6. Tác vụ Nền AI, Kiểm duyệt, Hạn mức & Báo cáo Hệ thống | 6 | `logId` |
| 30 | `content_moderation_jobs` | `ContentModerationJob` | 6. Tác vụ Nền AI, Kiểm duyệt, Hạn mức & Báo cáo Hệ thống | 20 | `id` |
| 31 | `video_recipe_summary_jobs` | `VideoRecipeSummaryJob` | 6. Tác vụ Nền AI, Kiểm duyệt, Hạn mức & Báo cáo Hệ thống | 20 | `id` |
| 32 | `ingredient_lookup_jobs` | `IngredientLookupJob` | 6. Tác vụ Nền AI, Kiểm duyệt, Hạn mức & Báo cáo Hệ thống | 16 | `id` |
| 33 | `guest_quota` | `GuestQuota` | 6. Tác vụ Nền AI, Kiểm duyệt, Hạn mức & Báo cáo Hệ thống | 5 | `Composite` |
| 34 | `reports` | `Report` | 6. Tác vụ Nền AI, Kiểm duyệt, Hạn mức & Báo cáo Hệ thống | 7 | `report_id` |
| 35 | `notifications` | `Notification` | 6. Tác vụ Nền AI, Kiểm duyệt, Hạn mức & Báo cáo Hệ thống | 5 | `notification_id` |

---

## 3. Đặc tả Chi tiết 35 Bảng Cơ sở Dữ liệu theo Phân hệ

### 1. Người dùng, Sức khỏe & Xác thực (User, Health & Auth)

#### `users` (Model: `User`)

- **Mô tả nghiệp vụ:** Lưu trữ thông tin tài khoản người dùng, vai trò (Admin/User), mật khẩu băm, phiên bản token (tokenVersion) để thu hồi phiên đăng nhập và hỗ trợ xóa mềm (soft delete).
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | `user_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `email` | `email` | `String (@db.VarChar(255))` | `UK`, NOT NULL | Địa chỉ email định danh đăng nhập |
| `password_hash` | `password_hash` | `String (@db.VarChar(255))` | NOT NULL | Thông tin nghiệp vụ |
| `token_version` | `tokenVersion` | `Int` | Default: `0`, NOT NULL | Thông tin nghiệp vụ |
| `full_name` | `full_name` | `String (@db.VarChar(255))` | NOT NULL | Thông tin nghiệp vụ |
| `role` | `role` | `Int (@db.SmallInt)` | Default: `2`, NOT NULL | Thông tin nghiệp vụ |
| `status` | `status` | `String (@db.VarChar(20))` | Default: `"ACTIVE"`, NOT NULL | Trạng thái hoạt động của thực thể |
| `deleted_at` | `deleted_at` | `DateTime? (@db.Timestamptz(6))` | Nullable | Thời điểm xóa mềm (soft delete) |
| `created_at` | `created_at` | `DateTime? (@db.Timestamptz(6))` | Default: `now(`, Nullable | Thời điểm bản ghi được tạo |

- **Mối quan hệ liên kết (Relationships):**
  - `comments`: Liên kết `Comment[]` ()
  - `contentModerationJobs`: Liên kết `ContentModerationJob[]` ()
  - `food_diaries`: Liên kết `FoodDiary[]` ()
  - `health_histories`: Liên kết `HealthHistory[]` ()
  - `health_profile`: Liên kết `HealthProfile?` ()
  - `meal_plans`: Liên kết `MealPlan[]` ()
  - `notifications`: Liên kết `Notification[]` ()
  - `votes`: Liên kết `PostVote[]` ()
  - `posts`: Liên kết `Post[]` ()
  - `reports`: Liên kết `Report[]` ()
  - `allergies`: Liên kết `UserAllergy[]` ()
  - `restaurant_reviews`: Liên kết `RestaurantReview[]` ()
  - `aiGenerations`: Liên kết `AiGeneration[]` ()
  - `videoRecipeSummaryJobs`: Liên kết `VideoRecipeSummaryJob[]` ()
  - `passwordResetTokens`: Liên kết `PasswordResetToken[]` ()
  - `passwordResetOtp`: Liên kết `PasswordResetOtp?` ()

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@index([email], map: "idx_users_email")`
  - `@@index([status, deleted_at], map: "idx_users_deleted_at")`
  - `@@map("users")`


#### `password_reset_otps` (Model: `PasswordResetOtp`)

- **Mô tả nghiệp vụ:** Quản lý mã xác thực OTP 6 số gửi qua email phục vụ đặt lại mật khẩu với giới hạn lượt thử (attempts) và thời gian sống (TTL).
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `id` | `String (@db.Uuid)` | `PK`, Default: `uuid(`, NOT NULL | Khóa chính định danh duy nhất |
| `user_id` | `userId` | `Int` | `UK`, NOT NULL | Khóa ngoại liên kết |
| `otp_hash` | `otpHash` | `String (@db.VarChar(64))` | NOT NULL | Thông tin nghiệp vụ |
| `token_version` | `tokenVersion` | `Int` | NOT NULL | Thông tin nghiệp vụ |
| `attempts` | `attempts` | `Int` | Default: `0`, NOT NULL | Thông tin nghiệp vụ |
| `expires_at` | `expiresAt` | `DateTime (@db.Timestamptz(6))` | NOT NULL | Thông tin nghiệp vụ |
| `last_sent_at` | `lastSentAt` | `DateTime (@db.Timestamptz(6))` | NOT NULL | Thông tin nghiệp vụ |
| `consumed_at` | `consumedAt` | `DateTime? (@db.Timestamptz(6))` | Nullable | Thông tin nghiệp vụ |
| `created_at` | `createdAt` | `DateTime (@db.Timestamptz(6))` | Default: `now(`, NOT NULL | Thời điểm bản ghi được tạo |
| `updated_at` | `updatedAt` | `DateTime (@db.Timestamptz(6))` | NOT NULL | Thời điểm cập nhật bản ghi gần nhất |

- **Mối quan hệ liên kết (Relationships):**
  - `user`: Liên kết `User` (@relation(fields: [userId], references: [user_id], onDelete: Cascade, onUpdate: Cascade))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@map("password_reset_otps")`


#### `password_reset_tokens` (Model: `PasswordResetToken`)

- **Mô tả nghiệp vụ:** Quản lý token ngẫu nhiên bảo mật 32-byte gửi qua liên kết email để khôi phục mật khẩu, kiểm tra khớp `tokenVersion`.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `id` | `String (@db.Uuid)` | `PK`, Default: `uuid(`, NOT NULL | Khóa chính định danh duy nhất |
| `user_id` | `userId` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `token_hash` | `tokenHash` | `String (@db.VarChar(64))` | `UK`, NOT NULL | Thông tin nghiệp vụ |
| `token_version` | `tokenVersion` | `Int` | NOT NULL | Thông tin nghiệp vụ |
| `expires_at` | `expiresAt` | `DateTime (@db.Timestamptz(6))` | NOT NULL | Thông tin nghiệp vụ |
| `consumed_at` | `consumedAt` | `DateTime? (@db.Timestamptz(6))` | Nullable | Thông tin nghiệp vụ |
| `created_at` | `createdAt` | `DateTime (@db.Timestamptz(6))` | Default: `now(`, NOT NULL | Thời điểm bản ghi được tạo |
| `updated_at` | `updatedAt` | `DateTime (@db.Timestamptz(6))` | NOT NULL | Thời điểm cập nhật bản ghi gần nhất |

- **Mối quan hệ liên kết (Relationships):**
  - `user`: Liên kết `User` (@relation(fields: [userId], references: [user_id], onDelete: Cascade, onUpdate: Cascade))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@index([userId, expiresAt], map: "idx_password_reset_tokens_user_expiry")`
  - `@@map("password_reset_tokens")`


#### `diet_types` (Model: `DietType`)

- **Mô tả nghiệp vụ:** Bảng danh mục các trường phái ăn chay hỗ trợ trong hệ thống (Thuần chay - Vegan, Chay có trứng/sữa - Lacto/Ovo, Ăn chay kỳ, v.v.).
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `diet_type_id` | `diet_type_id` | `Int (@db.SmallInt)` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `name` | `name` | `String (@db.VarChar(100))` | `UK`, NOT NULL | Thông tin nghiệp vụ |
| `description` | `description` | `String?` | Nullable | Thông tin nghiệp vụ |

- **Mối quan hệ liên kết (Relationships):**
  - `health_profiles`: Liên kết `HealthProfile[]` ()
  - `recipes`: Liên kết `Recipe[]` ()
  - `restaurants`: Liên kết `Restaurant[]` ()

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@map("diet_types")`


#### `health_profiles` (Model: `HealthProfile`)

- **Mô tả nghiệp vụ:** Hồ sơ sức khỏe và mục tiêu dinh dưỡng cá nhân của người dùng (chiều cao, cân nặng, ngày sinh, giới tính, mục tiêu calo, protein, carbs, fat, fiber).
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `profile_id` | `profile_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `user_id` | `user_id` | `Int` | `UK`, NOT NULL | Khóa ngoại liên kết |
| `diet_type_id` | `diet_type_id` | `Int? (@db.SmallInt)` | Nullable | Khóa ngoại liên kết |
| `height` | `height` | `Float? (@db.Real)` | Nullable | Thông tin nghiệp vụ |
| `weight` | `weight` | `Float? (@db.Real)` | Nullable | Thông tin nghiệp vụ |
| `dob` | `dob` | `DateTime? (@db.Date)` | Nullable | Thông tin nghiệp vụ |
| `gender` | `gender` | `String? (@db.VarChar(20))` | Nullable | Thông tin nghiệp vụ |
| `health_goal` | `health_goal` | `String? (@db.VarChar(255))` | Nullable | Thông tin nghiệp vụ |
| `calorie_goal` | `calorieGoal` | `Float? (@db.Real)` | Nullable | Thông tin nghiệp vụ |
| `goal` | `goal` | `String? (@db.VarChar(50))` | Nullable | Thông tin nghiệp vụ |
| `protein_goal` | `proteinGoal` | `Float? (@db.Real)` | Nullable | Thông tin nghiệp vụ |
| `carbs_goal` | `carbsGoal` | `Float? (@db.Real)` | Nullable | Thông tin nghiệp vụ |
| `fat_goal` | `fatGoal` | `Float? (@db.Real)` | Nullable | Thông tin nghiệp vụ |
| `fiber_goal` | `fiberGoal` | `Float? (@db.Real)` | Nullable | Thông tin nghiệp vụ |

- **Mối quan hệ liên kết (Relationships):**
  - `diet_type`: Liên kết `DietType?` (@relation(fields: [diet_type_id], references: [diet_type_id], onUpdate: NoAction))
  - `user`: Liên kết `User` (@relation(fields: [user_id], references: [user_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@map("health_profiles")`


#### `health_histories` (Model: `HealthHistory`)

- **Mô tả nghiệp vụ:** Lịch sử theo dõi biến động chỉ số thể trạng (cân nặng, BMI) của người dùng theo từng mốc thời gian.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `history_id` | `history_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `user_id` | `user_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `recorded_date` | `recorded_date` | `DateTime? (@db.Timestamptz(6))` | Default: `now(`, Nullable | Thông tin nghiệp vụ |
| `weight` | `weight` | `Float (@db.Real)` | NOT NULL | Thông tin nghiệp vụ |
| `bmi` | `bmi` | `Float? (@db.Real)` | Nullable | Thông tin nghiệp vụ |

- **Mối quan hệ liên kết (Relationships):**
  - `user`: Liên kết `User` (@relation(fields: [user_id], references: [user_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@map("health_histories")`


#### `user_allergies` (Model: `UserAllergy`)

- **Mô tả nghiệp vụ:** Bảng liên kết nhiều-nhiều (N-N) lưu danh sách các thành phần/nguyên liệu mà người dùng bị dị ứng để AI tự động lọc khi gợi ý thực đơn.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | `user_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `ingredient_id` | `ingredient_id` | `Int` | NOT NULL | Khóa ngoại liên kết |

- **Mối quan hệ liên kết (Relationships):**
  - `ingredient`: Liên kết `Ingredient` (@relation(fields: [ingredient_id], references: [ingredient_id], onDelete: Cascade, onUpdate: NoAction))
  - `user`: Liên kết `User` (@relation(fields: [user_id], references: [user_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@id([user_id, ingredient_id])`
  - `@@index([ingredient_id], map: "idx_user_allergies_ingredient")`
  - `@@map("user_allergies")`


### 2. Bài viết, Nội dung & Tương tác Cộng đồng (Content & Community)

#### `categories` (Model: `Category`)

- **Mô tả nghiệp vụ:** Danh mục phân loại bài viết và công thức nấu ăn (Món khai vị, Món chính, Món tráng miệng, Đồ uống, v.v.).
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `category_id` | `category_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `name` | `name` | `String (@db.VarChar(100))` | `UK`, NOT NULL | Thông tin nghiệp vụ |

- **Mối quan hệ liên kết (Relationships):**
  - `post_categories`: Liên kết `PostCategory[]` ()
  - `recipes`: Liên kết `Recipe[]` ()

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@map("categories")`


#### `posts` (Model: `Post`)

- **Mô tả nghiệp vụ:** Bảng cha đa hình quản lý bài đăng trên diễn đàn cộng đồng, phân loại thành dạng Video hoặc Blog, tích hợp phiên bản duyệt bài (`moderationVersion`).
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `post_id` | `post_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `author_id` | `author_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `post_type` | `post_type` | `String (@db.VarChar(20))` | NOT NULL | Thông tin nghiệp vụ |
| `status` | `status` | `String (@db.VarChar(30))` | Default: `"PUBLISHED"`, NOT NULL | Trạng thái hoạt động của thực thể |
| `status_before_account_deletion` | `statusBeforeAccountDeletion` | `String? (@db.VarChar(30))` | Nullable | Thông tin nghiệp vụ |
| `moderation_version` | `moderationVersion` | `Int` | Default: `0`, NOT NULL | Thông tin nghiệp vụ |
| `deleted_at` | `deleted_at` | `DateTime? (@db.Timestamptz(6))` | Nullable | Thời điểm xóa mềm (soft delete) |
| `created_at` | `created_at` | `DateTime? (@db.Timestamptz(6))` | Default: `now(`, Nullable | Thời điểm bản ghi được tạo |

- **Mối quan hệ liên kết (Relationships):**
  - `contentModerationJobs`: Liên kết `ContentModerationJob[]` ()
  - `blog`: Liên kết `Blog?` ()
  - `comments`: Liên kết `Comment[]` ()
  - `post_categories`: Liên kết `PostCategory[]` ()
  - `post_votes`: Liên kết `PostVote[]` ()
  - `author`: Liên kết `User` (@relation(fields: [author_id], references: [user_id], onDelete: Cascade, onUpdate: NoAction))
  - `recipe`: Liên kết `Recipe[]` ()
  - `reports`: Liên kết `Report[]` ()
  - `video`: Liên kết `Video?` ()
  - `attachments`: Liên kết `PostAttachment[]` ()

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@index([author_id], map: "idx_posts_author")`
  - `@@index([status], map: "idx_posts_status")`
  - `@@index([status, deleted_at], map: "idx_posts_deleted_at")`
  - `@@map("posts")`


#### `videos` (Model: `Video`)

- **Mô tả nghiệp vụ:** Mở rộng quan hệ 1-1 với Post lưu thông tin bài đăng dạng video (link YouTube, thời lượng, thumbnail, phụ đề transcript).
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `post_id` | `post_id` | `Int` | `PK`, NOT NULL | Khóa chính định danh duy nhất |
| `title` | `title` | `String (@db.VarChar(255))` | NOT NULL | Thông tin nghiệp vụ |
| `video_url` | `video_url` | `String (@db.VarChar(500))` | NOT NULL | Thông tin nghiệp vụ |
| `thumbnail_url` | `thumbnail_url` | `String? (@db.VarChar(500))` | Nullable | Thông tin nghiệp vụ |
| `duration` | `duration` | `Int?` | Default: `0`, Nullable | Thông tin nghiệp vụ |
| `transcript` | `transcript` | `String?` | Nullable | Thông tin nghiệp vụ |

- **Mối quan hệ liên kết (Relationships):**
  - `attached_in_blogs`: Liên kết `Blog[]` ()
  - `post`: Liên kết `Post` (@relation(fields: [post_id], references: [post_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@map("videos")`


#### `blogs` (Model: `Blog`)

- **Mô tả nghiệp vụ:** Mở rộng quan hệ 1-1 với Post lưu bài viết dạng văn bản giàu nội dung (HTML/Markdown content, liên kết video kèm theo).
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `post_id` | `post_id` | `Int` | `PK`, NOT NULL | Khóa chính định danh duy nhất |
| `title` | `title` | `String (@db.VarChar(255))` | NOT NULL | Thông tin nghiệp vụ |
| `content` | `content` | `String` | NOT NULL | Thông tin nghiệp vụ |
| `attached_video_id` | `attached_video_id` | `Int?` | Nullable | Khóa ngoại liên kết |

- **Mối quan hệ liên kết (Relationships):**
  - `attached_video`: Liên kết `Video?` (@relation(fields: [attached_video_id], references: [post_id], onDelete: SetNull, onUpdate: NoAction))
  - `post`: Liên kết `Post` (@relation(fields: [post_id], references: [post_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@map("blogs")`


#### `post_categories` (Model: `PostCategory`)

- **Mô tả nghiệp vụ:** Bảng liên kết nhiều-nhiều (N-N) gán một bài viết vào một hoặc nhiều danh mục.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `post_id` | `post_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `category_id` | `category_id` | `Int` | NOT NULL | Khóa ngoại liên kết |

- **Mối quan hệ liên kết (Relationships):**
  - `category`: Liên kết `Category` (@relation(fields: [category_id], references: [category_id], onDelete: Cascade, onUpdate: NoAction))
  - `post`: Liên kết `Post` (@relation(fields: [post_id], references: [post_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@id([post_id, category_id])`
  - `@@index([category_id], map: "idx_post_categories_category")`
  - `@@map("post_categories")`


#### `post_attachments` (Model: `PostAttachment`)

- **Mô tả nghiệp vụ:** Lưu trữ các tập tin hình ảnh hoặc tệp phương tiện đính kèm trong bài viết cộng đồng.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `attachment_id` | `attachment_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `post_id` | `post_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `file_url` | `file_url` | `String (@db.VarChar(500))` | NOT NULL | Thông tin nghiệp vụ |
| `file_type` | `file_type` | `String (@db.VarChar(20))` | NOT NULL | Thông tin nghiệp vụ |
| `file_name` | `file_name` | `String? (@db.VarChar(255))` | Nullable | Thông tin nghiệp vụ |
| `created_at` | `created_at` | `DateTime? (@db.Timestamptz(6))` | Default: `now(`, Nullable | Thời điểm bản ghi được tạo |

- **Mối quan hệ liên kết (Relationships):**
  - `post`: Liên kết `Post` (@relation(fields: [post_id], references: [post_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@index([post_id], map: "idx_post_attachments_post")`
  - `@@map("post_attachments")`


#### `comments` (Model: `Comment`)

- **Mô tả nghiệp vụ:** Lưu trữ các bình luận thảo luận của người dùng dưới bài viết, hỗ trợ cấu trúc phân cấp (trả lời bình luận `parent_id`) và kiểm duyệt nội dung.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `comment_id` | `comment_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `post_id` | `post_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `user_id` | `user_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `content` | `content` | `String` | NOT NULL | Thông tin nghiệp vụ |
| `is_flagged_by_ai` | `is_flagged_by_ai` | `Boolean?` | Default: `false`, Nullable | Thông tin nghiệp vụ |
| `status` | `status` | `String (@db.VarChar(30))` | Default: `"ACTIVE"`, NOT NULL | Trạng thái hoạt động của thực thể |
| `status_before_account_deletion` | `statusBeforeAccountDeletion` | `String? (@db.VarChar(30))` | Nullable | Thông tin nghiệp vụ |
| `moderation_version` | `moderationVersion` | `Int` | Default: `0`, NOT NULL | Thông tin nghiệp vụ |
| `deleted_at` | `deleted_at` | `DateTime? (@db.Timestamptz(6))` | Nullable | Thời điểm xóa mềm (soft delete) |
| `created_at` | `created_at` | `DateTime? (@db.Timestamptz(6))` | Default: `now(`, Nullable | Thời điểm bản ghi được tạo |

- **Mối quan hệ liên kết (Relationships):**
  - `contentModerationJobs`: Liên kết `ContentModerationJob[]` ()
  - `post`: Liên kết `Post` (@relation(fields: [post_id], references: [post_id], onDelete: Cascade, onUpdate: NoAction))
  - `user`: Liên kết `User` (@relation(fields: [user_id], references: [user_id], onDelete: Cascade, onUpdate: NoAction))
  - `reports`: Liên kết `Report[]` ()

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@index([post_id], map: "idx_comments_post")`
  - `@@index([user_id], map: "idx_comments_user")`
  - `@@index([status, deleted_at], map: "idx_comments_deleted_at")`
  - `@@map("comments")`


#### `post_votes` (Model: `PostVote`)

- **Mô tả nghiệp vụ:** Ghi nhận tương tác thích/không thích (Upvote/Downvote) của người dùng đối với bài viết, đảm bảo mỗi người chỉ vote 1 lần.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | `user_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `post_id` | `post_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `vote_type` | `vote_type` | `String (@db.VarChar(20))` | NOT NULL | Thông tin nghiệp vụ |

- **Mối quan hệ liên kết (Relationships):**
  - `post`: Liên kết `Post` (@relation(fields: [post_id], references: [post_id], onDelete: Cascade, onUpdate: NoAction))
  - `user`: Liên kết `User` (@relation(fields: [user_id], references: [user_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@id([user_id, post_id])`
  - `@@map("post_votes")`


### 3. Nguyên liệu, Dinh dưỡng & Công thức (Ingredients & Recipes)

#### `ingredients` (Model: `Ingredient`)

- **Mô tả nghiệp vụ:** Từ điển nguyên liệu ẩm thực cốt lõi, lưu trữ tên, calo, các chỉ số đa lượng (protein, carbs, fat, fiber trên 100g) và tỷ trọng chất lỏng (`density`).
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `ingredient_id` | `ingredient_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `name` | `name` | `String (@db.VarChar(150))` | `UK`, NOT NULL | Thông tin nghiệp vụ |
| `calories_per_100g` | `calories_per_100g` | `Float? (@db.Real)` | Default: `0`, Nullable | Thông tin nghiệp vụ |
| `protein` | `protein` | `Float? (@db.Real)` | Default: `0`, Nullable | Thông tin nghiệp vụ |
| `fat` | `fat` | `Float? (@db.Real)` | Default: `0`, Nullable | Thông tin nghiệp vụ |
| `carbs` | `carbs` | `Float? (@db.Real)` | Default: `0`, Nullable | Thông tin nghiệp vụ |
| `fiber` | `fiber` | `Float? (@db.Real)` | Default: `0`, Nullable | Thông tin nghiệp vụ |
| `density` | `density` | `Float? (@db.Real)` | Nullable | Tỷ trọng g/ml chất lỏng quy đổi đơn vị |

- **Mối quan hệ liên kết (Relationships):**
  - `lookupJobs`: Liên kết `IngredientLookupJob[]` ()
  - `details`: Liên kết `IngredientDetails?` ()
  - `image`: Liên kết `IngredientImage?` ()
  - `recipe_ingredients`: Liên kết `RecipeIngredient[]` ()
  - `allergies`: Liên kết `UserAllergy[]` ()

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@map("ingredients")`


#### `ingredient_details` (Model: `IngredientDetails`)

- **Mô tả nghiệp vụ:** Mở rộng 1-1 với Ingredient cung cấp thông tin nguồn gốc thực vật, xuất xứ, công dụng, cách sơ chế và các tên gọi khác (aliases).
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `ingredient_id` | `ingredient_id` | `Int` | `PK`, NOT NULL | Khóa chính định danh duy nhất |
| `category` | `category` | `String (@db.VarChar(30))` | NOT NULL | Thông tin nghiệp vụ |
| `origin` | `origin` | `String` | NOT NULL | Thông tin nghiệp vụ |
| `plant` | `plant` | `Boolean?` | Nullable | Thông tin nghiệp vụ |
| `description` | `description` | `String` | NOT NULL | Thông tin nghiệp vụ |
| `cooking` | `cooking` | `String` | NOT NULL | Thông tin nghiệp vụ |
| `aliases` | `aliases` | `String` | Default: `""`, NOT NULL | Thông tin nghiệp vụ |
| `image_url` | `image_url` | `String?` | Nullable | Thông tin nghiệp vụ |

- **Mối quan hệ liên kết (Relationships):**
  - `ingredient`: Liên kết `Ingredient` (@relation(fields:[ingredient_id],references:[ingredient_id],onDelete:Cascade,onUpdate:NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@map("ingredient_details")`


#### `ingredient_images` (Model: `IngredientImage`)

- **Mô tả nghiệp vụ:** Lưu trữ dữ liệu ảnh nhị phân (BLOB) đại diện cho nguyên liệu, giấy phép bản quyền và nguồn gốc hình ảnh.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `ingredient_id` | `ingredient_id` | `Int` | `PK`, NOT NULL | Khóa chính định danh duy nhất |
| `mime_type` | `mime_type` | `String (@db.VarChar(50))` | NOT NULL | Thông tin nghiệp vụ |
| `image_data` | `image_data` | `Bytes` | NOT NULL | Thông tin nghiệp vụ |
| `attribution` | `attribution` | `String?` | Nullable | Thông tin nghiệp vụ |
| `source_url` | `source_url` | `String?` | Nullable | Thông tin nghiệp vụ |
| `license` | `license` | `String?` | Nullable | Thông tin nghiệp vụ |
| `license_text` | `license_text` | `String?` | Nullable | Thông tin nghiệp vụ |

- **Mối quan hệ liên kết (Relationships):**
  - `ingredient`: Liên kết `Ingredient` (@relation(fields:[ingredient_id],references:[ingredient_id],onDelete:Cascade,onUpdate:NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@map("ingredient_images")`


#### `ingredient_alternatives` (Model: `IngredientAlternative`)

- **Mô tả nghiệp vụ:** Đề xuất các nguyên liệu thay thế tương đương khi nấu ăn chay (ví dụ thay thịt bò bằng nấm đùi gà, thay mật ong bằng siro thùa).
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `id` | `String (@db.VarChar(40))` | `PK`, NOT NULL | Khóa chính định danh duy nhất |
| `chip` | `chip` | `String` | NOT NULL | Thông tin nghiệp vụ |
| `emoji` | `emoji` | `String` | NOT NULL | Thông tin nghiệp vụ |
| `original` | `original` | `String` | NOT NULL | Thông tin nghiệp vụ |
| `role` | `role` | `String` | NOT NULL | Thông tin nghiệp vụ |
| `alternatives` | `alternatives` | `Json (@db.JsonB)` | NOT NULL | Thông tin nghiệp vụ |
| `description` | `description` | `String` | NOT NULL | Thông tin nghiệp vụ |
| `keywords` | `keywords` | `String` | NOT NULL | Thông tin nghiệp vụ |

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@map("ingredient_alternatives")`


#### `recipes` (Model: `Recipe`)

- **Mô tả nghiệp vụ:** Lưu trữ công thức nấu ăn chi tiết: tên món, hướng dẫn các bước nấu (instructions), thời gian chuẩn bị, tổng lượng calo và liên kết bài viết.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `recipe_id` | `recipe_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `post_id` | `post_id` | `Int?` | Nullable | Khóa ngoại liên kết |
| `category_id` | `category_id` | `Int?` | Nullable | Khóa ngoại liên kết |
| `diet_type_id` | `diet_type_id` | `Int? (@db.SmallInt)` | Nullable | Khóa ngoại liên kết |
| `recipe_name` | `recipe_name` | `String (@db.VarChar(255))` | NOT NULL | Thông tin nghiệp vụ |
| `description` | `description` | `String?` | Nullable | Thông tin nghiệp vụ |
| `image_url` | `image_url` | `String? (@db.VarChar(500))` | Nullable | Thông tin nghiệp vụ |
| `prep_time` | `prep_time` | `Int?` | Default: `0`, Nullable | Thông tin nghiệp vụ |
| `total_calories` | `total_calories` | `Float? (@db.Real)` | Default: `0`, Nullable | Thông tin nghiệp vụ |
| `instructions` | `instructions` | `String?` | Nullable | Thông tin nghiệp vụ |

- **Mối quan hệ liên kết (Relationships):**
  - `food_diaries`: Liên kết `FoodDiary[]` ()
  - `meal_plan_details`: Liên kết `MealPlanDetail[]` ()
  - `recipe_ingredients`: Liên kết `RecipeIngredient[]` ()
  - `categories`: Liên kết `Category?` (@relation(fields: [category_id], references: [category_id], onUpdate: NoAction))
  - `diet_type`: Liên kết `DietType?` (@relation(fields: [diet_type_id], references: [diet_type_id], onUpdate: NoAction))
  - `post`: Liên kết `Post?` (@relation(fields: [post_id], references: [post_id], onDelete: SetNull, onUpdate: NoAction))
  - `restaurant_recipes`: Liên kết `RestaurantRecipe[]` ()

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@index([post_id], map: "idx_recipes_post")`
  - `@@index([category_id], map: "idx_recipes_category")`
  - `@@index([diet_type_id], map: "idx_recipes_diet_type")`
  - `@@map("recipes")`


#### `recipe_ingredients` (Model: `RecipeIngredient`)

- **Mô tả nghiệp vụ:** Bảng liên kết định lượng (BOM) xác định danh sách các nguyên liệu, số lượng và đơn vị đo lường cần có cho một công thức món ăn.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `recipe_id` | `recipe_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `ingredient_id` | `ingredient_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `quantity` | `quantity` | `Float (@db.Real)` | NOT NULL | Thông tin nghiệp vụ |
| `unit` | `unit` | `String (@db.VarChar(50))` | NOT NULL | Thông tin nghiệp vụ |

- **Mối quan hệ liên kết (Relationships):**
  - `ingredient`: Liên kết `Ingredient` (@relation(fields: [ingredient_id], references: [ingredient_id], onDelete: Cascade, onUpdate: NoAction))
  - `recipe`: Liên kết `Recipe` (@relation(fields: [recipe_id], references: [recipe_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@id([recipe_id, ingredient_id])`
  - `@@index([ingredient_id], map: "idx_recipe_ingredients_ingredient")`
  - `@@map("recipe_ingredients")`


### 4. Thực đơn Tuần & Nhật ký Ăn uống (Nutrition & Meal Planning)

#### `meal_plans` (Model: `MealPlan`)

- **Mô tả nghiệp vụ:** Kế hoạch thực đơn ăn chay theo tuần dành cho người dùng, ghi nhận khoảng thời gian áp dụng và mục tiêu calo mỗi ngày.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `plan_id` | `plan_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `user_id` | `user_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `title` | `title` | `String (@db.VarChar(255))` | Default: `"Thực đơn tuần"`, NOT NULL | Thông tin nghiệp vụ |
| `start_date` | `start_date` | `DateTime (@db.Date)` | NOT NULL | Thông tin nghiệp vụ |
| `end_date` | `end_date` | `DateTime (@db.Date)` | NOT NULL | Thông tin nghiệp vụ |
| `target_calories` | `target_calories` | `Float? (@db.Real)` | Nullable | Thông tin nghiệp vụ |

- **Mối quan hệ liên kết (Relationships):**
  - `details`: Liên kết `MealPlanDetail[]` ()
  - `user`: Liên kết `User` (@relation(fields: [user_id], references: [user_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@index([user_id, start_date], map: "idx_meal_plans_user_start_date")`
  - `@@map("meal_plans")`


#### `meal_plan_details` (Model: `MealPlanDetail`)

- **Mô tả nghiệp vụ:** Chi tiết từng bữa ăn trong kế hoạch tuần (Sáng, Trưa, Tối, Bữa phụ) theo từng thứ trong tuần, liên kết công thức hoặc món gợi ý từ AI.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `plan_detail_id` | `plan_detail_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `plan_id` | `plan_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `recipe_id` | `recipe_id` | `Int?` | Nullable | Khóa ngoại liên kết |
| `meal_type` | `meal_type` | `String (@db.VarChar(30))` | NOT NULL | Thông tin nghiệp vụ |
| `day_of_week` | `day_of_week` | `Int (@db.SmallInt)` | NOT NULL | Thông tin nghiệp vụ |
| `custom_food_name` | `custom_food_name` | `String? (@db.VarChar(255))` | Nullable | Thông tin nghiệp vụ |
| `calories` | `calories` | `Float? (@db.Real)` | Nullable | Thông tin nghiệp vụ |
| `protein` | `protein` | `Float? (@db.Real)` | Nullable | Thông tin nghiệp vụ |
| `carbs` | `carbs` | `Float? (@db.Real)` | Nullable | Thông tin nghiệp vụ |
| `fat` | `fat` | `Float? (@db.Real)` | Nullable | Thông tin nghiệp vụ |

- **Mối quan hệ liên kết (Relationships):**
  - `meal_plan`: Liên kết `MealPlan` (@relation(fields: [plan_id], references: [plan_id], onDelete: Cascade, onUpdate: NoAction))
  - `recipe`: Liên kết `Recipe?` (@relation(fields: [recipe_id], references: [recipe_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@index([plan_id], map: "idx_meal_plan_details_plan")`
  - `@@map("meal_plan_details")`


#### `food_diaries` (Model: `FoodDiary`)

- **Mô tả nghiệp vụ:** Nhật ký ăn uống thực tế mỗi ngày của người dùng, lưu trữ món ăn, lượng calo, khối lượng phần ăn và các chỉ số dinh dưỡng thực tế nạp vào.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `diary_id` | `diary_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `user_id` | `user_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `consumed_date` | `consumed_date` | `DateTime? (@db.Date)` | Default: `dbgenerated("CURRENT_DATE"`, Nullable | Thông tin nghiệp vụ |
| `meal_type` | `meal_type` | `String (@db.VarChar(30))` | NOT NULL | Thông tin nghiệp vụ |
| `recipe_id` | `recipe_id` | `Int?` | Nullable | Khóa ngoại liên kết |
| `custom_food_name` | `custom_food_name` | `String? (@db.VarChar(255))` | Nullable | Thông tin nghiệp vụ |
| `calories` | `calories` | `Float? (@db.Real)` | Default: `0`, Nullable | Thông tin nghiệp vụ |
| `serving` | `serving` | `String? (@db.VarChar(100))` | Nullable | Thông tin nghiệp vụ |
| `protein` | `protein` | `Float? (@db.Real)` | Default: `0`, Nullable | Thông tin nghiệp vụ |
| `carbs` | `carbs` | `Float? (@db.Real)` | Default: `0`, Nullable | Thông tin nghiệp vụ |
| `fat` | `fat` | `Float? (@db.Real)` | Default: `0`, Nullable | Thông tin nghiệp vụ |
| `fiber` | `fiber` | `Float? (@db.Real)` | Default: `0`, Nullable | Thông tin nghiệp vụ |

- **Mối quan hệ liên kết (Relationships):**
  - `recipe`: Liên kết `Recipe?` (@relation(fields: [recipe_id], references: [recipe_id], onUpdate: NoAction))
  - `user`: Liên kết `User` (@relation(fields: [user_id], references: [user_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@index([user_id, consumed_date], map: "idx_food_diaries_user_date")`
  - `@@map("food_diaries")`


### 5. Quán ăn Chay, Địa điểm & Đánh giá (Restaurants & Reviews)

#### `restaurants` (Model: `Restaurant`)

- **Mô tả nghiệp vụ:** Danh bạ nhà hàng và quán ăn chay, lưu vị trí GPS, thông tin liên hệ, đánh giá sao, giờ mở cửa, phân khúc giá, và khu bếp chay riêng biệt.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `restaurant_id` | `restaurant_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `name` | `name` | `String (@db.VarChar(255))` | NOT NULL | Thông tin nghiệp vụ |
| `address` | `address` | `String (@db.VarChar(255))` | NOT NULL | Thông tin nghiệp vụ |
| `phone` | `phone` | `String? (@db.VarChar(50))` | Nullable | Thông tin nghiệp vụ |
| `image_url` | `image_url` | `String? (@db.VarChar(500))` | Nullable | Thông tin nghiệp vụ |
| `rating` | `rating` | `Float? (@db.Real)` | Default: `4.5`, Nullable | Thông tin nghiệp vụ |
| `latitude` | `latitude` | `Decimal? (@db.Decimal(10)` | Nullable | Thông tin nghiệp vụ |
| `longitude` | `longitude` | `Decimal? (@db.Decimal(10)` | Nullable | Thông tin nghiệp vụ |
| `diet_type_id` | `diet_type_id` | `Int? (@db.SmallInt)` | Nullable | Khóa ngoại liên kết |
| `is_ingredient_shop` | `isIngredientShop` | `Boolean` | Default: `false`, NOT NULL | Thông tin nghiệp vụ |
| `city` | `city` | `String? (@db.VarChar(100))` | Nullable | Thông tin nghiệp vụ |
| `hours` | `hours` | `String? (@db.VarChar(100))` | Nullable | Thông tin nghiệp vụ |
| `price_range` | `priceRange` | `String? (@db.VarChar(50))` | Nullable | Thông tin nghiệp vụ |
| `separate_kitchen` | `separateKitchen` | `Boolean` | Default: `false`, NOT NULL | Thông tin nghiệp vụ |
| `source` | `source` | `String (@db.VarChar(20))` | Default: `"local"`, NOT NULL | Thông tin nghiệp vụ |
| `status` | `status` | `String (@db.VarChar(20))` | Default: `"APPROVED"`, NOT NULL | Trạng thái hoạt động của thực thể |
| `place_id` | `place_id` | `String? (@db.VarChar(100))` | `UK`, Nullable | Khóa ngoại liên kết |
| `created_at` | `created_at` | `DateTime? (@db.Timestamptz(6))` | Default: `now(`, Nullable | Thời điểm bản ghi được tạo |
| `updated_at` | `updated_at` | `DateTime? (@db.Timestamptz(6))` | Nullable | Thời điểm cập nhật bản ghi gần nhất |

- **Mối quan hệ liên kết (Relationships):**
  - `reviews`: Liên kết `RestaurantReview[]` ()
  - `restaurant_recipes`: Liên kết `RestaurantRecipe[]` ()
  - `diet_type`: Liên kết `DietType?` (@relation(fields: [diet_type_id], references: [diet_type_id], onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@index([latitude, longitude], map: "idx_restaurants_coordinates")`
  - `@@index([diet_type_id], map: "idx_restaurants_diet_type")`
  - `@@index([status, latitude, longitude], map: "idx_restaurants_status_coords")`
  - `@@index([diet_type_id, latitude, longitude], map: "idx_restaurants_diet_coords")`
  - `@@map("restaurants")`


#### `restaurant_recipes` (Model: `RestaurantRecipe`)

- **Mô tả nghiệp vụ:** Thực đơn các món ăn chay được phục vụ tại quán, kèm mức giá bán thực tế (`price`).
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `restaurant_id` | `restaurant_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `recipe_id` | `recipe_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `price` | `price` | `Decimal? (@db.Decimal(18)` | Nullable | Giá bán món ăn tại nhà hàng |

- **Mối quan hệ liên kết (Relationships):**
  - `recipe`: Liên kết `Recipe` (@relation(fields: [recipe_id], references: [recipe_id], onDelete: Cascade, onUpdate: NoAction))
  - `restaurant`: Liên kết `Restaurant` (@relation(fields: [restaurant_id], references: [restaurant_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@id([restaurant_id, recipe_id])`
  - `@@map("restaurant_recipes")`


#### `restaurant_reviews` (Model: `RestaurantReview`)

- **Mô tả nghiệp vụ:** Đánh giá, nhận xét và chấm điểm sao của người dùng thực tế sau khi trải nghiệm tại quán chay.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `review_id` | `review_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `restaurant_id` | `restaurant_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `user_id` | `user_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `stars` | `stars` | `Int (@db.SmallInt)` | NOT NULL | Thông tin nghiệp vụ |
| `content` | `content` | `String` | NOT NULL | Thông tin nghiệp vụ |
| `created_at` | `created_at` | `DateTime (@db.Timestamptz(6))` | Default: `now(`, NOT NULL | Thời điểm bản ghi được tạo |

- **Mối quan hệ liên kết (Relationships):**
  - `restaurant`: Liên kết `Restaurant` (@relation(fields:[restaurant_id],references:[restaurant_id],onDelete:Cascade,onUpdate:NoAction))
  - `user`: Liên kết `User` (@relation(fields:[user_id],references:[user_id],onDelete:Cascade,onUpdate:NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@index([restaurant_id],map:"restaurant_reviews_place_idx")`
  - `@@index([user_id], map: "idx_restaurant_reviews_user")`
  - `@@map("restaurant_reviews")`


### 6. Tác vụ Nền AI, Kiểm duyệt, Hạn mức & Báo cáo Hệ thống (AI, Moderation & System)

#### `ai_generations` (Model: `AiGeneration`)

- **Mô tả nghiệp vụ:** Nhật ký lưu trữ các phiên gọi AI (Tư vấn dinh dưỡng Chat, Gợi ý thực đơn Meal Plan, Quét ảnh nguyên liệu Food Scan) cho người dùng đăng nhập.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `id` | `String (@db.Uuid)` | `PK`, Default: `uuid(`, NOT NULL | Khóa chính định danh duy nhất |
| `user_id` | `userId` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `type` | `type` | `AiGenerationType` | NOT NULL | Thông tin nghiệp vụ |
| `status` | `status` | `AiGenerationStatus` | Default: `PROCESSING`, NOT NULL | Trạng thái hoạt động của thực thể |
| `model_name` | `modelName` | `String (@db.VarChar(100))` | NOT NULL | Thông tin nghiệp vụ |
| `request_payload` | `requestPayload` | `Json` | NOT NULL | Thông tin nghiệp vụ |
| `prompt_messages` | `promptMessages` | `Json` | NOT NULL | Thông tin nghiệp vụ |
| `response_payload` | `responsePayload` | `Json?` | Nullable | Thông tin nghiệp vụ |
| `error_code` | `errorCode` | `String? (@db.VarChar(100))` | Nullable | Thông tin nghiệp vụ |
| `error_message` | `errorMessage` | `String?` | Nullable | Thông tin nghiệp vụ |
| `completed_at` | `completedAt` | `DateTime? (@db.Timestamptz(6))` | Nullable | Thông tin nghiệp vụ |
| `created_at` | `createdAt` | `DateTime (@db.Timestamptz(6))` | Default: `now(`, NOT NULL | Thời điểm bản ghi được tạo |
| `updated_at` | `updatedAt` | `DateTime (@db.Timestamptz(6))` | NOT NULL | Thời điểm cập nhật bản ghi gần nhất |

- **Mối quan hệ liên kết (Relationships):**
  - `user`: Liên kết `User` (@relation(fields: [userId], references: [user_id], onDelete: Cascade, onUpdate: Cascade))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@index([userId, createdAt, id], map: "idx_ai_generations_user_created_at")`
  - `@@index([userId, type, status, createdAt, id], map: "idx_ai_generations_user_type_status_created_at")`
  - `@@map("ai_generations")`


#### `ai_logs` (Model: `AiLog`)

- **Mô tả nghiệp vụ:** Ghi nhận nhật ký kỹ thuật, thời gian phản hồi và mã lỗi hệ thống khi giao tiếp với AI Microservice.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `log_id` | `logId` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `model_name` | `modelName` | `String (@db.VarChar(100))` | NOT NULL | Thông tin nghiệp vụ |
| `action` | `action` | `String (@db.VarChar(100))` | NOT NULL | Thông tin nghiệp vụ |
| `status` | `status` | `String (@db.VarChar(20))` | NOT NULL | Trạng thái hoạt động của thực thể |
| `error_feedback` | `errorFeedback` | `String?` | Nullable | Thông tin nghiệp vụ |
| `created_at` | `createdAt` | `DateTime? (@db.Timestamptz(6))` | Default: `now(`, Nullable | Thời điểm bản ghi được tạo |

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@map("ai_logs")`


#### `content_moderation_jobs` (Model: `ContentModerationJob`)

- **Mô tả nghiệp vụ:** Hàng đợi xử lý tác vụ kiểm duyệt văn bản và hình ảnh tự động của bài viết/bình luận qua AI trước khi hiển thị công khai.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `id` | `String (@db.Uuid)` | `PK`, Default: `uuid(`, NOT NULL | Khóa chính định danh duy nhất |
| `user_id` | `userId` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `post_id` | `postId` | `Int?` | Nullable | Khóa ngoại liên kết |
| `comment_id` | `commentId` | `Int?` | Nullable | Khóa ngoại liên kết |
| `content_version` | `contentVersion` | `Int` | NOT NULL | Thông tin nghiệp vụ |
| `title` | `title` | `String? (@db.VarChar(255))` | Nullable | Thông tin nghiệp vụ |
| `content` | `content` | `String` | NOT NULL | Thông tin nghiệp vụ |
| `image_urls` | `imageUrls` | `String[]` | Default: `[]`, NOT NULL | Thông tin nghiệp vụ |
| `status` | `status` | `ContentModerationJobStatus` | Default: `PENDING`, NOT NULL | Trạng thái hoạt động của thực thể |
| `attempt` | `attempt` | `Int` | Default: `0`, NOT NULL | Thông tin nghiệp vụ |
| `available_at` | `availableAt` | `DateTime (@db.Timestamptz(6))` | Default: `now(`, NOT NULL | Thông tin nghiệp vụ |
| `lease_token` | `leaseToken` | `String? (@db.Uuid)` | Nullable | Thông tin nghiệp vụ |
| `lease_expires_at` | `leaseExpiresAt` | `DateTime? (@db.Timestamptz(6))` | Nullable | Thông tin nghiệp vụ |
| `result` | `result` | `Json?` | Nullable | Thông tin nghiệp vụ |
| `applied` | `applied` | `Boolean` | Default: `false`, NOT NULL | Thông tin nghiệp vụ |
| `error_code` | `errorCode` | `String? (@db.VarChar(100))` | Nullable | Thông tin nghiệp vụ |
| `error_message` | `errorMessage` | `String? (@db.VarChar(500))` | Nullable | Thông tin nghiệp vụ |
| `completed_at` | `completedAt` | `DateTime? (@db.Timestamptz(6))` | Nullable | Thông tin nghiệp vụ |
| `created_at` | `createdAt` | `DateTime (@db.Timestamptz(6))` | Default: `now(`, NOT NULL | Thời điểm bản ghi được tạo |
| `updated_at` | `updatedAt` | `DateTime (@db.Timestamptz(6))` | NOT NULL | Thời điểm cập nhật bản ghi gần nhất |

- **Mối quan hệ liên kết (Relationships):**
  - `user`: Liên kết `User` (@relation(fields: [userId], references: [user_id], onDelete: Cascade, onUpdate: NoAction))
  - `post`: Liên kết `Post?` (@relation(fields: [postId], references: [post_id], onDelete: Cascade, onUpdate: NoAction))
  - `comment`: Liên kết `Comment?` (@relation(fields: [commentId], references: [comment_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@unique([postId, contentVersion], map: "uq_content_moderation_jobs_post_version")`
  - `@@unique([commentId, contentVersion], map: "uq_content_moderation_jobs_comment_version")`
  - `@@index([userId], map: "idx_content_moderation_jobs_user")`
  - `@@index([postId], map: "idx_content_moderation_jobs_post")`
  - `@@index([commentId], map: "idx_content_moderation_jobs_comment")`
  - `@@index([status, availableAt, createdAt, id], map: "idx_content_moderation_jobs_queue")`
  - `@@index([status, leaseExpiresAt], map: "idx_content_moderation_jobs_lease")`
  - `@@map("content_moderation_jobs")`


#### `video_recipe_summary_jobs` (Model: `VideoRecipeSummaryJob`)

- **Mô tả nghiệp vụ:** Hàng đợi tác vụ bóc tách công thức nấu ăn tự động từ link video YouTube/TikTok qua phụ đề AI và lưu trực tiếp kết quả công thức (`recipe`).
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `id` | `String (@db.Uuid)` | `PK`, Default: `uuid(`, NOT NULL | Khóa chính định danh duy nhất |
| `user_id` | `userId` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `active_user_id` | `activeUserId` | `Int?` | `UK`, Nullable | Khóa ngoại liên kết |
| `video_id` | `videoId` | `String (@db.VarChar(11))` | NOT NULL | Khóa ngoại liên kết |
| `video_url` | `videoUrl` | `String (@db.VarChar(255))` | NOT NULL | Thông tin nghiệp vụ |
| `pipeline_version` | `pipelineVersion` | `String (@db.VarChar(20))` | NOT NULL | Thông tin nghiệp vụ |
| `status` | `status` | `VideoRecipeSummaryJobStatus` | Default: `PENDING`, NOT NULL | Trạng thái hoạt động của thực thể |
| `stage` | `stage` | `VideoRecipeSummaryJobStage` | Default: `VALIDATING_VIDEO`, NOT NULL | Thông tin nghiệp vụ |
| `attempt` | `attempt` | `Int` | Default: `0`, NOT NULL | Thông tin nghiệp vụ |
| `available_at` | `availableAt` | `DateTime (@db.Timestamptz(6))` | Default: `now(`, NOT NULL | Thông tin nghiệp vụ |
| `lease_token` | `leaseToken` | `String? (@db.Uuid)` | Nullable | Thông tin nghiệp vụ |
| `lease_expires_at` | `leaseExpiresAt` | `DateTime? (@db.Timestamptz(6))` | Nullable | Thông tin nghiệp vụ |
| `metadata` | `metadata` | `Json?` | Nullable | Thông tin nghiệp vụ |
| `transcript` | `transcript` | `Json?` | Nullable | Thông tin nghiệp vụ |
| `recipe` | `recipe` | `Json?` | Nullable | Kết quả bóc tách công thức nấu ăn dạng JSON |
| `error_code` | `errorCode` | `String? (@db.VarChar(100))` | Nullable | Thông tin nghiệp vụ |
| `error_message` | `errorMessage` | `String? (@db.VarChar(500))` | Nullable | Thông tin nghiệp vụ |
| `completed_at` | `completedAt` | `DateTime? (@db.Timestamptz(6))` | Nullable | Thông tin nghiệp vụ |
| `created_at` | `createdAt` | `DateTime (@db.Timestamptz(6))` | Default: `now(`, NOT NULL | Thời điểm bản ghi được tạo |
| `updated_at` | `updatedAt` | `DateTime (@db.Timestamptz(6))` | NOT NULL | Thời điểm cập nhật bản ghi gần nhất |

- **Mối quan hệ liên kết (Relationships):**
  - `user`: Liên kết `User` (@relation(fields: [userId], references: [user_id], onDelete: Cascade, onUpdate: Cascade))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@unique([userId, videoId, pipelineVersion], map: "uq_video_recipe_jobs_user_source_version")`
  - `@@index([status, availableAt, createdAt, id], map: "idx_video_recipe_jobs_queue")`
  - `@@index([status, leaseExpiresAt], map: "idx_video_recipe_jobs_expired_lease")`
  - `@@index([userId, createdAt, id], map: "idx_video_recipe_jobs_user_created")`
  - `@@map("video_recipe_summary_jobs")`


#### `ingredient_lookup_jobs` (Model: `IngredientLookupJob`)

- **Mô tả nghiệp vụ:** Hàng đợi tác vụ AI tự động tra cứu thành phần dinh dưỡng nguyên liệu mới chưa có trong từ điển khi người dùng tìm kiếm.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `id` | `String (@db.Uuid)` | `PK`, Default: `uuid(`, NOT NULL | Khóa chính định danh duy nhất |
| `owner_key` | `ownerKey` | `String (@db.Char(64))` | NOT NULL | Thông tin nghiệp vụ |
| `active_key` | `activeKey` | `String? (@db.Char(64))` | `UK`, Nullable | Thông tin nghiệp vụ |
| `ingredient_name` | `ingredientName` | `String (@db.VarChar(150))` | NOT NULL | Thông tin nghiệp vụ |
| `status` | `status` | `IngredientLookupJobStatus` | Default: `PENDING`, NOT NULL | Trạng thái hoạt động của thực thể |
| `ingredient_id` | `ingredientId` | `Int?` | Nullable | Khóa ngoại liên kết |
| `source_photo` | `sourcePhoto` | `Bytes?` | Nullable | Thông tin nghiệp vụ |
| `source_mime_type` | `sourceMimeType` | `String? (@db.VarChar(50))` | Nullable | Thông tin nghiệp vụ |
| `reservation` | `reservation` | `Json?` | Nullable | Thông tin nghiệp vụ |
| `lease_token` | `leaseToken` | `String? (@db.Uuid)` | Nullable | Thông tin nghiệp vụ |
| `lease_expires_at` | `leaseExpiresAt` | `DateTime? (@db.Timestamptz(6))` | Nullable | Thông tin nghiệp vụ |
| `error_code` | `errorCode` | `String? (@db.VarChar(100))` | Nullable | Thông tin nghiệp vụ |
| `error_message` | `errorMessage` | `String? (@db.VarChar(500))` | Nullable | Thông tin nghiệp vụ |
| `completed_at` | `completedAt` | `DateTime? (@db.Timestamptz(6))` | Nullable | Thông tin nghiệp vụ |
| `created_at` | `createdAt` | `DateTime (@db.Timestamptz(6))` | Default: `now(`, NOT NULL | Thời điểm bản ghi được tạo |
| `updated_at` | `updatedAt` | `DateTime (@db.Timestamptz(6))` | NOT NULL | Thời điểm cập nhật bản ghi gần nhất |

- **Mối quan hệ liên kết (Relationships):**
  - `ingredient`: Liên kết `Ingredient?` (@relation(fields: [ingredientId], references: [ingredient_id], onDelete: SetNull, onUpdate: Cascade))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@index([ownerKey, createdAt, id], map: "idx_ingredient_lookup_jobs_owner")`
  - `@@index([status, createdAt, id], map: "idx_ingredient_lookup_jobs_queue")`
  - `@@index([status, leaseExpiresAt], map: "idx_ingredient_lookup_jobs_expired")`
  - `@@index([ingredientId], map: "idx_ingredient_lookup_jobs_ingredient")`
  - `@@map("ingredient_lookup_jobs")`


#### `guest_quota` (Model: `GuestQuota`)

- **Mô tả nghiệp vụ:** Quản lý hạn mức sử dụng các tính năng AI (Chat, Food Scan) dành cho khách vãng lai (Guest) chưa đăng nhập theo ngày.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `guest_id` | `guestId` | `String (@db.VarChar(100))` | NOT NULL | Khóa ngoại liên kết |
| `quota_date` | `quotaDate` | `DateTime (@db.Date)` | NOT NULL | Thông tin nghiệp vụ |
| `used_count` | `usedCount` | `Int` | Default: `0`, NOT NULL | Thông tin nghiệp vụ |
| `reservation_revision` | `reservationRevision` | `Int` | Default: `0`, NOT NULL | Thông tin nghiệp vụ |
| `updated_at` | `updatedAt` | `DateTime (@db.Timestamp(6))` | Default: `now(`, NOT NULL | Thời điểm cập nhật bản ghi gần nhất |

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@id([guestId, quotaDate])`
  - `@@map("guest_quota")`


#### `reports` (Model: `Report`)

- **Mô tả nghiệp vụ:** Tiếp nhận và quản lý các báo cáo vi phạm nội quy cộng đồng từ người dùng về bài viết hoặc bình luận để Quản trị viên xử lý.
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `report_id` | `report_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `reporter_id` | `reporter_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `post_id` | `post_id` | `Int?` | Nullable | Khóa ngoại liên kết |
| `comment_id` | `comment_id` | `Int?` | Nullable | Khóa ngoại liên kết |
| `reason` | `reason` | `String` | NOT NULL | Thông tin nghiệp vụ |
| `status` | `status` | `String (@db.VarChar(30))` | Default: `"PENDING"`, NOT NULL | Trạng thái hoạt động của thực thể |
| `created_at` | `created_at` | `DateTime? (@db.Timestamptz(6))` | Default: `now(`, Nullable | Thời điểm bản ghi được tạo |

- **Mối quan hệ liên kết (Relationships):**
  - `comment`: Liên kết `Comment?` (@relation(fields: [comment_id], references: [comment_id], onDelete: Cascade, onUpdate: NoAction))
  - `post`: Liên kết `Post?` (@relation(fields: [post_id], references: [post_id], onDelete: Cascade, onUpdate: NoAction))
  - `reporter`: Liên kết `User` (@relation(fields: [reporter_id], references: [user_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@index([reporter_id], map: "idx_reports_reporter")`
  - `@@index([post_id], map: "idx_reports_post")`
  - `@@index([comment_id], map: "idx_reports_comment")`
  - `@@index([status], map: "idx_reports_status")`
  - `@@map("reports")`


#### `notifications` (Model: `Notification`)

- **Mô tả nghiệp vụ:** Hệ thống thông báo đẩy gửi đến người dùng khi có tương tác (được bình luận, bài viết được duyệt, cảnh báo hệ thống).
- **Bảng thuộc tính (Columns):**

| Cột DB (`snake_case`) | Thuộc tính Model | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `notification_id` | `notification_id` | `Int` | `PK`, Default: `autoincrement(`, NOT NULL | Khóa chính định danh duy nhất |
| `user_id` | `user_id` | `Int` | NOT NULL | Khóa ngoại liên kết |
| `content` | `content` | `String (@db.VarChar(500))` | NOT NULL | Thông tin nghiệp vụ |
| `is_read` | `is_read` | `Boolean?` | Default: `false`, Nullable | Thông tin nghiệp vụ |
| `created_at` | `created_at` | `DateTime? (@db.Timestamptz(6))` | Default: `now(`, Nullable | Thời điểm bản ghi được tạo |

- **Mối quan hệ liên kết (Relationships):**
  - `user`: Liên kết `User` (@relation(fields: [user_id], references: [user_id], onDelete: Cascade, onUpdate: NoAction))

- **Chỉ mục & Ràng buộc toàn vẹn (Indexes & Constraints):**
  - `@@map("notifications")`


---

## 4. Ma trận Quan hệ Khóa Ngoại Tổng thể (Foreign Key Matrix)

Bảng tổng hợp tất cả các liên kết khóa ngoại giữa các bảng trong cơ sở dữ liệu:

| Bảng nguồn (Source) | Cột khóa ngoại (FK) | Bảng đích (Target) | Cột tham chiếu (PK) | Quan hệ | Hành vi xóa (onDelete) |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `password_reset_otps` | `user_id` | `users` | `user_id` | 1-1 | `Cascade` |
| `password_reset_tokens` | `user_id` | `users` | `user_id` | N-1 | `Cascade` |
| `health_profiles` | `user_id` | `users` | `user_id` | 1-1 | `Cascade` |
| `health_profiles` | `diet_type_id` | `diet_types` | `diet_type_id` | N-1 | `SetNull` |
| `health_histories` | `user_id` | `users` | `user_id` | N-1 | `Cascade` |
| `user_allergies` | `user_id` | `users` | `user_id` | N-1 | `Cascade` |
| `user_allergies` | `ingredient_id` | `ingredients` | `ingredient_id` | N-1 | `Cascade` |
| `posts` | `author_id` | `users` | `user_id` | N-1 | `Cascade` |
| `videos` | `post_id` | `posts` | `post_id` | 1-1 | `Cascade` |
| `blogs` | `post_id` | `posts` | `post_id` | 1-1 | `Cascade` |
| `blogs` | `attached_video_id` | `videos` | `post_id` | N-1 | `SetNull` |
| `post_categories` | `post_id` | `posts` | `post_id` | N-1 | `Cascade` |
| `post_categories` | `category_id` | `categories` | `category_id` | N-1 | `Cascade` |
| `post_attachments` | `post_id` | `posts` | `post_id` | N-1 | `Cascade` |
| `comments` | `post_id` | `posts` | `post_id` | N-1 | `Cascade` |
| `comments` | `user_id` | `users` | `user_id` | N-1 | `Cascade` |
| `comments` | `parent_id` | `comments` | `comment_id` | N-1 | `Cascade` |
| `post_votes` | `post_id` | `posts` | `post_id` | N-1 | `Cascade` |
| `post_votes` | `user_id` | `users` | `user_id` | N-1 | `Cascade` |
| `ingredient_details` | `ingredient_id` | `ingredients` | `ingredient_id` | 1-1 | `Cascade` |
| `ingredient_images` | `ingredient_id` | `ingredients` | `ingredient_id` | 1-1 | `Cascade` |
| `recipes` | `post_id` | `posts` | `post_id` | 1-1 | `Cascade` |
| `recipes` | `category_id` | `categories` | `category_id` | N-1 | `Restrict` |
| `recipes` | `diet_type_id` | `diet_types` | `diet_type_id` | N-1 | `SetNull` |
| `recipe_ingredients` | `recipe_id` | `recipes` | `recipe_id` | N-1 | `Cascade` |
| `recipe_ingredients` | `ingredient_id` | `ingredients` | `ingredient_id` | N-1 | `Cascade` |
| `meal_plans` | `user_id` | `users` | `user_id` | N-1 | `Cascade` |
| `meal_plan_details` | `plan_id` | `meal_plans` | `plan_id` | N-1 | `Cascade` |
| `meal_plan_details` | `recipe_id` | `recipes` | `recipe_id` | N-1 | `SetNull` |
| `food_diaries` | `user_id` | `users` | `user_id` | N-1 | `Cascade` |
| `food_diaries` | `recipe_id` | `recipes` | `recipe_id` | N-1 | `Cascade` |
| `restaurants` | `diet_type_id` | `diet_types` | `diet_type_id` | N-1 | `SetNull` |
| `restaurant_recipes` | `restaurant_id` | `restaurants` | `restaurant_id` | N-1 | `Cascade` |
| `restaurant_recipes` | `recipe_id` | `recipes` | `recipe_id` | N-1 | `Cascade` |
| `restaurant_reviews` | `restaurant_id` | `restaurants` | `restaurant_id` | N-1 | `Cascade` |
| `restaurant_reviews` | `user_id` | `users` | `user_id` | N-1 | `Cascade` |
| `ai_generations` | `user_id` | `users` | `user_id` | N-1 | `Cascade` |
| `content_moderation_jobs` | `user_id` | `users` | `user_id` | N-1 | `Cascade` |
| `content_moderation_jobs` | `post_id` | `posts` | `post_id` | N-1 | `Cascade` |
| `content_moderation_jobs` | `comment_id` | `comments` | `comment_id` | N-1 | `Cascade` |
| `video_recipe_summary_jobs` | `user_id` | `users` | `user_id` | N-1 | `Cascade` |
| `ingredient_lookup_jobs` | `ingredient_id` | `ingredients` | `ingredient_id` | N-1 | `SetNull` |
| `reports` | `reporter_id` | `users` | `user_id` | N-1 | `Cascade` |
| `reports` | `post_id` | `posts` | `post_id` | N-1 | `Cascade` |
| `reports` | `comment_id` | `comments` | `comment_id` | N-1 | `Cascade` |
| `notifications` | `user_id` | `users` | `user_id` | N-1 | `Cascade` |
