# 🌱 Chay Xanh - Nền Tảng Hỗ Trợ Ăn Chay & Sống Khỏe Toàn Diện

> **Dự án SWP391 - FPT University | Software Development Project**  
> Hệ thống tích hợp toàn diện gồm ứng dụng Web SPA (React 18 + Vite + React-Bootstrap), Backend REST API phân tầng (Node.js/Express + Prisma + PostgreSQL) và AI Microservice tư vấn dinh dưỡng thông minh (Python FastAPI + LangChain).

---

## 1. 📖 Tên dự án & Bài toán giải quyết

**Chay Xanh** ra đời nhằm hỗ trợ cộng đồng tiếp cận lối sống ăn chay khoa học, lành mạnh và bền vững. Nền tảng kết hợp giữa mạng xã hội ẩm thực, công cụ khám phá món chay, tìm kiếm địa điểm quán ăn chay lân cận, trợ lý ảo AI hỗ trợ lập thực đơn cá nhân hóa, bóc tách công thức nấu ăn từ video YouTube và Trung tâm Quản trị (Admin Portal) toàn diện.

### Các bài toán cốt lõi:
1. **Thiếu kiến thức dinh dưỡng cân bằng:** Giải quyết nỗi lo thiếu vi chất (B12, sắt, canxi, protein thực vật) khi chuyển sang chế độ ăn chay.
2. **Khó khăn trong việc lên thực đơn:** Trợ lý AI tự động tính toán nhu cầu calo và đề xuất thực đơn 7 ngày phù hợp với thể trạng, mục tiêu sức khỏe và dị ứng thực phẩm.
3. **Thẩm định món ăn & Nhận diện phụ gia ẩn:** Quét hình ảnh bao bì/đĩa món qua AI Vision, phân tích đối chiếu 5 lớp quy tắc ẩm thực chay và bóc tách mã phụ gia quốc tế (E-numbers).
4. **Tìm kiếm địa điểm ăn chay đa tỉnh thành:** Định vị nhà hàng, quán chay uy tín xung quanh người dùng dựa trên tọa độ địa lý (GPS) hoặc các Hubs trọng điểm (Hà Nội, TP.HCM, Đà Nẵng, Cần Thơ, Huế) tích hợp ZIOMAP.
5. **Bóc tách công thức nấu ăn từ video:** Tự động chuyển đổi video YouTube hướng dẫn nấu ăn thành danh sách nguyên liệu, các bước chế biến và thông tin dinh dưỡng chay.
6. **Kết nối cộng đồng & Kiểm duyệt an toàn:** Chia sẻ công thức, nhật ký nấu nướng, video và tự động kiểm duyệt nội dung độc hại bằng AI kết hợp can thiệp thủ công từ Quản trị viên.

---

## 2. ✨ Tính năng chính

### Phân hệ Người dùng (Member Portal)
- **Kiểm tra món ăn & Quét nhãn thành phần qua hình ảnh (Smart Food & Label Vision Scanner):** Tự động nhận diện đĩa món ăn và bóc tách chữ/mã phụ gia quốc tế (E-numbers) trên bao bì sản phẩm qua AI Vision, đối chiếu theo 5 lớp quy tắc ẩm thực chay (Thịt & hải sản, Phụ phẩm động vật, Trứng/sữa/mật ong, Ngũ vị tân Phật giáo, Dị ứng cá nhân), cảnh báo nguy cơ gia vị ẩn (nước dùng hầm xương, nước mắm) và cung cấp bộ câu hỏi nhanh khi dùng bữa ngoài quán kèm gợi ý đổi món tức thì.
- **Đổi món chay thông minh (Food Swap):** Gợi ý nguyên liệu và món chay thay thế tương đương về cấu trúc dinh dưỡng.
- **Từ điển nguyên liệu chay:** Tra cứu chỉ số calo, đạm, đường, béo và nguồn gốc thực vật với hình ảnh minh họa chất lượng cao.
- **Khám phá công thức & Bản đồ Quán chay (Nearby Places):** Định vị GPS thời gian thực (hiệu ứng Radar Pulse), tính khoảng cách kép (`user_distance_m`), hệ thống Hubs đa tỉnh thành (TP.HCM, Hà Nội, Đà Nẵng, Cần Thơ, Huế), tùy chỉnh bán kính quét (3 - 20 km), lọc theo chế độ ăn (Thuần chay, Chay Phật giáo, Chay trứng sữa), tích hợp dịch vụ ZIOMAP kết hợp cơ chế Read-through Caching vào PostgreSQL (<100ms), tự động hiển thị ảnh đại diện và trạng thái mở/đóng cửa (`🟢 Đang mở cửa` / `🔴 Đã đóng cửa`).
- **Nhật ký dinh dưỡng cá nhân & Lập kế hoạch tuần (Nutrition Journal):** Ghi nhận khẩu phần calo theo ngày/tuần theo múi giờ địa phương (`Asia/Bangkok`), theo dõi chỉ số BMI, đo lường tỷ lệ năng lượng so với mục tiêu cá nhân.
- **Bóc tách công thức từ video YouTube (Video Recipe Summary):** Chuyển đổi video YouTube thành công thức chay chi tiết, hỗ trợ hàng đợi xử lý ngầm (Worker queue).

