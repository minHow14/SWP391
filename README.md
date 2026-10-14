# 🌱 Chay Xanh - Nền Tảng Hỗ Trợ Ăn Chay & Sống Khỏe Toàn Diện

> **Dự án SWP391 - FPT University | Software Development Project**  
> Hệ thống tích hợp toàn diện gồm ứng dụng Web SPA (React-Bootstrap), Backend REST API phân tầng (Express + Prisma + PostgreSQL) và AI Microservice tư vấn dinh dưỡng thông minh (FastAPI + LangChain).

---

## 1. 📖 Tên dự án & Bài toán giải quyết

**Chay Xanh** ra đời nhằm hỗ trợ cộng đồng tiếp cận lối sống ăn chay khoa học, lành mạnh và bền vững. Nền tảng kết hợp giữa mạng xã hội ẩm thực, công cụ khám phá món chay, tìm kiếm địa điểm quán ăn chay lân cận, trợ lý ảo AI hỗ trợ lập thực đơn cá nhân hóa và Trung tâm Quản trị (Admin Portal) toàn diện.

### Các bài toán cốt lõi:
1. **Thiếu kiến thức dinh dưỡng cân bằng:** Giải quyết nỗi lo thiếu vi chất (B12, sắt, canxi, protein thực vật) khi chuyển sang chế độ ăn chay.
2. **Khó khăn trong việc lên thực đơn:** Trợ lý AI tự động tính toán nhu cầu calo và đề xuất thực đơn 7 ngày phù hợp với thể trạng, mục tiêu sức khỏe và dị ứng thực phẩm.
3. **Tìm kiếm địa điểm ăn chay:** Định vị nhà hàng, quán chay uy tín xung quanh người dùng dựa trên tọa độ địa lý (GPS).
4. **Kết nối cộng đồng & Kiểm duyệt:** Chia sẻ công thức, nhật ký nấu nướng, video hướng dẫn và tự động kiểm duyệt nội dung độc hại bằng AI kết hợp can thiệp thủ công từ Quản trị viên.

---

## 2. ✨ Tính năng chính

### Phân hệ Người dùng (Member Portal)
- **Kiểm tra món ăn & Quét thành phần:** Tự động phát hiện nguyên liệu động vật tiềm ẩn theo từng trường phái ăn chay (Thuần chay, Ăn chay có trứng/sữa, Chay Phật giáo kiêng ngũ vị tân, Keto chay, Eat Clean).
- **Đổi món chay thông minh:** Gợi ý nguyên liệu và món chay thay thế tương đương về cấu trúc dinh dưỡng.
- **Từ điển nguyên liệu chay:** Tra cứu chỉ số calo, đạm, đường, béo và nguồn gốc thực vật.
- **Khám phá công thức & Quán chay:** Bộ lọc kết hợp không dấu, tìm quán ăn theo bán kính GPS.
- **Nhật ký dinh dưỡng cá nhân:** Ghi nhận khẩu phần calo theo ngày/tuần theo múi giờ địa phương.

### Phân hệ Quản trị viên (Admin Portal - `/admin`)
- **Tổng quan Hệ thống (Dashboard):** Thống kê thời gian thực về thành viên, bài viết, video, tỷ lệ chính xác AI và việc cần xử lý.
- **Quản lý Thành viên:** Tra cứu danh sách, xem bài viết/bình luận của từng thành viên, khóa/mở khóa hoặc xóa tài khoản. Quản trị viên sau khi đăng nhập được tự động chuyển hướng vào Dashboard quản trị.
- **Quản lý Bài viết & Video:** Phê duyệt bài đăng mới, chỉnh sửa nội dung vi phạm tiêu chuẩn cộng đồng, gỡ bỏ bài viết.
- **Quản lý Bình luận:** Kiểm tra tương tác, ẩn hoặc xóa bình luận spam/quảng cáo.
- **Quản lý Danh mục:** Thêm, sửa, xóa danh mục món ăn & công thức nấu chay (có kiểm tra ràng buộc dữ liệu).
- **Kiểm duyệt AI:** Xem xét các bài viết và bình luận bị AI gắn cờ ẩn trước khi quyết định phê duyệt khôi phục hoặc xóa vĩnh viễn.
- **Giám sát Mô hình AI:** Theo dõi trạng thái hoạt động của 3 mô hình (Gợi ý thực đơn, Chatbot tư vấn, Kiểm duyệt tự động) và tra cứu nhật ký `ai_logs`.
- **Can thiệp Thủ công AI:** Ghi nhận điều chỉnh, phản hồi sửa lỗi khi AI đưa ra kết quả chưa chuẩn xác.
- **Quản lý Báo cáo:** Xử lý các phản ánh vi phạm từ người dùng trong cộng đồng.

