# Backend Server Architecture - SWP391 (Chay Xanh)

Hệ thống API backend cho dự án **SWP391 - Vegetarian & Healthy Platform (Chay Xanh)** được thiết kế theo mô hình **Layered Architecture (Kiến trúc phân tầng)** chuẩn công nghiệp dành cho Express.js / Node.js kết hợp với **Prisma ORM**, cơ sở dữ liệu **PostgreSQL**, kiểm thử tự động với **Vitest**, và xác thực dữ liệu đầu vào bằng **Zod**.

---

## 📁 Cấu trúc thư mục

```text
server/
├── .env                       # File cấu hình biến môi trường cục bộ (không commit)
├── .env.example               # Mẫu biến môi trường cho thành viên nhóm
├── package.json               # Quản lý dependencies & scripts (Express, Prisma, Vitest, Zod...)
├── index.js                   # Forwarder entry point tới src/server.js
├── prisma/                    # Quản lý cấu trúc Database ORM & Seed
│   ├── schema.prisma          # Định nghĩa 23 models và relationships của hệ thống
│   ├── seed.js                # Runner nạp toàn bộ seed.sql & tự động xác thực
│   └── seed.sql               # Toàn bộ 56 câu lệnh SQL dữ liệu mẫu hệ thống & website mở rộng
├── tests/                     # Test suites kiểm thử tự động
│   ├── app.test.js            # Kiểm thử API boundary & Zod validation
│   ├── places.test.js         # Kiểm thử Places API & Cache & Rate Limiting
│   └── workspace.integration.mjs # Kiểm thử tích hợp toàn bộ luồng Database & Workspace
└── src/
    ├── app.js                 # Khởi tạo Express app, global middlewares, routes, error handlers
    ├── server.js              # Entry point khởi chạy HTTP server, graceful shutdown DB
    ├── validators.js          # Khai báo Zod schemas kiểm thực dữ liệu (Body & Query & Params)
    │
    ├── config/                # Quản lý cấu hình tập trung
    │   ├── index.js           # Đọc biến môi trường, thiết lập defaults (PORT, DB, JWT, CORS)
    │   └── prisma.js          # Khởi tạo PrismaClient singleton tái sử dụng kết nối pool
    │
    ├── constants/             # Quản lý các hằng số hệ thống
    │   ├── httpStatus.js      # Mã trạng thái HTTP chuẩn (200, 201, 400, 401, 403, 404, 500...)
    │   ├── postTypes.js       # Loại bài viết, vote, bữa ăn, giới tính
    │   ├── roles.js           # Phân quyền người dùng (ADMIN = 1, USER = 2)
    │   ├── status.js          # Trạng thái tài khoản, bài viết, báo cáo
    │   └── index.js           # Re-export constants
    │
    ├── middlewares/           # Middleware trung gian của Express
    │   ├── asyncMiddleware.js # Wrapper asyncHandler tự động bắt lỗi không đồng bộ
    │   ├── authMiddleware.js  # Xác thực JWT Bearer token và gán user vào req.user
    │   ├── errorMiddleware.js # Middleware xử lý 404 và Global Error Handler
    │   ├── requestId.js       # Gán và quản lý mã X-Request-Id theo dõi luồng request
    │   ├── validationMiddleware.js # Middleware validate request payload/params theo Zod
    │   └── index.js           # Re-export middlewares
    │
    ├── utils/                 # Các hàm tiện ích dùng chung
    │   ├── apiError.js        # Lớp tùy biến ApiError chuẩn hóa mã lỗi
    │   ├── apiResponse.js     # Chuẩn hóa định dạng phản hồi REST API
    │   ├── envelope.js        # Chuẩn hóa định dạng envelope response (success/error/meta)
    │   ├── jwt.js             # Tiện ích ký, mã hóa và verify JWT token
    │   └── index.js           # Re-export utils
    │
    ├── services/              # Tầng Business Logic kết nối Prisma ORM & Database
    │   ├── auth.service.js    # Nghiệp vụ xác thực (Đăng ký, Đăng nhập, mã hóa bcrypt)
    │   ├── blog.service.js    # Nghiệp vụ Blog (CRUD, ACID transaction đồng bộ bảng Post)
    │   ├── video.service.js   # Nghiệp vụ Video (CRUD, ACID transaction đồng bộ bảng Post)
    │   ├── comment.service.js # Nghiệp vụ Bình luận (CRUD theo bài viết)
    │   ├── vote.service.js    # Nghiệp vụ Bình chọn (Upsert PostVote, tính điểm up/down)
    │   ├── search.service.js  # Tìm kiếm Blog & Video bằng PostgreSQL Insensitive Search
    │   ├── recommendation.service.js # Thuật toán gợi ý Video & Nhà hàng
    │   ├── places.service.js  # Tìm kiếm địa điểm chay lân cận (Geolib) & từ khóa (Fuse.js)
    │   └── index.js
    │
    ├── controllers/           # Tầng Controllers (Tiếp nhận Req, chuẩn hóa response)
    │   ├── auth.controller.js
    │   ├── blog.controller.js
    │   ├── video.controller.js
    │   ├── comment.controller.js
    │   ├── vote.controller.js
    │   ├── search.controller.js
    │   ├── recommendation.controller.js
    │   ├── places.controller.js
    │   └── index.js
    │
    └── routes/                # Tầng Routes (Định tuyến API Endpoints)
        ├── auth.route.js      # /api/auth (Đăng ký, Đăng nhập, Profile)
        ├── blog.route.js      # /api/blogs (CRUD bài viết blog chay)
        ├── video.route.js     # /api/videos (CRUD video hướng dẫn)
        ├── comment.route.js   # /api/comments (Bình luận bài viết)
        ├── vote.route.js      # /api/votes (Bình chọn bài viết)
        ├── search.route.js    # /api/search (Tìm kiếm toàn cục)
        ├── recommendation.route.js # /api/recommendations (Gợi ý nội dung)
        ├── places.route.js    # /api/places (Địa điểm quán ăn chay lân cận)
        ├── workspace.route.js # /api/workspace (Catalog, nhật ký cá nhân, thực đơn tuần, đề xuất quán)
        └── index.js           # Gom toàn bộ route vào router chính (/api/...)
```