### Phân hệ Quản trị viên (Admin Portal - `/admin`)
- **Tổng quan Hệ thống (Dashboard):** Thống kê thời gian thực về thành viên, bài viết, video, tỷ lệ chính xác AI và việc cần xử lý.
- **Quản lý Thành viên:** Tra cứu danh sách, xem bài viết/bình luận của từng thành viên, khóa/mở khóa hoặc xóa tài khoản an toàn qua Modal xác nhận.
- **Quản lý Bài viết & Video:** Phê duyệt bài đăng mới, chỉnh sửa nội dung vi phạm tiêu chuẩn cộng đồng, xóa vĩnh viễn bài viết với Modal cảnh báo.
- **Quản lý Bình luận:** Kiểm tra tương tác, ẩn hoặc xóa bình luận spam/quảng cáo.
- **Quản lý Danh mục:** Thêm, sửa, xóa danh mục món ăn & blog nấu chay (có kiểm tra ràng buộc khóa ngoại).
- **Kiểm duyệt AI:** Xem xét các bài viết và bình luận bị AI gắn cờ ẩn trước khi quyết định phê duyệt khôi phục hoặc xóa vĩnh viễn.
- **Giám sát Mô hình AI:** Theo dõi trạng thái hoạt động của 4 mô hình thực tế (`chatbot`, `meal-planner`, `food-scanner`, `video-recipe`) và tra cứu nhật ký `ai_logs`.
- **Can thiệp Thủ công AI:** Đặt lại hạn mức khách vãng lai và xóa bộ nhớ đệm chatbot qua Modal xác thực.
- **Quản lý Báo cáo:** Xử lý và từ chối (`DISMISSED`) các phản ánh vi phạm từ người dùng trong cộng đồng.

---

## 3. 🛠️ Công nghệ & Phiên bản cụ thể

| Phân hệ | Công nghệ chính | Phiên bản | Thư viện & Công cụ bổ trợ |
| :--- | :--- | :--- | :--- |
| **Frontend (`client/`)** | React | `^18.3.1` / `^19.x` | Vite `^6.x` / `^8.x`, React-Bootstrap `^2.10.x`, Bootstrap 5, Bootstrap Icons, Axios `^1.7.x`, React Router `^7.x` |
| **Backend (`server/`)** | Node.js (ESM), Express | `^5.2.1` | Prisma ORM `^6.19.3`, PostgreSQL, Zod `^4.6.5`, bcryptjs `^3.0.3`, jsonwebtoken `^9.0.3`, Vitest `^5.0.3`, Supertest |
| **AI Service (`ai_service/`)** | Python, FastAPI | `3.11+` | LangChain, DeepSeek API (v4 Fallback), Groq API, SlowAPI, Pydantic v2, Pytest |
| **Database** | PostgreSQL | `>= 15.0` | Prisma Schema + Migrations, Raw SQL, Connection Pooling |

---

## 4. 🏛️ Kiến trúc tổng quan

Kiến trúc hệ thống tuân thủ mô hình **Microservices với AI Gateway Pattern**:
- **Backend Express (`server/`)**: Đóng vai trò API Gateway duy nhất kiểm soát toàn bộ lưu lượng, xác thực người dùng (JWT + HttpOnly Cookie), quản lý Silent Refresh Token, giới hạn hạn ngạch (Guest Quota & Rate Limit), điều phối Worker xử lý video ngầm và lưu nhật ký (`ai_logs`), đầu vào/kết quả của thành viên (`ai_generations`).
- **AI Microservice (`ai_service/`)**: Là dịch vụ tính toán phi trạng thái (stateless), tuyệt đối không kết nối trực tiếp vào cơ sở dữ liệu và chỉ giao tiếp với Backend qua khóa nội bộ bảo mật `X-Internal-Api-Key`.
- **Frontend SPA (`client/`)**: Xây dựng bằng React-Bootstrap thuần nhất, phân rã component theo SRP ($\le 250$ dòng), tích hợp Axios Interceptor tự động làm mới token ngầm khi nhận 401.