---

## 3. 🛠️ Công nghệ & Phiên bản cụ thể

| Phân hệ | Công nghệ chính | Phiên bản | Thư viện & Công cụ bổ trợ |
| :--- | :--- | :--- | :--- |
| **Frontend (`client/`)** | React | `^19.2.8` | Vite `^8.3.0`, React-Bootstrap `^2.10.10`, Bootstrap 5, Bootstrap Icons, Axios `^1.14.0`, React Router `^8.4.0` |
| **Backend (`server/`)** | Node.js (ESM), Express | `^5.2.1` | Prisma ORM `^6.19.3`, PostgreSQL, Zod `^4.6.5`, bcryptjs `^3.0.3`, jsonwebtoken `^9.0.3`, Vitest `^5.0.3`, Supertest |
| **AI Service (`ai_service/`)** | Python, FastAPI | `3.11+` | LangChain, DeepSeek API (v4 Fallback), SQLModel, SQLAlchemy, SlowAPI, Pydantic v2, Pytest |
| **Database** | PostgreSQL | `>= 15.0` | Prisma Schema (30 bảng), Raw SQL, connection pooling |

---

## 4. 🏛️ Kiến trúc tổng quan

```mermaid
flowchart TD
    subgraph ClientLayer ["1. Frontend Web App (client/)"]
        Client["React 19 + Vite + React-Bootstrap<br/>Axios Interceptor + React Router<br/>(Port 5173)"]
    end

    subgraph BackendLayer ["2. Backend Core Server (server/)"]
        Server["Express.js 5 + Layered Architecture<br/>JWT Auth & RBAC (Role 1: Admin, Role 2: User)<br/>(Port 5000)"]
    end

    subgraph AILayer ["3. AI Microservice (ai_service/)"]
        AIService["FastAPI + LangChain<br/>Internal API Key Auth<br/>(Port 8000)"]
    end

    subgraph DataLayer ["4. Persistence & Models"]
        DB[("PostgreSQL 15+ Database<br/>(vegetarian_db)")]
        DeepSeek["DeepSeek LLM Engine"]
    end

    Client -- "HTTP / REST API / Bearer Token" --> Server
    Client -- "Streaming Chatbot SSE" --> AIService
    Server -- "Prisma Client (ACID, Raw Queries)" --> DB
    Server -- "X-Internal-Api-Key" --> AIService
    AIService -- "Prompt & Moderation" --> DeepSeek
```

---

## 5. 📂 Cấu trúc thư mục

```text
SWP391/
├── client/                     # Frontend React SPA
│   ├── src/
│   │   ├── components/         # Header, Footer, SiteLayout, AuthForm...
│   │   ├── pages/              # Trang công cộng (Home, Recipes, Community, Profile...)
│   │   │   └── admin/          # Cổng Quản trị AdminPortal & 8 Tab chức năng
│   │   ├── services/           # apiClient.js (Axios), adminService.js
│   │   ├── lib/                # DatabaseContext, api.js, recipeFilters.js...
│   │   ├── Admin.css           # Giao diện Quản trị đồng bộ màu xanh ChayXanh
│   │   └── App.jsx             # React Router định tuyến (kèm /admin)
│   └── test/                   # Kiểm thử logic FE & Admin (32 tests)
│
├── server/                     # Backend REST API
│   ├── src/
│   │   ├── config/             # Kết nối Prisma Client
│   │   ├── constants/          # Roles, Status, HttpStatus
│   │   ├── controllers/        # Tiếp nhận request & trả envelope JSON
│   │   ├── middlewares/        # authMiddleware (JWT, RBAC), validation, error
│   │   ├── routes/             # Định tuyến RESTful (kèm /api/admin)
│   │   ├── services/           # Logic nghiệp vụ (kèm admin.service.js)
│   │   └── utils/              # apiResponse, apiError, jwt
│   ├── prisma/                 # schema.prisma & seed.sql (dữ liệu thật)
│   └── tests/                  # Kiểm thử tự động Vitest (28 tests)
│
├── ai_service/                 # AI Microservice Python FastAPI
│   ├── agents/                 # Chatbot Agent & Meal Planner Agent
│   ├── api/                    # Routers: /api/chat, /api/meal-planner
│   └── core/                   # Cấu hình DeepSeek LLM & Rate Limiting
│
├── docs/                       # Tài liệu thiết kế ERD & OpenAPI
└── README.md                   # Hướng dẫn toàn diện dự án
```

