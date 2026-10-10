# Backend Server Architecture - SWP391

Hệ thống API backend cho dự án **SWP391 - Vegetarian & Healthy Platform** được thiết kế theo mô hình **Layered Architecture (Kiến trúc phân tầng)** chuẩn công nghiệp dành cho Express.js / Node.js kết hợp với **Prisma ORM** và cơ sở dữ liệu **PostgreSQL**.

---

## 📁 Cấu trúc thư mục

```text
server/
├── .env                       # File cấu hình biến môi trường cục bộ (không commit)
├── .env.example               # Mẫu biến môi trường cho thành viên nhóm
├── package.json               # Quản lý dependencies & scripts (Express, Prisma, Cors...)
├── index.js                   # Forwarder entry point (đảm bảo tương thích ngược)
├── prisma/                    # Quản lý cấu trúc Database ORM
│   └── schema.prisma          # Định nghĩa 23 models và relationships của hệ thống
└── src/
    ├── app.js                 # Khởi tạo Express app, global middlewares, routes, error handlers
    ├── server.js              # Entry point khởi chạy HTTP server, graceful shutdown DB
    │
    ├── config/                # Quản lý cấu hình tập trung
    │   ├── index.js           # Đọc biến môi trường, thiết lập defaults (PORT, DB, JWT, CORS)
    │   └── prisma.js          # Khởi tạo PrismaClient singleton tái sử dụng kết nối
    │
    ├── constants/             # Quản lý các hằng số hệ thống
    │   ├── httpStatus.js      # Mã trạng thái HTTP (200, 201, 400, 404, 500...)
    │   ├── postTypes.js       # Loại bài viết, vote, bữa ăn, giới tính
    │   ├── roles.js           # Phân quyền người dùng (ADMIN, USER)
    │   ├── status.js          # Trạng thái tài khoản, bài viết, báo cáo
    │   └── index.js           # Re-export constants
    │
    ├── data/                  # Nguồn dữ liệu
    │   └── mockStore.js       # [Deprecated] Dữ liệu mẫu lịch sử (đã chuyển sang PostgreSQL)
    │
    ├── middlewares/           # Middleware trung gian của Express
    │   ├── asyncMiddleware.js # Wrapper asyncHandler tự động bắt lỗi không cần try/catch
    │   ├── errorMiddleware.js # Middleware xử lý 404 và Global Error Handler
    │   └── index.js           # Re-export middlewares
    │
    ├── utils/                 # Các hàm tiện ích dùng chung
    │   ├── apiError.js        # Lớp tùy biến ApiError chuẩn hóa mã lỗi
    │   ├── apiResponse.js     # Chuẩn hóa định dạng phản hồi REST API
    │   └── index.js           # Re-export utils
    │
    ├── services/              # Tầng Business Logic kết nối Prisma ORM
    │   ├── blog.service.js    # Nghiệp vụ Blog (CRUD, ACID transaction với Post)
    │   ├── video.service.js   # Nghiệp vụ Video (CRUD, ACID transaction với Post)
    │   ├── comment.service.js # Nghiệp vụ Bình luận (CRUD theo bài viết)
    │   ├── vote.service.js    # Nghiệp vụ Bình chọn (Upsert PostVote, tính điểm)
    │   ├── search.service.js  # Tìm kiếm Blog & Video bằng PostgreSQL Insensitive Search
    │   ├── recommendation.service.js # Thuật toán gợi ý Video & Nhà hàng
    │   └── index.js
    │
    ├── controllers/           # Tầng Controllers (Tiếp nhận Req, chuẩn hóa response)
    │   ├── blog.controller.js
    │   ├── video.controller.js
    │   ├── comment.controller.js
    │   ├── vote.controller.js
    │   ├── search.controller.js
    │   ├── recommendation.controller.js
    │   └── index.js
    │
    └── routes/                # Tầng Routes (Định tuyến API Endpoints)
        ├── blog.route.js
        ├── video.route.js
        ├── comment.route.js
        ├── vote.route.js
        ├── search.route.js
        ├── recommendation.route.js
        └── index.js           # Gom toàn bộ route vào router chính (/api/...)
```

---

## 🔄 Luồng xử lý Request (Request Lifecycle)

```
Client Request
      │
      ▼
[Express App & Middlewares] (CORS, JSON Parser, URL-encoded)
      │
      ▼
[Routes Layer (src/routes/)] (/api/blogs, /api/videos, /api/comments, ...)
      │
      ▼
[Controllers Layer (src/controllers/)] (Nhận req, gọi service, trả sendSuccess/sendCreated)
      │
      ▼
[Services Layer (src/services/)] (Nghiệp vụ, xác thực quan hệ, tính toán)
      │
      ▼
[Prisma ORM (src/config/prisma.js)] (Type-safe queries, Transactions)
      │
      ▼
[PostgreSQL Database (vegetarian_db)]
      │
      ▼ (Nếu phát sinh lỗi)
[Global Error Handler (src/middlewares/errorMiddleware.js)]
```

---

## 🚀 Hướng dẫn khởi chạy

1. Cài đặt các thư viện cần thiết:
   ```bash
   npm install
   ```

2. Tạo file cấu hình môi trường `.env`:
   ```bash
   cp .env.example .env
   # Điền DATABASE_URL=postgresql://postgres:password@localhost:5432/vegetarian_db
   ```

3. Sinh Prisma Client từ schema:
   ```bash
   npm run prisma:generate
   ```

4. Chạy server ở chế độ phát triển (auto-reload với nodemon):
   ```bash
   npm run dev
   ```

5. Chạy server ở chế độ Production:
   ```bash
   npm start
   ```

6. Kiểm tra trạng thái hoạt động:
   - Health check: `http://localhost:5000/health`
   - API Blogs: `http://localhost:5000/api/blogs`
   - Prisma Studio: `npm run prisma:studio`