```mermaid
flowchart TD
    subgraph ClientLayer ["1. Frontend Web App (client/)"]
        Client["React + Vite + React-Bootstrap<br/>Axios Interceptor + Silent Refresh<br/>(Port 5173)"]
    end

    subgraph BackendLayer ["2. Backend Core Server / AI Gateway (server/)"]
        Server["Express.js 5 + Layered Architecture<br/>JWT Auth & RBAC (Role 1: Admin, Role 2: User)<br/>Worker Queue & AI Logging Manager<br/>(Port 5000)"]
    end

    subgraph AILayer ["3. AI Microservice (ai_service/)"]
        AIService["FastAPI + LangChain + Groq/DeepSeek<br/>Stateless Microservice<br/>Auth: X-Internal-Api-Key<br/>(Port 8000)"]
    end

    subgraph DataLayer ["4. Persistence & External Models"]
        DB[("PostgreSQL 15+ Database<br/>(vegetarian_db)")]
        DeepSeek["DeepSeek / Groq Engine"]
        Ziomap["ZIOMAP Search API"]
    end

    Client -- "HTTP / REST API / Bearer Token / SSE" --> Server
    Server -- "Prisma Client (ACID, Raw Queries)" --> DB
    Server -- "Internal HTTP + X-Internal-Api-Key" --> AIService
    Server -- "Place Search Caching" --> Ziomap
    AIService -- "Prompt & Vision Completion" --> DeepSeek
```

---

## 5. 📂 Cấu trúc thư mục

```text
SWP391/
├── client/                     # Frontend React SPA (React-Bootstrap)
│   ├── src/
│   │   ├── components/         # Header, Footer, SiteLayout, ContentDialog, ContentImage...
│   │   ├── features/           # Gom nhóm theo miền nghiệp vụ (<250 dòng/file):
│   │   │   ├── admin/          # Admin Portal tabs & modal xác thực (AdminPostsTab, AdminCommentsTab...)
│   │   │   ├── diet/           # Chế độ ăn chay (WelcomeModal...)
│   │   │   ├── foodScanner/    # Quét ảnh AI Vision & bóc tách phụ gia (components/, hooks/)
│   │   │   ├── journal/        # Nhật ký calo & kế hoạch tuần (components/, hooks/, utils/)
│   │   │   ├── profile/        # Quản lý hồ sơ sức khỏe & lịch sử cân nặng
│   │   │   └── restaurants/    # Quán chay quanh bạn & bản đồ đa tỉnh thành (components/, utils/)
│   │   ├── pages/              # Trang công cộng (Home, Recipes, Community, FoodScanner, Journal, FoodSwap...)
│   │   │   └── admin/          # Cổng Quản trị AdminPortal & AdminAi
│   │   ├── services/           # apiClient.js (Axios Instance duy nhất), authService.js, placeService.js...
│   │   ├── context/            # DatabaseProvider, databaseContext
│   │   ├── hooks/              # Custom hooks (useDatabase, useAuth...)
│   │   ├── utils/              # Tiện ích session, syncEvents, recipeFilters...
│   │   └── App.jsx             # React Router định tuyến
│   └── test/                   # Kiểm thử logic FE & Admin (86/86 passed)
│
├── server/                     # Backend REST API (Node.js/Express)
│   ├── src/
│   │   ├── config/             # Kết nối Prisma Client, cấu hình Zod env
│   │   ├── constants/          # Roles, Status, HttpStatus
│   │   ├── controllers/        # Tiếp nhận request & trả envelope JSON
│   │   ├── middlewares/        # authMiddleware (JWT, RBAC), validation, error
│   │   ├── repositories/       # Nơi duy nhất gọi Prisma Client (tách SRP theo model)
│   │   ├── routes/             # Định tuyến RESTful v1 (/api/v1/...)
│   │   ├── services/           # Logic nghiệp vụ (auth, admin, places, ai, video recipe...)
│   │   ├── validators/         # Zod schemas validate request
│   │   ├── workers/            # Worker xử lý tóm tắt video ngầm
│   │   └── utils/              # apiResponse, apiError, jwt
│   ├── prisma/                 # schema.prisma, migrations/, seed.js & seed.sql
│   ├── scripts/                # Script bảo trì: import-ingredient-images, repair, sync-assets
│   └── tests/                  # Kiểm thử tự động Vitest (28 files, 266 tests)
│
├── ai_service/                 # AI Microservice Python FastAPI (Stateless)
│   ├── app/                    # API routers, agents, core security, llm
│   ├── tests/                  # Kiểm thử tự động Pytest (152 tests)
│   └── main.py                 # FastAPI application entrypoint
│
├── docs/                       # Tài liệu thiết kế ERD & OpenAPI
│   ├── ai-openapi.json         # Đặc tả OpenAPI chuẩn cho toàn bộ AI Gateway & Video Recipe APIs
│   ├── AI_INTEGRATION.md       # Chi tiết kiến trúc tích hợp AI Microservice
│   └── ERD.md                  # Sơ đồ quan hệ thực thể cơ sở dữ liệu
└── README.md                   # Hướng dẫn toàn diện dự án (14 mục chuẩn)
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
CREATE DATABASE vegetarian_db_test;
```

