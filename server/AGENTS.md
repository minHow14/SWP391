# QUY TẮC BACK-END (EXPRESS) & DATABASE (POSTGRESQL + PRISMA)

## 1. Công nghệ chốt cứng (`server/`)

- **Runtime & Framework:** Node.js (≥ 20 LTS) + Express.js sử dụng ES Modules (`"type": "module"`, dùng `import/export`, chỉ dùng `const`/`let`).
- **ORM & DB:** Prisma (Prisma Client + Prisma Migrate) với PostgreSQL (≥ 15). Ghi rõ phiên bản trong `package.json` và `README.md`.
- **Validation:** Dùng **Zod** cho cả request (`body`, `query`, `params`) và biến môi trường lúc khởi động (`src/config/env.js`).
- **Logging & Testing:** Dùng **Pino** để log có cấu trúc; dùng **Vitest + Supertest** để test.
- **Linter:** Cấu hình sẵn ESLint + Prettier.

## 2. Cấu trúc thư mục & Phân tách trách nhiệm (SRP)

```text
server/
├── prisma/
│   ├── schema.prisma         # Nguồn sự thật duy nhất về cấu trúc DB
│   ├── migrations/           # Do Prisma Migrate sinh ra, commit vào Git
│   └── seed.js                # Dữ liệu khởi tạo thiết yếu (bắt buộc idempotent bằng upsert)
├── uploads/                  # Lưu file upload local (thêm vào .gitignore)
├── src/
│   ├── config/               # env.js (validate bằng Zod), prisma.js (singleton), logger.js
│   ├── routes/               # Chỉ khai báo đường dẫn, gắn validator và middleware
│   ├── controllers/          # Nhận req, gọi service, trả res chuẩn. KHÔNG chứa logic nghiệp vụ
│   ├── services/             # Toàn bộ logic nghiệp vụ, điều phối transaction, gọi AI Service
│   ├── repositories/          # NƠI DUY NHẤT được import và gọi Prisma Client
│   ├── validators/            # Các schema Zod
│   ├── middlewares/           # auth, rbac, errorHandler, rateLimiter, upload (multer)
│   ├── constants/             # errorCode, enums, HTTP status
│   ├── utils/                 # asyncHandler, AppError, responseFormatter
│   ├── app.js
│   └── server.js
└── tests/                    # Unit test & Integration test (chạy trên DB test riêng)
```

- **Quy tắc Async:** Mọi controller bất đồng bộ bắt buộc bọc trong `asyncHandler` để đẩy lỗi về `errorHandler` tập trung, tránh crash tiến trình Node.

## 3. Quy tắc thiết kế `schema.prisma` & Migration

- **Mapping tên:** Việc chuyển đổi `snake_case` (DB) ↔ `camelCase` (code) chỉ thực hiện duy nhất tại `schema.prisma` qua `@@map` (bảng số nhiều) và `@map` (cột). Cấm tự viết hàm convert trong code JS.
- **Khóa chính:** Thống nhất dùng `id String @id @default(uuid()) @db.Uuid` cho mọi model.
- **Timestamps:** Mọi model bắt buộc có:
  - `createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)`
  - `updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)`
  - Thêm `deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)` nếu bảng cần xóa mềm.
- **Kiểu dữ liệu:** Tiền tệ bắt buộc dùng `Decimal @db.Decimal(18, 2)` (tuyệt đối không dùng `Float`). Trạng thái cố định dùng `enum`.
- **Quan hệ & Index:** Khai báo rõ `onDelete`, `onUpdate`. Đánh index cho mọi khóa ngoại và cột hay lọc/sắp xếp, đặt tên tường minh bằng tham số `map` (vd: `@@index([userId], map: "idx_orders_user_id")`, `@@unique([email], map: "uq_users_email")`).
- **Migration:** Mọi thay đổi schema phải qua `npx prisma migrate dev --name <mo_ta_ro_rang>`. Cấm dùng `prisma db push` khi có dữ liệu cần giữ. Cảnh báo người dùng trước mọi thay đổi có nguy cơ mất dữ liệu (xóa cột/bảng, đổi kiểu).

## 4. Quy tắc sử dụng Prisma Client & Xử lý lỗi

- **Singleton & Shutdown:** Chỉ khởi tạo một instance `PrismaClient` duy nhất tại `src/config/prisma.js` và gọi `prisma.$disconnect()` khi nhận tín hiệu `SIGINT`, `SIGTERM`.
- **Bảo mật dữ liệu & Hiệu năng:**
  - Luôn dùng `select` để giới hạn cột trả về; tuyệt đối không để lọt `passwordHash` hoặc thông tin nhạy cảm ra khỏi repository.
  - Tránh lỗi N+1: Dùng `include`/`select` lồng nhau hoặc truy vấn theo lô (`in: [...]`), cấm gọi query trong vòng lặp.
  - Phân trang bắt buộc cho mọi API danh sách (`skip`/`take` hoặc cursor), giới hạn `limit` tối đa (max 100), `orderBy` luôn kèm `id` làm tiêu chí phụ để ổn định thứ tự.
  - Cấm dùng `$queryRawUnsafe` / `$executeRawUnsafe`. Nếu cần raw query phải dùng tagged template `$queryRaw`.
- **Transaction:** Điều phối ở tầng `services` bằng `prisma.$transaction(async (tx) => {...})`. Mọi hàm trong `repositories` phải nhận tham số cuối là `db = prisma` để dùng chung được cho cả truy vấn thường lẫn transaction.
- **Ánh xạ lỗi Prisma (Tại Error Middleware):** Bắt `Prisma.PrismaClientKnownRequestError`:
  - `P2002` (trùng unique) → `409 Conflict` (kèm `errorCode` cụ thể như `EMAIL_ALREADY_EXISTS`).
  - `P2025` (không tìm thấy) → `404 Not Found` (`RESOURCE_NOT_FOUND`).
  - `P2003` (lỗi khóa ngoại) → `400` hoặc `409` (`FOREIGN_KEY_CONSTRAINT_FAILED`). Không bao giờ trả lỗi Prisma/SQL thô hay stack trace ra client.

## 5. Bảo mật, Upload File Local & Gọi AI Service

- **Bảo mật ứng dụng:** Cấu hình chặt `helmet`, `cors` (chỉ mở origin của FE), `express-rate-limit`. Mật khẩu băm bằng `bcrypt`/`argon2`. JWT dùng Access Token ngắn hạn + Refresh Token trong `httpOnly` cookie. Không log mật khẩu, token hay `DATABASE_URL`.
- **Upload file:** Dùng `multer` lưu vào `server/uploads/`, đổi tên file sang UUID, giới hạn dung lượng, kiểm tra chặt MIME type, chỉ lưu đường dẫn tương đối (vd: `/uploads/avatars/uuid.png`) vào DB.
- **Gọi AI Service:** Gửi kèm header `X-Internal-Api-Key`, cài đặt `timeout` rõ ràng, bắt lỗi đầy đủ. Với tác vụ AI nặng (> 3s), tạo bản ghi Job trong DB (`PENDING` → `PROCESSING` → `COMPLETED`/`FAILED`) và trả về `202 Accepted` kèm `jobId`.
- **Testing:** Integration test phải nạp `.env.test` trỏ vào database `_test` riêng biệt, tuyệt đối không chạy test làm ảnh hưởng DB phát triển.