---

## 🔄 Luồng xử lý Request (Request Lifecycle)

```text
Client Request
      │
      ▼
[Express App & Global Middlewares]
  ├── CORS (quản lý truy cập từ Client URL)
  ├── JSON Parser & URL-encoded (giới hạn payload 1MB)
  └── X-Request-Id Tracing
      │
      ▼
[Routes Layer (src/routes/)]
      │
      ├── [Validation Middleware (Zod)] ──► Thất bại ──► 400 Bad Request
      ├── [Auth Middleware (JWT)]       ──► Không hợp lệ ──► 401 Unauthorized
      │
      ▼
[Controllers Layer (src/controllers/)] (Nhận req, extract params/payload, gọi service)
      │
      ▼
[Services Layer (src/services/)] (Xử lý nghiệp vụ, kiểm tra ràng buộc, tính toán)
      │
      ▼
[Prisma ORM Client (src/config/prisma.js)] (Type-safe queries, Prisma Transactions)
      │
      ▼
[PostgreSQL Database (vegetarian_db)]
      │
      ├── [Thành công] ──► sendSuccess / sendCreated / envelope
      │
      └── [Nếu phát sinh lỗi] ──► Global Error Handler (src/middlewares/errorMiddleware.js)
```

---

## 📡 Danh sách API Endpoints

### 1. Xác thực & Tài khoản (`/api/auth`)
| Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Không | Đăng ký tài khoản người dùng mới (email, password, full_name) |
| `POST` | `/api/auth/login` | Không | Đăng nhập hệ thống, nhận JWT access token |
| `GET` | `/api/auth/me` | Có (Bearer Token) | Lấy thông tin tài khoản hiện tại |

### 2. Bài viết Blog (`/api/blogs`)
| Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/blogs` | Không | Lấy danh sách blog (hỗ trợ phân trang, sắp xếp) |
| `GET` | `/api/blogs/:id` | Không | Xem chi tiết bài viết blog theo ID |
| `POST` | `/api/blogs` | Có (Bearer Token) | Tạo bài viết blog mới |
| `PUT` | `/api/blogs/:id` | Có (Bearer Token) | Cập nhật bài viết blog (chỉ tác giả) |
| `DELETE` | `/api/blogs/:id` | Có (Bearer Token) | Xóa bài viết blog (chỉ tác giả hoặc Admin) |

### 3. Video Hướng dẫn (`/api/videos`)
| Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/videos` | Không | Lấy danh sách video món chay |
| `GET` | `/api/videos/:id` | Không | Xem chi tiết video theo ID |
| `POST` | `/api/videos` | Có (Bearer Token) | Đăng tải video hướng dẫn mới |
| `PUT` | `/api/videos/:id` | Có (Bearer Token) | Chỉnh sửa thông tin video |
| `DELETE` | `/api/videos/:id` | Có (Bearer Token) | Xóa video |