### Bước 2: Khởi chạy Backend Server (Port 5000)
```powershell
cd server
npm install
Copy-Item .env.example .env
# Chỉnh sửa mật khẩu PostgreSQL trong DATABASE_URL của server/.env nếu cần
npm run prisma:generate
npx prisma migrate deploy
npm run seed                    # Nạp dữ liệu danh mục & nguyên liệu chuẩn
npm run dev
```
> Server sẽ hoạt động tại: `http://localhost:5000` (Kiểm tra sức khỏe: `http://localhost:5000/health`)

#### 🔑 Tài khoản mẫu sẵn sàng sử dụng:
- **Quản trị viên (Admin - Role 1):** `admin@swp391.com` | Mật khẩu: `123456`
- **Người dùng thường (User - Role 2):** `user@swp391.com` | Mật khẩu: `123456`

### Bước 3: Khởi chạy AI Microservice (Port 8000)
```powershell
cd ../ai_service
python -m venv venv
.\venv\Scripts\Activate.ps1      # Trên Windows PowerShell (hoặc: source venv/bin/activate trên Linux/macOS)
pip install -r requirements.txt
Copy-Item .env.example .env
# Điền INTERNAL_API_KEY (khớp với server/.env) và DEEPSEEK_API_KEY
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
> AI Service sẽ hoạt động tại: `http://localhost:8000` (Swagger docs: `http://localhost:8000/docs`)

### Bước 4: Khởi chạy Frontend Web App (Port 5173)
```powershell
cd ../client
npm install
npm run dev
```
> Truy cập ứng dụng tại: `http://localhost:5173`

---

## 8. 🔐 Bảng biến môi trường (Environment Variables)

### 1. `server/.env`
| Biến môi trường | Giá trị mặc định / Mẫu | Mô tả |
| :--- | :--- | :--- |
| `PORT` | `5000` | Cổng HTTP của Backend Server |
| `NODE_ENV` | `development` | Môi trường hoạt động |
| `CLIENT_URL` | `http://localhost:5173` | Địa chỉ Frontend cho phép CORS |
| `DATABASE_URL` | `postgresql://postgres:123456@localhost:5432/vegetarian_db` | Chuỗi kết nối PostgreSQL qua Prisma |
| `JWT_SECRET` | `swp391_jwt_secret_key_super_secure_vegetarian_2026` | Khóa bí mật ký mã hóa JWT (≥32 ký tự) |
| `JWT_EXPIRES_IN` | `7d` | Thời hạn Access Token |
| `REFRESH_TOKEN_SECRET` | `swp391_refresh_secret_key_super_secure_vegetarian_2026` | Khóa ký Refresh Token dài hạn |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d` | Thời hạn Refresh Token |
| `AI_GUEST_COOKIE_SECRET` | Chuỗi bí mật hex 64 ký tự | Khóa ký cookie nhận diện khách vãng lai |
| `AI_SERVICE_URL` | `http://127.0.0.1:8000` | Địa chỉ nội bộ kết nối tới AI Microservice |
| `INTERNAL_API_KEY` | `chayxanh_internal_secure_key_2026` | Khóa xác thực nội bộ header `X-Internal-Api-Key` |
| `AI_TIMEOUT_MS` | `180000` | Thời gian chờ AI phản hồi tối đa (ms) |
| `GUEST_DAILY_LIMIT`| `3` | Số lượt dùng AI miễn phí mỗi ngày cho khách |
| `RATE_LIMIT_MAX` | `300` | Giới hạn request tối đa / 15 phút |
| `AUTH_RATE_LIMIT_MAX`| `15` | Giới hạn đăng nhập/đăng ký sai |
| `PLACES_RATE_LIMIT`| `60` | Giới hạn tra cứu địa điểm / phút |
| `ZIOMAP_API_KEY` | Key ZIOMAP (tùy chọn) | Khóa API tìm kiếm địa điểm bản đồ ZIOMAP |
| `ZIOMAP_API_URL` | `https://ziomap-api.socibi.com/api/place/text-search` | Endpoint tìm kiếm văn bản ZIOMAP |

