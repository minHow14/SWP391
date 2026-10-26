[![CI Pipeline](https://github.com/minHow14/SWP391/actions/workflows/ci.yml/badge.svg)](https://github.com/minHow14/SWP391/actions/workflows/ci.yml)

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
- **Giám sát Mô hình AI:** Theo dõi trạng thái hoạt động của các mô hình (Gợi ý thực đơn, Chatbot tư vấn, Kiểm duyệt tự động) và tra cứu nhật ký `ai_logs`.
- **Can thiệp Thủ công AI:** Ghi nhận điều chỉnh, phản hồi sửa lỗi khi AI đưa ra kết quả chưa chuẩn xác.
- **Quản lý Báo cáo:** Xử lý các phản ánh vi phạm từ người dùng trong cộng đồng.

---

## 3. 🛠️ Công nghệ & Phiên bản cụ thể

| Phân hệ | Công nghệ chính | Phiên bản | Thư viện & Công cụ bổ trợ |
| :--- | :--- | :--- | :--- |
| **Frontend (`client/`)** | React | `^19.2.8` | Vite `^8.3.0`, React-Bootstrap `^2.10.10`, Bootstrap 5, Bootstrap Icons, Axios `^1.14.0`, React Router `^8.4.0` |
| **Backend (`server/`)** | Node.js (ESM), Express | `^5.2.1` | Prisma ORM `^6.19.3`, PostgreSQL, Zod `^4.6.5`, bcryptjs `^3.0.3`, jsonwebtoken `^9.0.3`, Vitest `^5.0.3`, Supertest |
| **AI Service (`ai_service/`)** | Python, FastAPI | `3.11+` | LangChain, DeepSeek API (v4 Fallback), SlowAPI, Pydantic v2, Pytest |
| **Database** | PostgreSQL | `>= 15.0` | Prisma Schema + Migrations, Raw SQL, Connection Pooling |

---

## 4. 🏛️ Kiến trúc tổng quan

Kiến trúc hệ thống tuân thủ mô hình **Microservices với AI Gateway Pattern**. Backend Express đóng vai trò API Gateway duy nhất kiểm soát toàn bộ lưu lượng, xác thực người dùng, giới hạn hạn ngạch (Guest Quota & Rate Limit) và lưu nhật ký (`ai_logs`), đầu vào/prompt/kết quả của thành viên (`ai_generations`). AI Microservice là dịch vụ tính toán phi trạng thái (stateless), tuyệt đối không kết nối trực tiếp vào cơ sở dữ liệu và chỉ giao tiếp với Backend qua khóa nội bộ bảo mật.

```mermaid
flowchart TD
    subgraph ClientLayer ["1. Frontend Web App (client/)"]
        Client["React 19 + Vite + React-Bootstrap<br/>Axios Interceptor + React Router<br/>(Port 5173)"]
    end

    subgraph BackendLayer ["2. Backend Core Server / AI Gateway (server/)"]
        Server["Express.js 5 + Layered Architecture<br/>JWT Auth & RBAC (Role 1: Admin, Role 2: User)<br/>Guest Quota & AI Logging Manager<br/>(Port 5000)"]
    end

    subgraph AILayer ["3. AI Microservice (ai_service/)"]
        AIService["FastAPI + LangChain<br/>Stateless Microservice<br/>Auth: X-Internal-Api-Key<br/>(Port 8000)"]
    end

    subgraph DataLayer ["4. Persistence & External Models"]
        DB[("PostgreSQL 15+ Database<br/>(vegetarian_db)")]
        DeepSeek["DeepSeek LLM Engine"]
    end

    Client -- "HTTP / REST API / Bearer Token / SSE" --> Server
    Server -- "Prisma Client (ACID, Raw Queries)" --> DB
    Server -- "Internal HTTP + X-Internal-Api-Key" --> AIService
    AIService -- "Prompt & Streaming Completion" --> DeepSeek
```

---

## 5. 📂 Cấu trúc thư mục

```text
SWP391/
├── client/                     # Frontend React SPA
│   ├── src/
│   │   ├── components/         # Header, Footer, SiteLayout, AuthForm...
│   │   ├── features/admin/     # Các bảng & modal phân rã cho Admin Portal (<250 dòng)
│   │   ├── pages/              # Trang công cộng (Home, Recipes, Community, Profile...)
│   │   │   └── admin/          # Cổng Quản trị AdminPortal & các Tab chức năng
│   │   ├── services/           # apiClient.js, authService.js, workspaceService.js, placeService.js...
│   │   ├── context/            # DatabaseProvider, databaseContext
│   │   ├── hooks/              # Custom hooks (useDatabase, useAuth...)
│   │   ├── utils/              # Tiện ích session, syncEvents, helpers...
│   │   └── App.jsx             # React Router định tuyến (kèm /admin)
│   └── test/                   # Kiểm thử logic FE & Admin
│
├── server/                     # Backend REST API
│   ├── src/
│   │   ├── config/             # Kết nối Prisma Client, cấu hình env
│   │   ├── constants/          # Roles, Status, HttpStatus
│   │   ├── controllers/        # Tiếp nhận request & trả envelope JSON (kèm ai.controller.js)
│   │   ├── middlewares/        # authMiddleware (JWT, RBAC), validation, error
│   │   ├── repositories/       # Nơi duy nhất gọi Prisma Client (tách SRP theo model)
│   │   ├── routes/             # Định tuyến RESTful (/api/ai, /api/v1/ai-generations)
│   │   ├── services/           # Logic nghiệp vụ (kèm ai.service.js, admin.service.js)
│   │   └── utils/              # apiResponse, apiError, jwt
│   ├── prisma/                 # schema.prisma, migrations/, seed.js & seed.sql
│   ├── scripts/                # Script bảo trì: import-ingredient-images, repair, sync-assets
│   └── tests/                  # Kiểm thử tự động Vitest
│
├── ai_service/                 # AI Microservice Python FastAPI (Stateless)
│   ├── agents/                 # Chatbot Agent & Meal Planner Agent
│   ├── api/                    # Routers: /api/chat, /api/meal-planner, /api/admin-actions
│   └── core/                   # Cấu hình DeepSeek LLM, Security (X-Internal-Api-Key), Logging
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
Mở terminal `psql` hoặc pgAdmin và tạo database:
```sql
CREATE DATABASE vegetarian_db;
```

### Bước 2: Khởi chạy Backend Server (Port 5000)
```bash
cd server
npm install
# Tạo file .env và điền các thông số theo bảng ở Mục 8
npm run prisma:generate
npx prisma migrate deploy
npm run seed                    # Chỉ khởi tạo dữ liệu khi DB mới
npm run dev
```
> Server sẽ hoạt động tại: `http://localhost:5000` (Kiểm tra sức khỏe: `http://localhost:5000/health`)

#### 🔑 Tài khoản mẫu sẵn sàng sử dụng:
- **Quản trị viên (Admin - Role 1):** `admin@swp391.com` | Mật khẩu: `123456` *(Đăng nhập vào thẳng Dashboard `/admin`)*
- **Người dùng thường (User - Role 2):** `user@swp391.com` | Mật khẩu: `123456`

Với DB đang có dữ liệu/lịch sử migration cũ, xem [hướng dẫn baseline](docs/AI_INTEGRATION.md) trước khi chạy migrate; không chấp nhận reset.

### Bước 3: Khởi chạy AI Microservice (Port 8000)
```bash
cd ai_service
python -m venv venv
.\venv\Scripts\Activate.ps1      # Trên Windows PowerShell (hoặc: source venv/bin/activate trên Linux/macOS)
pip install -r requirements.txt
# Tạo file .env và điền thông số (đặc biệt INTERNAL_API_KEY và DEEPSEEK_API_KEY) theo Mục 8
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
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

Tạo file từ `server/.env.example`, `ai_service/.env.example`. Sinh key bằng `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`; đặt cùng INTERNAL_API_KEY cho BE/AI, JWT_SECRET dùng key khác.

### 1. `server/.env`
| Biến môi trường | Giá trị mặc định / Mẫu | Mô tả |
| :--- | :--- | :--- |
| `PORT` | `5000` | Cổng HTTP của Backend Server |
| `NODE_ENV` | `development` | Môi trường phát triển |
| `CLIENT_URL` | `http://localhost:5173` | Địa chỉ Frontend cho phép CORS |
| `DATABASE_URL` | `postgresql://postgres:123456@localhost:5432/vegetarian_db` | Chuỗi kết nối PostgreSQL qua Prisma |
| `JWT_SECRET` | `Key ngẫu nhiên riêng của BE` | Khóa bí mật ký mã hóa JWT |
| `JWT_EXPIRES_IN` | `7d` | Thời hạn của Access Token |
| `AI_SERVICE_URL` | `http://127.0.0.1:8000` | Địa chỉ nội bộ kết nối tới AI Microservice |
| `INTERNAL_API_KEY` | `Không có mặc định; key ngẫu nhiên ≥32 ký tự` | Khóa bí mật nội bộ truyền qua header `X-Internal-Api-Key` |
| `AI_TIMEOUT_MS` | `180000` | Tổng thời gian chờ AI tối đa trên BE (ms) |
| `GUEST_DAILY_LIMIT`| `3` | Giới hạn số lượt dùng AI miễn phí mỗi ngày cho khách vãng lai |

### 2. `ai_service/.env`
| Biến môi trường | Giá trị mặc định / Mẫu | Mô tả |
| :--- | :--- | :--- |
| `INTERNAL_API_KEY` | `Không có mặc định; key ngẫu nhiên ≥32 ký tự` | Khóa so khớp với Backend qua header `X-Internal-Api-Key` |
| `DEEPSEEK_API_KEY` | `sk-xxxxxxxxxxxxxxxx` | Khóa kết nối API DeepSeek LLM Engine |
| `DEEPSEEK_MODEL` | `deepseek-chat` | Mô hình ngôn ngữ mặc định |
| `DEBUG` | `True` | Chế độ debug |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:5000` | Danh sách origin cho phép |

### 3. `client/.env`
| Biến môi trường | Giá trị mặc định / Mẫu | Mô tả |
| :--- | :--- | :--- |
| `VITE_API_URL` | `/api` | Base URL gọi API Backend (được proxy qua Vite sang port 5000) |

---

## 9. 📜 Danh sách Scripts

### Backend (`server/`)
- `npm run dev`: Chạy server ở chế độ giám sát tự tải lại (nodemon).
- `npm start`: Khởi động server production.
- `npm test`: Chạy Vitest/Supertest trên DB `_test` (AI Gateway, lưu prompt/kết quả, quota, Repository, Quản trị & RBAC).
- `npm run test:prepare`: Tạo/reset schema public của DB local `_test`, apply migrations và seed SQL.
- `npm run prisma:migrate -- --name <ten_thay_doi>`: Sinh/áp dụng migration local bằng Prisma Migrate.
- `npm run prisma:generate`: Tạo mã nguồn Prisma Client.
- Không dùng `prisma db push` cho DB có dữ liệu cần giữ; dùng Prisma Migrate.
- `npm run seed`: Nạp dữ liệu chuẩn từ `seed.sql`.
- `npm run db:repair-ingredients`: Cập nhật chi tiết dinh dưỡng nguyên liệu từ catalog chuẩn (`scripts/repair-ingredients.js`).
- `npm run db:import-ingredient-images`: Tải và lưu trữ binary ảnh nguyên liệu vào PostgreSQL (`scripts/import-ingredient-images.js`).
- `npm run assets:sync`: Đồng bộ nguồn ảnh nguyên liệu từ Wikimedia (`scripts/sync-ingredient-assets.js`).

### Frontend (`client/`)
- `npm run dev`: Khởi động Vite dev server.
- `npm run build`: Đóng gói ứng dụng thành phẩm (Production build).
- `npm test`: Chạy các bài kiểm thử với Node.js Test Runner (bao gồm kiểm thử Admin Service, AI APIs và components).
- `npm run preview`: Chạy thử bản build đã đóng gói trên máy local.

### AI Microservice (`ai_service/`)
- `uvicorn main:app --host 127.0.0.1 --port 8000 --reload`: Khởi động máy chủ phát triển FastAPI.
- `pytest`: Chạy các kiểm thử tự động với Pytest (bao gồm Chatbot Agent, Meal Planner SSE stream, Xác thực X-Internal-Api-Key, Tính toán Dinh dưỡng & Rate Limiting).


---

## 10. 📚 Link tài liệu API & ERD

- **AI Gateway, persistence & migration:** [`docs/AI_INTEGRATION.md`](docs/AI_INTEGRATION.md), [`docs/ai-openapi.json`](docs/ai-openapi.json).
- **Tài liệu ERD Database:** Lưu trữ tại [`docs/ERD.md`](docs/ERD.md)

- **Tài liệu Swagger / OpenAPI:** Truy cập trực tiếp tại `http://localhost:8000/docs` khi AI Service khởi chạy.
- **Quy chuẩn lập trình:** Chi tiết tại [`AGENTS.md`](AGENTS.md), [`server/AGENTS.md`](server/AGENTS.md), [`client/AGENTS.md`](client/AGENTS.md), và [`ai_service/AGENTS.md`](ai_service/AGENTS.md).

---

## 11. 🧪 Hướng dẫn chạy Test trên DB Test riêng

Backend bắt buộc nạp `.env.test`, tên DB kết thúc bằng `_test`. Không dùng DB phát triển để chạy test.

```powershell
cd server
Copy-Item .env.test.example .env.test
# Điền DATABASE_URL, JWT_SECRET, INTERNAL_API_KEY và PSQL_PATH trong .env.test.
# JWT_SECRET và INTERNAL_API_KEY dùng giá trị ngẫu nhiên riêng cho test.
npm run test:prepare
npm test
npm run test:database
```

`test:prepare` reset schema public của DB test local, áp dụng migration thật rồi seed SQL. Integration ảnh (`npm run test:ingredient-images`) cần 28 ảnh nguyên liệu thật được import vào DB test; xem tài liệu AI integration. Mỗi file test chạy tuần tự để tránh xung đột fixture cũ.

```powershell
cd ../client
npm test
npm run lint
npm run build
cd ../ai_service
.\venv\Scripts\python.exe -m pytest tests -q
.\venv\Scripts\python.exe -m ruff check agents api core schemas main.py tests
```

Provider được thay thế chỉ trong test; test không gọi DeepSeek thật. Các file `.env`, `.env.test` không được commit.

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
3. **Lỗi 401 Unauthorized khi Backend gọi AI Service:**
   - *Nguyên nhân:* `INTERNAL_API_KEY` trong `server/.env` không khớp với `INTERNAL_API_KEY` trong `ai_service/.env`.
   - *Khắc phục:* Kiểm tra và đồng bộ giá trị khóa bí mật giữa hai file môi trường.
4. **Lỗi `ReferenceError: window is not defined` khi chạy test Frontend:**
   - *Nguyên nhân:* Môi trường Node.js không có sẵn đối tượng browser.
   - *Khắc phục:* Đảm bảo các file test có mock `globalThis.window` và `sessionStorage` tương thích trước khi gọi hàm.

---

## 14. 📄 License & Thông tin liên hệ

- **Dự án học tập:** SWP391 - Kỹ thuật phần mềm (FPT University).
- **Nhóm phát triển:** Đội ngũ Kỹ sư Chay Xanh SWP391.
- **Bản quyền:** Mã nguồn phục vụ mục đích nghiên cứu và phát triển học thuật.
