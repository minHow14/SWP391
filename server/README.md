# ⚙️ Tài Liệu Kỹ Thuật Phân Hệ Backend (Server) - Chay Xanh

> **Dự án:** SWP391 - Vegetarian & Healthy Platform (Chay Xanh)  
> **Kiến trúc:** Layered Architecture (Phân tầng) + AI Gateway Pattern  
> **Ngăn xếp công nghệ:** Node.js (ESM) + Express 5 + Prisma 6 + PostgreSQL 15+ + Zod + Vitest  
> **Điều hướng liên kết:** [Tổng quan dự án](../README.md) | [Tài liệu Frontend](../client/README.md) | [Tài liệu AI Service](../ai_service/README.md)

---

## 📑 Mục lục (Table of Contents)

1. [Tổng quan phân hệ Backend (Backend Overview)](#1-tổng-quan-phân-hệ-backend-backend-overview)
2. [Ngăn xếp công nghệ thực tế (Technology Stack)](#2-ngăn-xếp-công-nghệ-thực-tế-technology-stack)
3. [Kiến trúc phân tầng (Layered Architecture)](#3-kiến-trúc-phân-tầng-layered-architecture)
4. [Cấu trúc thư mục chi tiết (Project Structure)](#4-cấu-trúc-thư-mục-chi-tiết-project-structure)
5. [Vòng đời xử lý yêu cầu (Request Lifecycle)](#5-vòng-đời-xử-lý-yêu-cầu-request-lifecycle)
6. [Cấu trúc định tuyến & Tiền tố API (Routes Architecture)](#6-cấu-trúc-định-tuyến--tiền-tố-api-routes-architecture)
7. [Tầng Điều khiển (Controllers Responsibility)](#7-tầng-điều-khiển-controllers-responsibility)
8. [Tầng Nghiệp vụ (Services Responsibility)](#8-tầng-nghiệp-vụ-services-responsibility)
9. [Tầng Truy vấn Dữ liệu (Repositories Pattern)](#9-tầng-truy-vấn-dữ-liệu-repositories-pattern)
10. [Hệ thống Middleware trung gian](#10-hệ-thống-middleware-trung-gian)
11. [Kiểm thực & Xử lý lỗi tập trung (Validation & Error Handling)](#11-kiểm-thực--xử-lý-lỗi-tập-trung-validation--error-handling)
12. [Cơ chế Xác thực, Thu hồi phiên & Phân quyền (Auth & RBAC)](#12-cơ-chế-xác-thực-thu-hồi-phiên--phân-quyền-auth--rbac)
13. [Kiến trúc Cơ sở dữ liệu (Database Architecture & Prisma)](#13-kiến-trúc-cơ-sở-dữ-liệu-database-architecture--prisma)
14. [Quản trị Migration Cơ sở dữ liệu](#14-quản-trị-migration-cơ-sở-dữ-liệu)
15. [Dữ liệu khởi tạo (Database Seeding)](#15-dữ-liệu-khởi-tạo-database-seeding)
16. [Tài liệu hóa API chi tiết (API Endpoints Documentation)](#16-tài-liệu-hóa-api-chi-tiết-api-endpoints-documentation)
17. [Tích hợp AI Microservice (AI Gateway Integration)](#17-tích-hợp-ai-microservice-ai-gateway-integration)
18. [Tích hợp dịch vụ bên ngoài (External APIs: ZIOMAP, SMTP, YouTube)](#18-tích-hợp-dịch-vụ-bên-ngoài-external-apis-ziomap-smtp-youtube)
19. [Bảng biến môi trường (Environment Variables)](#19-bảng-biến-môi-trường-environment-variables)
20. [Hướng dẫn cài đặt & Khởi động (Installation & Setup)](#20-hướng-dẫn-cài-đặt--khởi-động-installation--setup)
21. [Danh mục lệnh phát triển (Development Commands)](#21-danh-mục-lệnh-phát-triển-development-commands)
22. [Chiến lược kiểm thử tự động (Testing với Vitest & DB Test)](#22-chiến-lược-kiểm-thử-tự-động-testing-với-vitest--db-test)
23. [Quy chuẩn bảo mật máy chủ (Security Notes)](#23-quy-chuẩn-bảo-mật-máy-chủ-security-notes)
24. [Xử lý sự cố thường gặp (Troubleshooting)](#24-xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. Tổng quan phân hệ Backend (Backend Overview)

Phân hệ Backend của **Chay Xanh** được xây dựng trên nền tảng **Node.js (ES Modules)** và **Express 5**, đóng vai trò là hạt nhân trung tâm xử lý dữ liệu và điều phối logic của toàn bộ hệ thống.

### Trách nhiệm cốt lõi:
- **API Gateway trung tâm:** Là cửa ngõ duy nhất tiếp nhận các yêu cầu từ Frontend, kiểm soát rate limit, xác thực người dùng và bảo vệ dữ liệu.
- **Quản lý dữ liệu ACID:** Tương tác với PostgreSQL thông qua Prisma ORM, đảm bảo tính toàn vẹn và phân chia quyền hạn truy cập theo mô hình Repository Pattern.
- **AI Gateway & Quota Manager:** Quản lý hạn ngạch gọi AI cho khách vãng lai (`guest_quotas`), chuyển tiếp yêu cầu an toàn sang AI Microservice kèm khóa bảo mật nội bộ, lưu vết nhật ký (`ai_logs`) và lịch sử sinh nội dung (`ai_generations`).
- **Hệ thống Worker chạy nền (Background Workers):** Xử lý kiểm duyệt nội dung tự động bằng AI (`contentModerationWorker.js`) và xử lý trích xuất công thức từ video YouTube (`videoRecipeSummaryWorker.js`) dựa trên cơ chế khóa phân tán (Lease Token).

---

## 2. Ngăn xếp công nghệ thực tế (Technology Stack)

Đối chiếu trực tiếp từ `server/package.json` và `server/package-lock.json`:

| Công nghệ | Phiên bản | Mục đích & Trách nhiệm |
| :--- | :--- | :--- |
| **Node.js** | `>= 22.22.0` | Runtime thực thi JavaScript phía máy chủ sử dụng ES Modules (`import/export`). |
| **Express.js** | `^5.2.1` | Web framework xây dựng REST API, quản lý router và middleware. |
| **Prisma Client & CLI**| `^6.19.3` | ORM thế hệ mới quản trị schema, migration và thao tác dữ liệu PostgreSQL. |
| **PostgreSQL** | `>= 15.0` | Hệ quản trị cơ sở dữ liệu quan hệ lưu trữ chính. |
| **Zod** | `^4.6.5` | Thư viện kiểm thực dữ liệu (Request body, params, query, env variables). |
| **Pino & Pino-HTTP** | `10.4.0` / `^11.0.0` | Logger có cấu trúc tốc độ cao, hỗ trợ truy vết lỗi theo `X-Request-Id`. |
| **Bcryptjs** | `^3.0.3` | Băm mật khẩu người dùng với salt rounds an toàn chống rainbow table. |
| **Jsonwebtoken** | `^9.0.3` | Sinh và xác minh chữ ký số cho Access Token và Refresh Token. |
| **Helmet** | `^8.3.0` | Thiết lập các tiêu đề HTTP bảo mật (CSP, Cross-Origin Resource Policy). |
| **Express Rate Limit** | `^8.7.1` | Giới hạn tần suất request bảo vệ endpoint xác thực và public API. |
| **Nodemailer** | `^10.3.1` | Gửi email thông báo và liên kết đặt lại mật khẩu qua giao thức SMTP. |
| **Multer** | `^2.4.0` | Xử lý nhận tệp tin tải lên (ảnh đại diện, bài viết) và lưu trữ cục bộ. |
| **Vitest & Supertest** | `^5.0.3` / `^7.3.1` | Khung kiểm thử đơn vị và tích hợp API trên cơ sở dữ liệu test riêng. |

---

## 3. Kiến trúc phân tầng (Layered Architecture)

Backend tuân thủ nghiêm ngặt mô hình kiến trúc phân tầng chuẩn công nghiệp:

```mermaid
flowchart TD
    Client["Client HTTP Request"] --> Route["Route Layer (src/routes/)"]
    Route --> Middlewares["Middleware Layer (Auth, RBAC, Validation, RateLimit)"]
    Middlewares --> Controller["Controller Layer (src/controllers/)"]
    Controller --> Service["Service Layer (src/services/)"]
    Service --> Repository["Repository Layer (src/repositories/)"]
    Repository --> Prisma["Prisma Client 6 (src/config/prisma.js)"]
    Prisma --> DB[("PostgreSQL 15+")]

    Service -.-> AIService["AI Microservice (Port 8000 via Internal API Key)"]
    Service -.-> External["External APIs (ZIOMAP, SMTP, yt-dlp)"]
```

### Nguyên tắc phân tách trách nhiệm:
1. **Routes:** Chỉ định nghĩa đường dẫn, gắn validator và middleware tương ứng.
2. **Controllers:** Tiếp nhận `req`, trích xuất dữ liệu đã được validate, gọi Service và định dạng dữ liệu trả về qua envelope chuẩn. **Tuyệt đối không chứa logic nghiệp vụ.**
3. **Services:** Chứa 100% logic nghiệp vụ, điều phối transaction, tính toán dữ liệu, gọi AI Service và các API bên ngoài.
4. **Repositories:** **Nơi duy nhất được phép import và gọi Prisma Client**. Tuyệt đối không gọi Prisma Client trực tiếp từ Controller hay Service.

---

## 4. Cấu trúc thư mục chi tiết (Project Structure)

```text
server/
├── prisma/
│   ├── schema.prisma          # Định nghĩa nguồn sự thật duy nhất về cấu trúc Database
│   ├── migrations/            # Thư mục lưu vết các bản migration SQL đã sinh ra
│   ├── seed.js                # Bộ thực thi nạp dữ liệu khởi tạo
│   └── seed.sql               # Dữ liệu hạt giống SQL mẫu hệ thống
│
├── uploads/                   # Thư mục lưu trữ tệp tin upload cục bộ (được phục vụ tĩnh)
│   ├── avatars/               # Ảnh đại diện thành viên
│   ├── posts/                 # Ảnh bài viết cộng đồng
│   ├── restaurants/           # Ảnh quán ăn chay
│   └── recipes/               # Ảnh công thức món ăn
│
├── src/
│   ├── config/                # Cấu hình tập trung toàn hệ thống
│   │   ├── env.js             # Đọc và validate biến môi trường bằng Zod
│   │   ├── prisma.js          # Khởi tạo PrismaClient singleton tái sử dụng connection pool
│   │   ├── logger.js          # Cấu hình logger Pino
│   │   ├── aiConfig.js        # Cấu hình URL và timeout AI Gateway
│   │   └── index.js           # Gom xuất cấu hình
│   │
│   ├── constants/             # Quản lý hằng số hệ thống
│   │   ├── roles.js           # Mã vai trò (ADMIN = 1, USER = 2)
│   │   ├── status.js          # Trạng thái tài khoản, bài viết, báo cáo vi phạm
│   │   ├── httpStatus.js      # Mã trạng thái HTTP chuẩn
│   │   └── postTypes.js       # Phân loại bài viết, vote, bữa ăn
│   │
│   ├── controllers/           # Tiếp nhận request & trả envelope JSON chuẩn
│   │   ├── auth.controller.js # Đăng ký, đăng nhập, làm mới token, cập nhật hồ sơ
│   │   ├── admin.controller.js# Thống kê, quản lý thành viên, kiểm duyệt, logs
│   │   ├── blog.controller.js # CRUD bài viết blog
│   │   ├── video.controller.js# CRUD bài đăng video
│   │   ├── comment.controller.js # Bình luận bài viết
│   │   ├── places.controller.js # Tìm kiếm quán ăn và giải mã ảnh ZIOMAP
│   │   ├── workspace.controller.js # Catalog, nhật ký dinh dưỡng, thực đơn, đề xuất quán
│   │   ├── ai.controller.js   # Tiếp nhận chat, lập thực đơn, quét ảnh chuyển sang AI
│   │   └── videoRecipeSummaryController.js # Tạo và theo dõi job trích xuất video
│   │
│   ├── services/              # Tầng Business Logic và điều phối tác vụ
│   │   ├── auth.service.js    # Nghiệp vụ xác thực, băm mật khẩu, token versioning
│   │   ├── admin.service.js   # Nghiệp vụ quản trị, khôi phục tài khoản, metrics
│   │   ├── workspace.service.js # Nghiệp vụ nhật ký, thực đơn, đánh giá quán
│   │   ├── places.service.js  # Tích hợp tìm kiếm địa điểm, tính khoảng cách GPS
│   │   ├── mailService.js     # Gửi email qua SMTP Nodemailer
│   │   ├── passwordResetService.js # Tạo và xác minh token khôi phục mật khẩu một lần
│   │   ├── aiTransportService.js # Gọi HTTP nội bộ sang FastAPI qua X-Internal-Api-Key
│   │   └── videoRecipeSummaryService.js # Quản trị vòng đời job trích xuất video
│   │
│   ├── repositories/          # Tầng tương tác trực tiếp với Prisma Client
│   │   ├── user.repository.js
│   │   ├── blog.repository.js
│   │   ├── post.repository.js
│   │   ├── place.repository.js
│   │   ├── workspace.repository.js
│   │   ├── aiLogRepository.js
│   │   └── videoRecipeSummaryJobRepository.js
│   │
│   ├── middlewares/           # Các middleware trung gian của Express
│   │   ├── authMiddleware.js  # Xác thực JWT Bearer, phân quyền RBAC
│   │   ├── aiIdentityMiddleware.js # Phân giải danh tính khách/thành viên gọi AI
│   │   ├── validationMiddleware.js # Validate body, query, params theo Zod Schema
│   │   ├── errorMiddleware.js # Bắt lỗi 404 và Global Error Handler
│   │   ├── rateLimiter.js     # Giới hạn tần suất request (toàn cục & endpoint nhạy cảm)
│   │   ├── requestId.js       # Gán mã định danh X-Request-Id theo dõi log
│   │   └── upload.js          # Cấu hình Multer lưu ảnh cục bộ
│   │
│   ├── validators/            # Toàn bộ Zod Schema kiểm thực dữ liệu
│   │   ├── auth.validator.js
│   │   ├── admin.validator.js
│   │   ├── workspace.validator.js
│   │   ├── aiRequestValidator.js
│   │   └── videoRecipeSummaryValidator.js
│   │
│   ├── workers/               # Worker xử lý tác vụ nền bất đồng bộ
│   │   ├── contentModerationWorker.js # Worker quét kiểm duyệt văn bản bằng AI
│   │   └── videoRecipeSummaryWorker.js # Worker trích xuất công thức từ video YouTube
│   │
│   ├── utils/                 # Tiện ích bổ trợ
│   │   ├── apiResponse.js     # Định dạng envelope JSON phản hồi thành công
│   │   ├── apiError.js        # Lớp tùy biến ApiError chuẩn hóa mã lỗi
│   │   ├── jwt.js             # Ký và xác thực JWT token
│   │   └── sseParser.js       # Phân tích cú pháp Server-Sent Events từ AI Service
│   │
│   ├── app.js                 # Cấu hình ứng dụng Express, middleware bảo mật
│   └── server.js              # Khởi tạo HTTP server, chạy workers và graceful shutdown
│
├── scripts/                   # Scripts bảo trì cơ sở dữ liệu
├── tests/                     # Bộ kiểm thử tự động Vitest trên DB test riêng
├── package.json
└── README.md                  # Tài liệu chi tiết phân hệ Backend (File này)
```

---

## 5. Vòng đời xử lý yêu cầu (Request Lifecycle)

Mọi HTTP request gửi tới Backend đều trải qua một chuỗi xử lý nghiêm ngặt và đồng nhất:

```text
[Client Request]
       │
       ▼
1. requestId Middleware (Gán X-Request-Id: req_xxxxxxxxxxxx)
       │
       ▼
2. Security & Parsers (Helmet, CORS, Compression, express.json)
       │
       ▼
3. Rate Limiting Middleware (apiLimiter / authLimiter)
       │
       ▼
4. Route Layer (Khớp URL endpoint /api/v1/...)
       │
       ▼
5. Authentication & RBAC Middleware (Kiểm tra Bearer Token & Role)
       │
       ▼
6. Validation Middleware (Kiểm tra Zod Schema của Body / Query / Params)
       │
       ▼
7. Controller Layer (Trích xuất input, gọi Service qua asyncHandler)
       │
       ▼
8. Service Layer (Thực thi logic nghiệp vụ, Transaction, gọi AI/External)
       │
       ▼
9. Repository Layer (Thực thi truy vấn SQL qua Prisma Client)
       │
       ▼
10. Database (PostgreSQL lưu trữ dữ liệu ACID)
       │
       ▼
11. Envelope Formatter (Đóng gói cấu trúc JSON: { success, message, data, meta })
       │
       ▼
[Client Response (HTTP 200/201)]
```

*Nếu xảy ra ngoại lệ ở bất kỳ bước nào:* Lỗi lập tức được chuyển tiếp tới `globalErrorHandler`, tự động ánh xạ mã lỗi nghiệp vụ hoặc mã lỗi Prisma (`P2002`, `P2025`, `P2003`) thành phản hồi JSON chuẩn `{ success: false, message, errorCode, errors, meta }`.

---

## 6. Cấu trúc định tuyến & Tiền tố API (Routes Architecture)

Hệ thống định tuyến được phân thành 2 tầng rõ rệt:

1. **Chuẩn RESTful V1 hiện đại:** Tiền tố bắt buộc `/api/v1/...` (khuyến nghị cho mọi client mới).
2. **Tương thích ngược (Backward Compatibility):** Định tuyến `/api/...` song song nhằm đảm bảo không làm gián đoạn các client hiện hành.

### Định dạng Phản hồi Thống nhất (API Envelope):

- **Phản hồi thành công (Success Envelope):**
```json
{
  "success": true,
  "message": "Lấy danh sách công thức thành công.",
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "requestId": "req_a1b2c3d4e5f6"
  }
}
```

- **Phản hồi lỗi (Error Envelope):**
```json
{
  "success": false,
  "message": "Dữ liệu yêu cầu không hợp lệ.",
  "errorCode": "INVALID_INPUT",
  "errors": [
    {
      "field": "email",
      "message": "Email không đúng định dạng."
    }
  ],
  "meta": {
    "requestId": "req_a1b2c3d4e5f6"
  }
}
```

---

## 7. Tầng Điều khiển (Controllers Responsibility)

- **`auth.controller.js`:** Tiếp nhận đăng ký, đăng nhập, cấp lại token (`refreshToken`), đăng xuất, cập nhật thông tin cá nhân và lịch sử cân nặng.
- **`admin.controller.js`:** Tiếp nhận yêu cầu xem thống kê dashboard, quản lý trạng thái tài khoản, khôi phục bài viết đã xóa mềm, xem logs mô hình AI và kiểm tra sức khỏe hệ thống (`system-health`).
- **`blog.controller.js` & `video.controller.js`:** Xử lý các thao tác tạo, đọc, cập nhật, xóa bài viết chia sẻ công thức và video nấu ăn.
- **`workspace.controller.js`:** Tiếp nhận yêu cầu xem catalog chung, quản lý nhật ký ăn uống cá nhân, ghi nhận thực đơn tuần và đánh giá quán chay.
- **`places.controller.js`:** Tiếp nhận tìm kiếm quán chay theo tọa độ GPS bán kính và giải mã đường dẫn ảnh ZIOMAP.
- **`ai.controller.js`:** Tiếp nhận stream hội thoại tư vấn dinh dưỡng, stream lập thực đơn 7 ngày và phân tích ảnh món ăn qua AI Vision.
- **`videoRecipeSummaryController.js`:** Quản trị tạo tác vụ trích xuất công thức từ video YouTube và trả về tiến độ xử lý.

---

## 8. Tầng Nghiệp vụ (Services Responsibility)

- **`auth.service.js`:**
  - Kiểm tra trùng lặp email, băm mật khẩu bằng `bcryptjs`.
  - Sinh cặp mã khóa: Access Token (hạn 7 ngày) và Refresh Token (hạn 30 ngày).
  - Kiểm tra `tokenVersion` trong database nhằm thu hồi phiên tức thời khi người dùng đổi mật khẩu.
- **`passwordResetService.js`:**
  - Tạo mã token ngẫu nhiên an toàn bằng `crypto.randomBytes(32).toString('hex')`.
  - Lưu mã băm SHA-256 (`tokenHash`) vào bảng `password_reset_tokens` với thời hạn hiệu lực 15 phút.
  - Sử dụng `mailService.js` gửi đường dẫn đặt lại mật khẩu an toàn tới email người dùng.
- **`workspace.service.js`:**
  - Điều phối các giao dịch phức tạp (ACID Transactions) khi người dùng lưu thực đơn hoặc đồng bộ món ăn vào nhật ký dinh dưỡng.
  - Sử dụng cơ chế khóa cố vấn PostgreSQL (`pg_advisory_xact_lock`) để chống ghi đè khi có nhiều request lập thực đơn cùng lúc.
- **`places.service.js`:**
  - Tính toán khoảng cách kép (`geolib`) giữa vị trí người dùng và quán ăn.
  - Quản lý bộ đệm Read-through Cache lưu quán ăn từ ZIOMAP vào bảng `restaurants` trong PostgreSQL.
- **`aiTransportService.js`:**
  - Quản lý kết nối HTTP nội bộ sang AI Microservice.
  - Đính kèm header bảo mật `X-Internal-Api-Key` và cấu hình timeout độc lập (`AI_TIMEOUT_MS = 180000`).

---

## 9. Tầng Truy vấn Dữ liệu (Repositories Pattern)

- **Nguyên tắc duy nhất:** Toàn bộ lệnh gọi `prisma.<model>.<action>` chỉ được phép nằm trong các file repository thuộc thư mục `src/repositories/`.
- **Hỗ trợ Transaction xuyên suốt:** Mọi hàm trong repository đều nhận tham số cuối cùng là `db = prisma`. Khi Service mở giao dịch `prisma.$transaction(async (tx) => { ... })`, instance `tx` được truyền thẳng vào hàm repository:
```javascript
// Ví dụ mẫu tại user.repository.js:
export const userRepository = {
  async updatePassword(userId, { expectedHash, passwordHash }, db = prisma) {
    return db.user.updateMany({
      where: { user_id: userId, password_hash: expectedHash },
      data: { password_hash: passwordHash, tokenVersion: { increment: 1 } },
    });
  },
};
```
- **Bảo mật truy vấn:** Luôn chỉ định `select` cụ thể các cột dữ liệu cần lấy; tuyệt đối không trả về `password_hash` ra khỏi tầng repository.

---

## 10. Hệ thống Middleware trung gian

| Middleware | File triển khai | Chức năng chi tiết |
| :--- | :--- | :--- |
| `requestId` | `src/middlewares/requestId.js` | Tạo hoặc kế thừa `X-Request-Id` phục vụ theo dõi chuỗi log xuyên suốt từ FE sang BE. |
| `authenticate` | `src/middlewares/authMiddleware.js`| Kiểm tra tính hợp lệ của JWT Bearer Token, gán thông tin `req.user`. |
| `authorize` | `src/middlewares/authMiddleware.js`| Phân quyền theo vai trò (Role 1: ADMIN, Role 2: USER). Trả về `403 Forbidden` nếu không đủ quyền. |
| `optionalAuthenticate`| `src/middlewares/authMiddleware.js`| Cho phép request không gửi token vẫn đi qua; nếu gửi token thì bắt buộc phải hợp lệ. |
| `aiIdentityMiddleware`| `src/middlewares/aiIdentityMiddleware.js`| Phân giải danh tính khách (`X-Guest-Id`) hoặc thành viên đã đăng nhập khi gọi các tính năng AI. |
| `validate` | `src/middlewares/validationMiddleware.js`| Sử dụng Zod Schema để kiểm tra tính hợp lệ của `body`, `query` hoặc `params`. |
| `apiLimiter` / `authLimiter`| `src/middlewares/rateLimiter.js`| Giới hạn tần suất gọi API (mặc định 300 req/15 phút toàn cục; 15 req/15 phút cho đăng nhập/đăng ký). |
| `upload` | `src/middlewares/upload.js` | Cấu hình Multer nhận diện và lưu file ảnh JPEG, PNG, WebP (tối đa 5MB) vào `server/uploads/`. |
| `globalErrorHandler` | `src/middlewares/errorMiddleware.js`| Bắt mọi lỗi chưa được xử lý, phân loại lỗi Prisma và trả về JSON chuẩn hóa. |

---

## 11. Kiểm thực & Xử lý lỗi tập trung (Validation & Error Handling)

### Ánh xạ lỗi Prisma sang HTTP Status:
Tại `errorMiddleware.js`, các mã lỗi đặc trưng từ Prisma Client được chuyển đổi sang mã lỗi nghiệp vụ:
- `P2002` (Vi phạm ràng buộc Unique): Chuyển thành `409 Conflict` (kèm `errorCode: "RESOURCE_ALREADY_EXISTS"`).
- `P2025` (Bản ghi không tồn tại): Chuyển thành `404 Not Found` (kèm `errorCode: "RESOURCE_NOT_FOUND"`).
- `P2003` (Lỗi khóa ngoại Foreign Key): Chuyển thành `400 Bad Request` hoặc `409 Conflict`.

---

## 12. Cơ chế Xác thực, Thu hồi phiên & Phân quyền (Auth & RBAC)

1. **Đăng nhập & Băm mật khẩu:**
   - Mật khẩu lưu trữ dạng chuỗi băm Bcrypt với salt độ phức tạp cao.
   - Khi đăng nhập thành công, máy chủ ký **Access Token** (hạn 7 ngày) chứa `{ user_id, email, role, tokenVersion }`.
   - Máy chủ sinh **Refresh Token** (hạn 30 ngày) và thiết lập vào cookie trình duyệt:
     `httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000`.
2. **Cơ chế Thu hồi Phiên (Token Revocation):**
   - Khi người dùng bấm Đổi mật khẩu hoặc hoàn tất Đặt lại mật khẩu:
     Trường `token_version` trong bảng `users` được tăng lên 1 đơn vị (`tokenVersion: { increment: 1 }`).
   - Mọi token cũ chứa `tokenVersion` thấp hơn sẽ lập tức bị từ chối tại middleware `authenticate` và API `/auth/refresh`.
3. **Phân quyền (RBAC):**
   - `ADMIN` (`1`): Toàn quyền truy cập Cổng Quản trị `/api/admin/*`.
   - `USER` (`2`): Thành viên truy cập các tài nguyên cá nhân `/api/workspace/*`.

---

## 13. Kiến trúc Cơ sở dữ liệu (Database Architecture & Prisma)

Cấu trúc định nghĩa tại `server/prisma/schema.prisma` với **36 models và enums**:

### Các nguyên tắc chuẩn hóa:
- **Khóa chính:** Các model mới sử dụng UUID `id String @id @default(uuid()) @db.Uuid`. Các bảng legacy dùng số nguyên tự tăng `Int @id @default(autoincrement())`.
- **Ánh xạ tên gọi (@map & @@map):**
  - Tên bảng trong PostgreSQL luôn ở dạng `snake_case` số nhiều (`@@map("users")`, `@@map("meal_plans")`).
  - Tên cột trong PostgreSQL luôn ở dạng `snake_case` (`@map("created_at")`, `@map("user_id")`).
- **Thời gian (Timestamps):** Bắt buộc sử dụng `DateTime @db.Timestamptz(6)` để lưu trữ thời gian có múi giờ (UTC).
- **Tiền tệ:** Các trường giá tiền sử dụng kiểu `Decimal @db.Decimal(18, 2)` (tuyệt đối không dùng Float).

---

## 14. Quản trị Migration Cơ sở dữ liệu

- **Tạo bản migration mới trong quá trình phát triển:**
  ```powershell
  npm run prisma:migrate -- --name <mo_ta_thay_doi>
  ```
- **Triển khai các bản migration vào cơ sở dữ liệu:**
  ```powershell
  npx prisma migrate deploy
  ```
- **Tái tạo mã nguồn Prisma Client sau khi thay đổi schema:**
  ```powershell
  npm run prisma:generate
  ```
- **Kiểm tra tính hợp lệ của schema:**
  ```powershell
  npx prisma validate
  ```

---

## 15. Dữ liệu khởi tạo (Database Seeding)

Dữ liệu hạt giống hệ thống bao gồm danh mục món ăn, danh sách nguyên liệu, bài viết mẫu và tài khoản quản trị được lưu trữ tại `prisma/seed.sql` và được nạp qua `prisma/seed.js`:

```powershell
npm run db:seed
```
> **CẢNH BÁO QUAN TRỌNG:** Lệnh `npm run db:seed` sẽ chạy lại toàn bộ script SQL và có thể làm mới dữ liệu. Chỉ sử dụng lệnh này khi thiết lập máy phát triển mới lần đầu; không chạy trên cơ sở dữ liệu đã có dữ liệu thực tế.

---

## 16. Tài liệu hóa API chi tiết (API Endpoints Documentation)

### 1. Phân hệ Xác thực & Tài khoản (`/api/v1/auth`)

| Phương thức | Đường dẫn (Endpoint) | Mô tả | Xác thực | Quyền hạn |
| :---: | :--- | :--- | :---: | :---: |
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản thành viên mới | Không | Public |
| `POST` | `/api/v1/auth/login` | Đăng nhập tài khoản, nhận Access Token | Không | Public |
| `POST` | `/api/v1/auth/refresh` | Làm mới Access Token bằng cookie Refresh Token | Không | Public |
| `POST` | `/api/v1/auth/logout` | Đăng xuất và xóa cookie Refresh Token | Không | Public |
| `POST` | `/api/v1/auth/forgot-password` | Gửi email liên kết đặt lại mật khẩu | Không | Public |
| `POST` | `/api/v1/auth/reset-password` | Đặt lại mật khẩu mới qua token bí mật | Không | Public |
| `GET` | `/api/v1/auth/me` | Lấy hồ sơ tài khoản và dị ứng thực phẩm | Có | Member/Admin |
| `PATCH`| `/api/v1/auth/me` | Cập nhật hồ sơ thể trạng và dị ứng | Có | Member/Admin |
| `POST` | `/api/v1/auth/change-password` | Đổi mật khẩu mới (thu hồi toàn bộ token cũ) | Có | Member/Admin |
| `POST` | `/api/v1/auth/me/weight` | Ghi nhận số đo cân nặng mới | Có | Member/Admin |

### 2. Phân hệ Bài viết, Video & Cộng đồng (`/api/v1`)

| Phương thức | Đường dẫn (Endpoint) | Mô tả | Xác thực | Quyền hạn |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/v1/blogs` | Lấy danh sách bài viết blog chia sẻ | Không | Public |
| `GET` | `/api/v1/blogs/:id` | Xem chi tiết bài viết blog | Tùy chọn| Public |
| `POST` | `/api/v1/blogs` | Đăng bài viết blog mới (gửi qua hàng đợi kiểm duyệt)| Có | Member |
| `PUT` | `/api/v1/blogs/:id` | Cập nhật bài viết blog của bản thân | Có | Tác giả |
| `DELETE`| `/api/v1/blogs/:id` | Xóa mềm bài viết blog | Có | Tác giả |
| `GET` | `/api/v1/videos` | Lấy danh sách video nấu ăn | Không | Public |
| `GET` | `/api/v1/videos/:id` | Xem chi tiết video nấu ăn | Không | Public |
| `POST` | `/api/v1/videos` | Đăng video nấu ăn mới | Có | Member |
| `GET` | `/api/v1/comments/post/:postId` | Lấy danh sách bình luận của bài viết | Không | Public |
| `POST` | `/api/v1/comments/post/:postId` | Thêm bình luận mới vào bài viết | Có | Member |
| `POST` | `/api/v1/votes/post/:postId` | Bình chọn Upvote hoặc Downvote cho bài viết | Có | Member |

### 3. Phân hệ Không gian làm việc Dinh dưỡng (`/api/v1/workspace`)

| Phương thức | Đường dẫn (Endpoint) | Mô tả | Xác thực | Quyền hạn |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/v1/workspace/catalog` | Lấy danh mục nguyên liệu và món ăn chuẩn | Không | Public |
| `GET` | `/api/v1/workspace/journal` | Lấy lịch sử nhật ký ăn uống theo ngày/tuần | Có | Member |
| `POST` | `/api/v1/workspace/diary` | Thêm bản ghi món ăn vào nhật ký | Có | Member |
| `DELETE`| `/api/v1/workspace/diary/:id` | Xóa bản ghi món ăn khỏi nhật ký | Có | Member |
| `PUT` | `/api/v1/workspace/plan` | Cập nhật thực đơn dinh dưỡng theo tuần | Có | Member |
| `POST` | `/api/v1/workspace/plan/apply-ai` | Áp dụng thực đơn sinh từ AI vào lịch tuần | Có | Member |
| `POST` | `/api/v1/workspace/restaurants` | Đề xuất địa điểm quán ăn chay mới | Có | Member |

### 4. Phân hệ Cổng Tương tác AI (`/api/v1/ai` & `/api/v1/video-recipe-summary-jobs`)

| Phương thức | Đường dẫn (Endpoint) | Mô tả | Xác thực | Quyền hạn |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/v1/ai/usage` | Lấy số lượt gọi AI còn lại trong ngày của khách | Tùy chọn| Public |
| `POST` | `/api/v1/ai/chat/stream` | Hỏi đáp dinh dưỡng chay qua SSE streaming | Tùy chọn| Public/Member |
| `POST` | `/api/v1/ai/meal-planner/generate/stream`| Sinh thực đơn 7 ngày cá nhân hóa qua SSE | Tùy chọn| Public/Member |
| `POST` | `/api/v1/ai/food-scanner/analyze` | Quét nhãn và phân tích món ăn qua AI Vision | Tùy chọn| Public/Member |
| `POST` | `/api/v1/video-recipe-summary-jobs` | Tạo job trích xuất công thức từ video YouTube | Có | Member |
| `GET` | `/api/v1/video-recipe-summary-jobs/:jobId`| Xem tiến độ xử lý của job trích xuất video | Có | Member |

### 5. Phân hệ Trung tâm Quản trị (`/api/v1/admin`)

| Phương thức | Đường dẫn (Endpoint) | Mô tả | Xác thực | Quyền hạn |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/v1/admin/dashboard/stats` | Lấy số liệu thống kê tổng quan hệ thống | Có | Role 1 (ADMIN) |
| `GET` | `/api/v1/admin/system-health` | Kiểm tra kết nối DB và trạng thái AI Service | Có | Role 1 (ADMIN) |
| `GET` | `/api/v1/admin/users` | Lấy danh sách thành viên | Có | Role 1 (ADMIN) |
| `PATCH`| `/api/v1/admin/users/:id/status`| Khóa hoặc kích hoạt lại tài khoản thành viên | Có | Role 1 (ADMIN) |
| `POST` | `/api/v1/admin/users/:id/restore`| Khôi phục tài khoản thành viên đã xóa mềm | Có | Role 1 (ADMIN) |
| `GET` | `/api/v1/admin/moderation/flagged`| Lấy danh sách bài viết bị AI gắn cờ vi phạm | Có | Role 1 (ADMIN) |
| `POST` | `/api/v1/admin/moderation/resolve`| Duyệt công khai hoặc gỡ bỏ nội dung gắn cờ | Có | Role 1 (ADMIN) |
| `GET` | `/api/v1/admin/ai/logs` | Xem danh sách nhật ký gọi AI (`ai_logs`) | Có | Role 1 (ADMIN) |
| `POST` | `/api/v1/admin/chatbot-cache/clear` | Xóa bộ nhớ đệm câu trả lời của Chatbot | Có | Role 1 (ADMIN) |

---

## 17. Tích hợp AI Microservice (AI Gateway Integration)

Backend hoạt động như một **AI Gateway bảo mật**:
- **Bảo mật giao tiếp:** Mọi cuộc gọi từ Backend sang AI Microservice đều được tự động đính kèm tiêu đề bảo mật `X-Internal-Api-Key` khớp với biến môi trường `INTERNAL_API_KEY`.
- **Phân luồng Streaming SSE:**
  - Endpoint `/api/v1/ai/chat/stream` và `/api/v1/ai/meal-planner/generate/stream` nhận dòng dữ liệu SSE từ FastAPI.
  - Sử dụng tiện ích `sseParser.js` để đọc các khối `token`, cập nhật dữ liệu về cho client và trích xuất `metadata` (chứa snapshot prompt) để lưu vào bảng `ai_generations` khi quá trình hoàn tất.
- **Quản lý hạn mức khách (Guest Quota):** Khách vãng lai chưa đăng nhập được theo dõi hạn mức qua bảng `guest_quotas` (tối đa 3 lượt/ngày theo cấu hình `GUEST_DAILY_LIMIT`).

---

## 18. Tích hợp dịch vụ bên ngoài (External APIs: ZIOMAP, SMTP, YouTube)

1. **Dịch vụ Bản đồ ZIOMAP (`places.service.js`):**
   - Tìm kiếm địa điểm quán ăn chay quanh tọa độ GPS của người dùng.
   - Giải mã đường dẫn ảnh quán ăn Google Place qua tiêu đề `x-api-key: ZIOMAP_API_KEY`.
   - Kết quả tìm kiếm được lưu đệm tự động vào bảng `restaurants` để tăng tốc độ phản hồi.
2. **Dịch vụ Gửi Email SMTP (`mailService.js`):**
   - Kết nối tới nhà cung cấp SMTP thật (Gmail, SendGrid hoặc Mailgun) qua cổng 587 (STARTTLS) hoặc 465 (TLS).
   - Tuyệt đối không giả lập gửi mail thành công; nếu máy chủ SMTP không sẵn sàng sẽ trả về mã lỗi `503 PASSWORD_RESET_UNAVAILABLE`.
3. **Trích xuất Video YouTube (`youtubeMetadataService.js` & `yt-dlp`):**
   - Sử dụng công cụ `yt-dlp` để đọc metadata video (thời lượng $\le 11$ phút, tiêu đề, tác giả).
   - AI Microservice sử dụng `youtube-transcript-api` lấy phụ đề tiếng Việt gốc để tổng hợp công thức.

---

## 19. Bảng biến môi trường (Environment Variables)

File mẫu: `server/.env.example`.

| Biến môi trường | Bắt buộc | Giá trị mẫu | Giải thích chi tiết |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Có | `development` | Môi trường chạy máy chủ (`development`, `production`, `test`). |
| `PORT` | Có | `5000` | Cổng lắng nghe HTTP của Backend Server. |
| `CLIENT_URL` | Có | `http://localhost:5173` | Địa chỉ Frontend được cấp phép truy cập CORS và đính kèm cookie. |
| `DATABASE_URL` | Có | `postgresql://user:pass@localhost:5432/vegetarian_db` | Chuỗi kết nối PostgreSQL thông qua Prisma Pool. |
| `JWT_SECRET` | Có | Chuỗi ngẫu nhiên $\ge 32$ ký tự | Khóa bí mật dùng để ký và giải mã JWT Access Token. |
| `JWT_EXPIRES_IN`| Không | `7d` | Thời hạn hiệu lực của Access Token. |
| `REFRESH_TOKEN_SECRET`| Không | Chuỗi ngẫu nhiên | Khóa ký riêng cho Refresh Token (nếu trống sẽ tự dẫn xuất từ JWT_SECRET). |
| `REFRESH_TOKEN_EXPIRES_IN`| Không | `30d` | Thời hạn hiệu lực của Refresh Token. |
| `AI_SERVICE_URL`| Có | `http://127.0.0.1:8000` | Địa chỉ nội bộ kết nối tới AI Microservice. |
| `INTERNAL_API_KEY`| Có | Chuỗi ngẫu nhiên $\ge 32$ ký tự | Khóa xác thực nội bộ truyền qua header `X-Internal-Api-Key`. |
| `AI_TIMEOUT_MS` | Không | `180000` | Thời gian chờ tối đa khi Backend gọi tính toán AI (180 giây). |
| `CONTENT_MODERATION_ENABLED` | Không | `false` | Bật (`true`) hoặc tắt (`false`) tác vụ worker quét kiểm duyệt tự động. |
| `ZIOMAP_API_KEY`| Tùy chọn| Chuỗi khóa ZIOMAP | Khóa API tìm kiếm quán ăn và ảnh ZIOMAP. |
| `YT_DLP_PATH` | Không | `yt-dlp` | Đường dẫn tới executable yt-dlp (có thể dùng đường dẫn trong `ai_service/venv`). |
| `SMTP_HOST` | Tùy chọn| `smtp.gmail.com` | Máy chủ gửi thư SMTP. |
| `SMTP_PORT` | Tùy chọn| `587` | Cổng SMTP (587 cho STARTTLS, 465 cho SSL/TLS). |
| `SMTP_USER` | Tùy chọn| `your-email@gmail.com` | Tài khoản đăng nhập máy chủ SMTP. |
| `SMTP_PASS` | Tùy chọn| `app-password` | Mật khẩu ứng dụng của máy chủ SMTP. |
| `SMTP_FROM` | Tùy chọn| `Chay Xanh <no-reply@chayxanh.vn>`| Địa chỉ email hiển thị người gửi. |

---

## 20. Hướng dẫn cài đặt & Khởi động (Installation & Setup)

### Bước 1: Di chuyển vào thư mục Backend
```powershell
cd server
```

### Bước 2: Cài đặt dependencies
```powershell
npm ci --include=optional
```

### Bước 3: Cấu hình biến môi trường
```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Mở file .env và điền mật khẩu PostgreSQL, JWT_SECRET, INTERNAL_API_KEY
```

### Bước 4: Tạo Prisma Client và chạy Migration
```powershell
npm run prisma:generate
npx prisma migrate deploy
```

### Bước 5: Khởi chạy máy chủ phát triển
```powershell
npm run dev
```
> Server sẽ lắng nghe tại cổng `5000`. Kiểm tra trạng thái hoạt động: `http://localhost:5000/health`.

---

## 21. Danh mục lệnh phát triển (Development Commands)

| Lệnh thực thi | Mục đích |
| :--- | :--- |
| `npm run dev` | Khởi chạy máy chủ chế độ phát triển với Nodemon tự động tải lại khi đổi code. |
| `npm start` | Khởi động máy chủ ở chế độ sản xuất (Production). |
| `npm test` | Thực thi toàn bộ test suites Vitest trên database test riêng. |
| `npm run test:prepare` | Khởi tạo lại schema và nạp dữ liệu chuẩn cho database test `_test`. |
| `npm run test:content-moderation` | Kiểm thử chuyên biệt tính năng quét kiểm duyệt bài viết tự động. |
| `npm run test:video-recipes` | Kiểm thử luồng trích xuất công thức từ video YouTube. |
| `npm run test:database` | Kiểm thử tích hợp toàn bộ các truy vấn cơ sở dữ liệu (`tests/workspace.integration.mjs`). |
| `npm run test:ai-internal-auth`| Kiểm thử xác thực HTTP an toàn giữa Backend và AI Service. |
| `npm run prisma:migrate` | Sinh và áp dụng migration mới (`npx prisma migrate dev --name <ten_thay_doi>`). |
| `npm run prisma:generate` | Tạo lại thư viện mã nguồn `@prisma/client`. |
| `npm run prisma:studio` | Mở giao diện đồ họa quản lý dữ liệu Prisma Studio trên trình duyệt. |
| `npm run db:seed` | Nạp dữ liệu hạt giống hệ thống ban đầu từ `prisma/seed.sql`. |

---

## 22. Chiến lược kiểm thử tự động (Testing với Vitest & DB Test)

Backend bắt buộc chạy kiểm thử trên một cơ sở dữ liệu riêng biệt có hậu tố `_test` để đảm bảo an toàn dữ liệu:

### 1. Chuẩn bị file `.env.test`:
```powershell
if (!(Test-Path .env.test)) { Copy-Item .env.test.example .env.test }
# Điền DATABASE_URL trỏ tới cơ sở dữ liệu vegetarian_db_test
```

### 2. Thực thi kiểm thử:
```powershell
# Nạp migration và seed dữ liệu chuẩn vào DB test
npm run test:prepare

# Chạy toàn bộ 58 file kiểm thử
npm test
```

---

## 23. Quy chuẩn bảo mật máy chủ (Security Notes)

- **Ngăn chặn SQL Injection:** 100% truy vấn đều thông qua Prisma Client đã được tham số hóa an toàn (Parameterized Queries). Tuyệt đối cấm sử dụng `$queryRawUnsafe`.
- **Bảo vệ Cookie:** Cookie Refresh Token luôn gắn cờ `httpOnly` và `sameSite: 'lax'`, ngăn chặn hoàn toàn việc đánh cắp token qua tấn công Cross-Site Scripting (XSS).
- **Phân tách Origin CORS:** Cấu hình CORS chỉ cho phép địa chỉ Frontend (`CLIENT_URL`) kết nối và gửi kèm credentials.
- **Bảo mật Giao tiếp AI:** AI Service nằm trong mạng nội bộ, chỉ chấp nhận request mang khóa `X-Internal-Api-Key` hợp lệ từ Backend.

---

## 24. Xử lý sự cố thường gặp (Troubleshooting)

1. **Lỗi `P1001: Can't reach database server at localhost:5432`:**
   - Kiểm tra dịch vụ PostgreSQL đang chạy trong `services.msc`. Kiểm tra cổng `5432` và thông tin mật khẩu trong `server/.env`.
2. **Lỗi `P2002: Unique constraint failed on the fields: (email)`:**
   - Email đăng ký đã tồn tại trong hệ thống. Hãy sử dụng email khác hoặc tính năng Quên mật khẩu.
3. **Lỗi `401 Unauthorized` khi gọi tính năng AI:**
   - Khóa `INTERNAL_API_KEY` trong `server/.env` không khớp với `ai_service/.env`. Hãy kiểm tra và đồng bộ lại giá trị này giữa hai file.
4. **Lỗi `503 PASSWORD_RESET_UNAVAILABLE`:**
   - Chưa cấu hình hoặc thông tin cấu hình `SMTP_*` trong `server/.env` không thể kết nối tới máy chủ gửi mail. Hãy kiểm tra lại SMTP User và App Password.