### 2. `ai_service/.env`
| Biến môi trường | Giá trị mặc định / Mẫu | Mô tả |
| :--- | :--- | :--- |
| `INTERNAL_API_KEY` | `chayxanh_internal_secure_key_2026` | Khóa so khớp với Backend qua `X-Internal-Api-Key` |
| `DEEPSEEK_API_KEY` | `sk-xxxxxxxxxxxxxxxx` | Khóa kết nối API DeepSeek LLM Engine |
| `DEEPSEEK_MODEL` | `deepseek-chat` | Mô hình ngôn ngữ chính |
| `DEEPSEEK_FALLBACK_MODEL` | `deepseek-v4-pro` | Mô hình ngôn ngữ dự phòng |
| `DEBUG` | `False` | Bật/tắt chế độ debug |
| `ALLOWED_ORIGINS` | `http://localhost:5000` | Danh sách origin cho phép gọi nội bộ |
| `TRUSTED_PROXIES` | `127.0.0.1,::1` | Địa chỉ proxy tin cậy |
| `RATE_LIMIT` | `30/minute` | Giới hạn tốc độ gọi AI nội bộ |
| `GROQ_API_KEY` | Key API Groq (tùy chọn) | Dùng cho bóc tách âm thanh video công thức |

### 3. `client/.env`
| Biến môi trường | Giá trị mặc định / Mẫu | Mô tả |
| :--- | :--- | :--- |
| `VITE_API_URL` | `/api` | Base URL gọi API Backend (được proxy qua Vite sang port 5000) |

---

## 9. 📜 Danh sách Scripts

### Backend (`server/`)
- `npm run dev`: Chạy server ở chế độ giám sát tự tải lại (nodemon).
- `npm start`: Khởi động server production.
- `npm test`: Chạy toàn bộ 28 test suites (266 tests) trên DB `vegetarian_db_test`.
- `npm run test:prepare`: Chuẩn bị database kiểm thử riêng biệt (áp dụng migrations + seed test data).
- `npm run test:video-recipes`: Kiểm thử riêng biệt luồng bóc tách công thức video YouTube (8 files, 79 tests).
- `npm run test:database`: Kiểm thử tích hợp danh mục, authentication, CRUD bài viết và nhật ký dinh dưỡng.
- `npm run test:ai-internal-auth`: Kiểm thử tích hợp cơ chế xác thực nội bộ BE ↔ FastAPI.
- `npm run test:ingredient-images`: Kiểm thử tích hợp phục vụ 28 ảnh nguyên liệu thực tế.
- `npm run worker:video-recipes`: Khởi động background worker tóm tắt video công thức.
- `npm run prisma:migrate`: Sinh và áp dụng migration mới vào database phát triển.
- `npm run prisma:generate`: Tạo mã nguồn Prisma Client.
- `npm run seed`: Nạp dữ liệu chuẩn hệ thống từ `seed.js`.

### Frontend (`client/`)
- `npm run dev`: Khởi động Vite development server tại port 5173.
- `npm run build`: Đóng gói ứng dụng thành phẩm (Production build).
- `npm test`: Chạy toàn bộ 86 bài kiểm thử Node.js Test Runner (Admin, AI APIs, Filters, Helpers).
- `npm run preview`: Xem trước bản build production tại local.

### AI Microservice (`ai_service/`)
- `uvicorn main:app --host 127.0.0.1 --port 8000 --reload`: Khởi động máy chủ phát triển FastAPI.
- `pytest`: Chạy 152 bài kiểm thử tự động với Pytest (Chatbot, Meal Planner, AI Security, Video Schemas).

---

## 10. 📚 Link tài liệu API & ERD