### 4. Bình luận (`/api/comments`)
| Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/comments/post/:postId` | Không | Lấy danh sách bình luận của bài viết |
| `POST` | `/api/comments` | Có (Bearer Token) | Thêm bình luận mới vào bài viết |
| `PUT` | `/api/comments/:id` | Có (Bearer Token) | Chỉnh sửa nội dung bình luận |
| `DELETE` | `/api/comments/:id` | Có (Bearer Token) | Xóa bình luận |

### 5. Bình chọn & Đánh giá (`/api/votes`)
| Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/votes/post/:postId` | Không | Xem tổng quan lượt vote up/down của bài viết |
| `POST` | `/api/votes` | Có (Bearer Token) | Thực hiện vote up (+1) hoặc down (-1) |
| `DELETE` | `/api/votes/post/:postId` | Có (Bearer Token) | Hủy lượt vote đã bình chọn |

### 6. Tìm kiếm & Gợi ý (`/api/search`, `/api/recommendations`)
| Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/search?q={keyword}` | Không | Tìm kiếm toàn cục Blog & Video theo từ khóa |
| `GET` | `/api/recommendations/suggest?q={k}` | Không | Gợi ý nội dung liên quan theo từ khóa tìm kiếm |

### 7. Quán ăn & Địa điểm chay (`/api/places`)
| Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/places/nearby?lat={lat}&lng={lng}&radius={m}` | Không (Rate limit) | Tìm quán chay gần đây theo tọa độ GPS và bán kính |
| `GET` | `/api/places/search?q={keyword}` | Không (Rate limit) | Tìm quán chay theo tên hoặc món ăn |

### 8. Nghiệp vụ Workspace & Cá nhân hóa (`/api/workspace`)
| Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/workspace/catalog` | Không | Lấy dữ liệu công khai: danh mục, chế độ ăn, nguyên liệu, công thức, bài viết, quán ăn |
| `GET` | `/api/workspace/mine` | Có (Bearer Token) | Lấy danh sách bài viết cá nhân của người dùng hiện tại |
| `GET` | `/api/workspace/journal` | Có (Bearer Token) | Lấy hồ sơ dinh dưỡng, nhật ký bữa ăn và kế hoạch tuần |
| `PATCH` | `/api/workspace/profile` | Có (Bearer Token) | Cập nhật chiều cao, cân nặng, mục tiêu calo cá nhân |
| `POST` | `/api/workspace/diary` | Có (Bearer Token) | Thêm bữa ăn vào nhật ký ăn uống |
| `DELETE` | `/api/workspace/diary/:id` | Có (Bearer Token) | Xóa món ăn khỏi nhật ký cá nhân |
| `PUT` | `/api/workspace/plan` | Có (Bearer Token) | Lên kế hoạch món ăn theo ngày trong tuần |
| `POST` | `/api/workspace/plan/record` | Có (Bearer Token) | Lưu toàn bộ món từ kế hoạch tuần vào nhật ký ngày |
| `POST` | `/api/workspace/restaurants` | Có (Bearer Token) | Đề xuất địa điểm quán chay mới |
| `POST` | `/api/workspace/restaurants/:id/reviews` | Có (Bearer Token) | Đăng đánh giá và chấm sao nhà hàng |

### 9. Giám sát hệ thống (`/`)
| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/` | Trạng thái máy chủ Express |
| `GET` | `/health` | Kiểm tra trạng thái sức khỏe máy chủ (`UP`, timestamp, environment) |

---

## 🔑 Tài khoản mẫu phục vụ kiểm thử (Demo Accounts)

| Vai trò | Email | Mật khẩu | Trạng thái | Nguồn dữ liệu |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@swp391.com` | `123456` | `ACTIVE` | `seed.sql` |
| **User** | `user@swp391.com` | `123456` | `ACTIVE` | `seed.sql` |
| **User** | `lan.nguyen@swp391.com` | `123456` | `ACTIVE` | `seed.sql` |
| **User (Khóa)** | `spammer@swp391.com` | `123456` | `LOCKED` | `seed.sql` |
| **User (Đầu bếp)** | `tung.bepchay@swp391.com` | `123456` | `ACTIVE` | `seed.sql` |

---

## 🚀 Hướng dẫn khởi chạy

### 1. Cài đặt dependencies:
```bash
npm install
```

### 2. Thiết lập biến môi trường `.env`:
Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```
Nội dung file `.env` tham khảo:
```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/vegetarian_db?schema=public"
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-secure-jwt-secret-key-at-least-32-chars
JWT_EXPIRES_IN=7d
PLACES_RATE_LIMIT=60
```