---

## 6. ⚙️ Yêu cầu hệ thống (System Requirements)

- **Node.js:** `>= 20.x` & `npm >= 10.x`
- **Python:** `>= 3.11.x`
- **PostgreSQL:** `>= 15.x` (Đang chạy local port `5432`)
- **Hệ điều hành:** Windows, macOS, hoặc Linux

---

## 7. 🚀 Hướng dẫn cài đặt & Khởi động Local từng bước

### Bước 1: Khởi tạo Cơ sở dữ liệu PostgreSQL
Mở `psql` hoặc pgAdmin và tạo database:
```sql
CREATE DATABASE vegetarian_db;
```

### Bước 2: Khởi chạy Backend Server (Port 5000)
```bash
cd server
npm install
# Tạo file .env và điền thông tin (xem Mục 8)
npm run prisma:generate
npm run prisma:push
npm run seed            # Nạp dữ liệu chuẩn từ seed.sql và xác thực tài khoản mẫu
npm run dev
```
> Server sẽ hoạt động tại: `http://localhost:5000` (Kiểm tra sức khỏe: `http://localhost:5000/health`)

#### 🔑 Tài khoản mẫu sẵn sàng sử dụng:
- **Quản trị viên (Admin - Role 1):** `admin@swp391.com` | Mật khẩu: `123456` *(Đăng nhập vào thẳng Dashboard `/admin`)*
- **Người dùng thường (User - Role 2):** `user@swp391.com` | Mật khẩu: `123456`

### Bước 3: Khởi chạy AI Microservice (Port 8000)
```bash
cd ai_service
python -m venv venv
.\venv\Scripts\Activate.ps1    # Trên Windows (hoặc: source venv/bin/activate trên Linux/macOS)
pip install -r requirements.txt
# Tạo file .env và cấu hình DEEPSEEK_API_KEY
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
> AI Service sẽ hoạt động tại: `http://localhost:8000` (Swagger docs: `http://localhost:8000/docs`)

### Bước 4: Khởi chạy Frontend Web App (Port 5173)
```bash
cd client
npm install
npm run dev
```
> Truy cập ứng dụng tại: `http://localhost:5173`

---

## 8. 🔐 Bảng biến môi trường (Environment Variables)

### 1. `server/.env`
| Biến môi trường | Giá trị mẫu | Mô tả |
| :--- | :--- | :--- |
| `PORT` | `5000` | Cổng HTTP của Backend Server |
| `NODE_ENV` | `development` | Môi trường phát triển |
| `CLIENT_URL` | `http://localhost:5173` | Địa chỉ Frontend cho phép CORS |
| `DATABASE_URL` | `postgresql://postgres:123456@localhost:5432/vegetarian_db` | Chuỗi kết nối PostgreSQL qua Prisma |
| `JWT_SECRET` | `swp391_jwt_secret_key_super_secure_vegetarian_2026` | Khóa bí mật ký mã hóa JWT |
| `JWT_EXPIRES_IN` | `7d` | Thời hạn của Access Token |
| `INTERNAL_API_KEY` | `chayxanh_internal_secure_key_2026` | Khóa xác thực nội bộ giữa BE và AI Service |

### 2. `ai_service/.env`
| Biến môi trường | Giá trị mẫu | Mô tả |
| :--- | :--- | :--- |
| `PORT` | `8000` | Cổng HTTP của AI Microservice |
| `INTERNAL_API_KEY` | `chayxanh_internal_secure_key_2026` | Khóa so khớp với Backend qua header `X-Internal-Api-Key` |
| `DEEPSEEK_API_KEY` | `sk-xxxxxxxxxxxxxxxx` | Khóa kết nối DeepSeek LLM |
| `DATABASE_URL` | `postgresql://postgres:123456@localhost:5432/vegetarian_db` | Kết nối đọc dữ liệu nguyên liệu |

### 3. `client/.env`
| Biến môi trường | Giá trị mẫu | Mô tả |
| :--- | :--- | :--- |
| `VITE_API_URL` | `/api` | Base URL gọi API (được proxy qua Vite sang port 5000) |

---

## 9. 📜 Danh sách Scripts