- **Đặc tả OpenAPI / Swagger:** Lưu trữ đầy đủ tại [`docs/ai-openapi.json`](docs/ai-openapi.json) (hoặc trực tiếp tại `http://localhost:8000/docs`).
- **Tài liệu Kiến trúc Tích hợp AI:** Xem chi tiết tại [`docs/AI_INTEGRATION.md`](docs/AI_INTEGRATION.md).
- **Sơ đồ ERD Database:** Lưu trữ tại [`docs/ERD.md`](docs/ERD.md).
- **Quy tắc Kiến trúc Toàn dự án:** [`AGENTS.md`](AGENTS.md), [`server/AGENTS.md`](server/AGENTS.md), [`client/AGENTS.md`](client/AGENTS.md).

---

## 11. 🧪 Hướng dẫn chạy Test trên DB Test riêng

Backend bắt buộc nạp `.env.test`, trỏ vào `vegetarian_db_test` để đảm bảo an toàn tuyệt đối cho database phát triển:

```powershell
# 1. Chạy test Backend (server/)
cd server
npm run test:prepare
npm test
npm run test:database
npm run test:ai-internal-auth
npm run test:ingredient-images

# 2. Chạy test Frontend (client/)
cd ../client
npm test

# 3. Chạy test AI Microservice (ai_service/)
cd ../ai_service
pytest
```

---

## 12. 📐 Quy ước Code & Git

- **Quy chuẩn mã nguồn:**
  - Không dữ liệu giả (`No Mock Data`) trong code chạy thật ở mọi tầng.
  - Xử lý đủ 4 trạng thái UI: `loading`, `error`, `empty`, `success`.
  - Component React $\le 250$ dòng, hàm JS $\le 30$ dòng, tham số $\le 3$.
  - Không tự ý thêm DevOps (không Docker, CI/CD, deploy cloud ngoài phạm vi local).
- **Quy ước đặt tên xuyên suốt:**
  - Model Prisma: `PascalCase` (`User`, `Post`, `Comment`, `VideoRecipeSummaryJob`).
  - Bảng Database: `snake_case` số nhiều (`@@map("users")`, `@@map("video_recipe_summary_jobs")`).
  - Cột Database: `snake_case` (`@map("created_at")`, `@map("user_id")`).
  - JSON API (FE ↔ BE ↔ AI): `camelCase` (`userId`, `createdAt`, `recipeName`).
- **Quy ước Git:** Theo chuẩn Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

---

## 13. 🔧 Troubleshooting các lỗi thường gặp

1. **Lỗi `P1001: Can't reach database server at localhost:5432`:**
   - *Nguyên nhân:* PostgreSQL chưa chạy hoặc sai mật khẩu trong `DATABASE_URL`.
   - *Khắc phục:* Mở Services Windows, kiểm tra dịch vụ PostgreSQL đang `Running`. So khớp user/password trong `server/.env`.
2. **Lỗi `The table public.video_recipe_summary_jobs does not exist`:**
   - *Nguyên nhân:* Migration chưa được deploy vào database local.
   - *Khắc phục:* Chạy `npx prisma migrate deploy` trên `vegetarian_db` và `npm run test:prepare` trên `vegetarian_db_test`.
3. **Lỗi 401 Unauthorized khi Backend gọi AI Service:**
   - *Nguyên nhân:* `INTERNAL_API_KEY` trong `server/.env` không khớp với `ai_service/.env`.
   - *Khắc phục:* Sao chép chính xác cùng một chuỗi khóa bí mật nội bộ vào cả hai file cấu hình.
4. **Lỗi `ReferenceError: window is not defined` khi chạy test Frontend:**
   - *Nguyên nhân:* Môi trường Node.js thiếu đối tượng trình duyệt.
   - *Khắc phục:* Các bài test đã được cấu hình mock `globalThis.window` và `sessionStorage` tương thích trong thư mục `client/test/`.
5. **Lỗi `ZodError: ZIOMAP_API_URL`:**
   - *Nguyên nhân:* Thiếu biến `ZIOMAP_API_URL` trong file `.env`.
   - *Khắc phục:* Thêm `ZIOMAP_API_URL=https://ziomap-api.socibi.com/api/place/text-search` vào `server/.env`.

---

## 14. 📄 License & Thông tin liên hệ

- **Dự án học tập:** SWP391 - Software Development Project (FPT University).
- **Đội ngũ phát triển:** Chay Xanh Monorepo Engineering Team.
- **Bản quyền:** Mã nguồn phục vụ mục đích nghiên cứu và phát triển học thuật.