### 3. Đồng bộ Cơ sở dữ liệu với Prisma ORM:
```bash
# Tạo Prisma Client type-safe
npm run prisma:generate

# Tự áp dụng migration còn thiếu rồi seed; chỉ dùng DB mới hoặc DB được phép xóa dữ liệu
npm run seed

# (Tùy chọn) Mở giao diện trực quan Prisma Studio để xem dữ liệu
npm run prisma:studio
```

`npm run seed`, `npm run db:seed` và `npx prisma db seed` dùng chung luồng: `prisma migrate deploy` → `seed.js` → `prisma/seed.sql`. Migration lỗi thì dừng trước khi seed; migration đã áp dụng được bỏ qua. DB mới nhận toàn bộ lịch sử migration, bao gồm 5 thay đổi đã kiểm tra:

- `20261023113000_schema_indexes_and_decimal_optimization`: giá `Decimal(18,2)` và các index.
- `20261025113000_health_history_recorded_date_timestamptz`: ngày ghi nhận sức khỏe có múi giờ.
- `20261026075600_add_restaurant_source_place_id_status`: nguồn, mã địa điểm và trạng thái nhà hàng.
- `20261026124500_add_food_scan_ai_generation_type`: loại tác vụ `FOOD_SCAN`.
- `20261028112816_add_content_moderation_jobs`: bảng job và phiên bản nội dung kiểm duyệt.

File SQL chỉ nạp dữ liệu, không sao chép lệnh thay đổi schema từ migration. Nếu nạp trực tiếp bằng `psql`, phải chạy `npx prisma migrate deploy` trước. **Seed hiện dùng `TRUNCATE ... CASCADE`: chạy lại sẽ xóa dữ liệu hiện có, bao gồm job kiểm duyệt.** Với DB đang sử dụng, chỉ chạy `npx prisma migrate deploy`, không chạy seed. Chạy trực tiếp `node prisma/seed.js` cũng yêu cầu DB đã được migrate.

Sau seed, `content_moderation_jobs` rỗng, `moderation_version` của bài viết/bình luận bằng `0` (chưa được AI quét), không có cờ AI hoặc kết quả kiểm duyệt gán sẵn. Các mục bị ẩn trong bộ dữ liệu dùng trạng thái `HIDDEN`. Seed không gọi AI và không tự tạo job cho nội dung cũ.

Cấu hình kiểm duyệt có sẵn trong `.env.example`: `CONTENT_MODERATION_ENABLED=false`, `CONTENT_MODERATION_TIMEOUT_MS=30000`, `CONTENT_MODERATION_MAX_ATTEMPTS=3`. Để bật, cấu hình cùng khóa nội bộ BE/AI, khởi chạy AI Service, đặt cờ `true`, restart API rồi chạy `npm run worker:content-moderation` trong terminal local riêng. Job được trả ngay bằng `202`; người dùng không phải đợi AI xong. Không có worker thì nội dung mới ở trạng thái chờ. Xem [hướng dẫn vận hành, chính sách và khôi phục lỗi](../docs/CONTENT_MODERATION.md), [OpenAPI](../docs/content-moderation-openapi.json).

### 4. Khởi chạy Server:
- **Chế độ phát triển (Auto-reload với nodemon):**
  ```bash
  npm run dev
  ```
- **Chế độ Production:**
  ```bash
  npm start
  ```

### 5. Chạy kiểm thử tự động:
```bash
# Chạy đầy đủ unit & integration tests với Vitest trên DB _test
npm test

# Chỉ chạy kiểm thử kiểm duyệt và migration/seed
npm run test:content-moderation

# Kiểm thử tích hợp toàn bộ luồng nghiệp vụ Database & Workspace
npm run test:database

# Chế độ watch tự động chạy lại khi thay đổi code
npm run test:watch
```

---

## 🛡️ Quy ước phát triển & Bảo mật

1. **Bảo mật biến môi trường:** Tuyệt đối không commit file `.env`. Mỗi thành viên tự tạo cấu hình database local từ `.env.example`.
2. **Xác thực danh tính:** Mọi thao tác ghi dữ liệu (tạo bài viết, bình luận, vote) đều lấy `userId` từ JWT Token đã được xác thực ở middleware, không tin cậy dữ liệu truyền từ client body.
3. **Xác thực dữ liệu (Validation):** Toàn bộ dữ liệu đầu vào (request body, params, queries) đều được kiểm tra nghiêm ngặt qua Zod schema trước khi xuống tầng Service.
4. **Kiểm tra trước khi commit/push:** Chạy `npm test` và `npx prisma validate` để đảm bảo code không phá vỡ logic sẵn có.