### Backend (`server/`)
- `npm run dev`: Chạy server ở chế độ giám sát tự tải lại (nodemon).
- `npm start`: Khởi động server production.
- `npm test`: Chạy bộ 28 kiểm thử tự động với Vitest (bao gồm kiểm thử ranh giới Quản trị & RBAC).
- `npm run prisma:generate`: Tạo mã nguồn Prisma Client.
- `npm run prisma:push`: Đồng bộ cấu trúc `schema.prisma` trực tiếp vào PostgreSQL.
- `npm run seed`: Nạp dữ liệu kiểm thử thực tế từ `seed.sql`.

### Frontend (`client/`)
- `npm run dev`: Khởi động Vite dev server.
- `npm run build`: Đóng gói ứng dụng thành phẩm (Production build).
- `npm test`: Chạy bộ 32 bài kiểm thử với Node.js Test Runner (bao gồm kiểm thử Admin Service).
- `npm run preview`: Chạy thử bản build đã đóng gói trên máy local.

---

## 10. 📚 Link tài liệu API & ERD

- **Tài liệu ERD Database:** Lưu trữ tại [`docs/ERD.md`](file:///d:/Projects/FPT/SWP391/docs/ERD.md)
- **Tài liệu Swagger / OpenAPI:** Truy cập trực tiếp tại `http://localhost:8000/docs` khi AI Service khởi chạy.
- **Quy chuẩn lập trình:** Chi tiết tại [`AGENTS.md`](file:///d:/Projects/FPT/SWP391/AGENTS.md) và [`client/AGENTS.md`](file:///d:/Projects/FPT/SWP391/client/AGENTS.md).

---

## 11. 🧪 Hướng dẫn chạy Test trên DB Test riêng

Để đảm bảo không ảnh hưởng đến dữ liệu đang vận hành, thực hiện kiểm thử trên database độc lập:

```bash
# 1. Tạo database kiểm thử trong PostgreSQL
psql -U postgres -c "CREATE DATABASE vegetarian_test_db;"

# 2. Khởi tạo schema và seed dữ liệu vào DB test
cd server
$env:DATABASE_URL="postgresql://postgres:123456@localhost:5432/vegetarian_test_db"
npx prisma db push
node prisma/seed.js

# 3. Chạy toàn bộ test suite
npm test
```

---

## 12. 📐 Quy ước Code & Git

- **Quy chuẩn mã nguồn:**
  - Không dữ liệu giả (`No Mock Data`) trong code chạy thật.
  - Xử lý đủ 4 trạng thái UI: `loading`, `error`, `empty`, `success`.
  - Component React $\le 250$ dòng, hàm JS $\le 30$ dòng, tham số $\le 3$.
- **Quy ước đặt tên (FE ↔ BE ↔ DB):**
  - Model Prisma: `PascalCase` (`User`, `Post`, `Comment`).
  - Bảng Database: `snake_case` số nhiều (`@@map("users")`, `@@map("posts")`).
  - Cột Database: `snake_case` (`@map("created_at")`, `@map("user_id")`).
  - JSON API: `camelCase` (`userId`, `createdAt`).
- **Quy ước Commit:** Theo chuẩn Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

---

## 13. 🔧 Troubleshooting các lỗi thường gặp

1. **Lỗi `P1001: Can't reach database server at localhost:5432`:**
   - *Nguyên nhân:* Dịch vụ PostgreSQL chưa khởi động hoặc sai thông tin mật khẩu trong `DATABASE_URL`.
   - *Khắc phục:* Mở `Services` trên Windows, kiểm tra dịch vụ `postgresql-x64-15` đang ở trạng thái `Running`. Kiểm tra lại user/password trong file `.env`.
2. **Lỗi 403 Forbidden khi truy cập `/api/admin/*`:**
   - *Nguyên nhân:* Đang dùng tài khoản thành viên thông thường (Role 2).
   - *Khắc phục:* Đăng nhập bằng tài khoản Quản trị viên `admin@swp391.com` / `123456`.
3. **Lỗi `ReferenceError: window is not defined` khi chạy test Frontend:**
   - *Nguyên nhân:* Môi trường Node.js không có sẵn đối tượng browser.
   - *Khắc phục:* Đảm bảo các file test có mock `globalThis.window` và `sessionStorage` tương thích trước khi gọi hàm.

---

## 14. 📄 License & Thông tin liên hệ

- **Dự án học tập:** SWP391 - Kỹ thuật phần mềm (FPT University).
- **Nhóm phát triển:** Đội ngũ Kỹ sư Chay Xanh SWP391.
- **Bản quyền:** Mã nguồn phục vụ mục đích nghiên cứu và phát triển học thuật.
