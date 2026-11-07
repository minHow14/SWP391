# 🌱 Chay Xanh - Nền Tảng Hỗ Trợ Ăn Chay & Sống Khỏe Toàn Diện

> **Dự án SWP391 - FPT University | Software Development Project**  
> Hệ thống tích hợp toàn diện gồm ứng dụng Web SPA (React 19 + Vite + React-Bootstrap), Backend REST API phân tầng (Node.js / Express 5 + Prisma 6 + PostgreSQL 15+) và AI Microservice tư vấn dinh dưỡng thông minh (Python 3.11+ / FastAPI + LangChain + DeepSeek LLM).

---

## 📑 Mục lục tài liệu (Table of Contents)

1. [Giới thiệu & Tổng quan dự án (Project Overview)](#1-giới-thiệu--tổng-quan-dự-án-project-overview)
2. [Tính năng chính & Trạng thái triển khai (Key Features)](#2-tính-năng-chính--trạng-thái-triển-khai-key-features)
3. [Ngăn xếp công nghệ thực tế (Technology Stack)](#3-ngăn-xếp-công-nghệ-thực-tế-technology-stack)
4. [Kiến trúc hệ thống & Luồng giao tiếp (System Architecture)](#4-kiến-trúc-hệ-thống--luồng-giao-tiếp-system-architecture)
5. [Cấu trúc thư mục Monorepo (Project Structure)](#5-cấu-trúc-thư-mục-monorepo-project-structure)
6. [Điều hướng tài liệu kỹ thuật chi tiết (Documentation Navigation)](#6-điều-hướng-tài-liệu-kỹ-thuật-chi-tiết-documentation-navigation)
7. [Yêu cầu hệ thống môi trường local (Prerequisites)](#7-yêu-cầu-hệ-thống-môi-trường-local-prerequisites)
8. [Hướng dẫn cài đặt & Khởi động từng bước (Installation & Setup)](#8-hướng-dẫn-cài-đặt--khởi-động-từng-bước-installation--setup)
9. [Tổng quan biến môi trường (Environment Variables Overview)](#9-tổng-quan-biến-môi-trường-environment-variables-overview)
10. [Tổng quan cơ sở dữ liệu (Database Overview)](#10-tổng-quan-cơ-sở-dữ-liệu-database-overview)
11. [Tổng quan xác thực & Phân quyền (Authentication & Authorization)](#11-tổng-quan-xác-thực--phân-quyền-authentication--authorization)
12. [Vận hành toàn bộ hệ thống (Running the Entire Project)](#12-vận-hành-toàn-bộ-hệ-thống-running-the-entire-project)
13. [Danh mục Scripts thực tế](#13-danh-mục-scripts-thực-tế)
14. [Tổng hợp chiến lược kiểm thử (Testing Overview)](#14-tổng-hợp-chiến-lược-kiểm-thử-testing-overview)
15. [Quy chuẩn mã nguồn & Quy ước Git](#15-quy-chuẩn-mã-nguồn--quy-ước-git)
16. [Xử lý sự cố thường gặp (Troubleshooting)](#16-xử-lý-sự-cố-thường-gặp-troubleshooting)
17. [Thành viên phát triển & Bản quyền (Contributors & License)](#17-thành-viên-phát-triển--bản-quyền-contributors--license)

---

## 1. Giới thiệu & Tổng quan dự án (Project Overview)

**Chay Xanh** ra đời nhằm hỗ trợ cộng đồng tiếp cận lối sống ăn chay khoa học, lành mạnh và bền vững. Nền tảng kết hợp giữa mạng xã hội ẩm thực, công cụ khám phá món chay, tìm kiếm địa điểm quán ăn chay lân cận, trợ lý ảo AI hỗ trợ lập thực đơn cá nhân hóa và Trung tâm Quản trị (Admin Portal) toàn diện.

### Các bài toán cốt lõi:
1. **Thiếu kiến thức dinh dưỡng cân bằng:** Giải quyết nỗi lo thiếu vi chất (B12, sắt, canxi, protein thực vật) khi chuyển sang chế độ ăn chay.
2. **Khó khăn trong việc lên thực đơn:** Trợ lý AI tự động tính toán nhu cầu calo và đề xuất thực đơn 7 ngày phù hợp với thể trạng, mục tiêu sức khỏe và dị ứng thực phẩm.
3. **Tìm kiếm địa điểm ăn chay:** Định vị nhà hàng, quán chay uy tín xung quanh người dùng dựa trên tọa độ địa lý (GPS) và dịch vụ ZIOMAP.
4. **Kết nối cộng đồng & Kiểm duyệt an toàn:** Chia sẻ công thức, nhật ký nấu nướng, video hướng dẫn và tự động kiểm duyệt nội dung độc hại bằng AI kết hợp can thiệp thủ công từ Quản trị viên.

### Đối tượng sử dụng:
- **Người mới bắt đầu ăn chay (Beginners):** Cần kiến thức dinh dưỡng, từ điển nguyên liệu, công thức dễ làm và hướng dẫn tránh thiếu chất.
- **Người ăn chay trường / theo tôn giáo (Vegans & Buddhist Vegetarians):** Cần bộ lọc khắt khe loại trừ ngũ vị tân, phụ phẩm động vật hoặc chế độ ăn thuần chay.
- **Quản trị viên hệ thống (Admins):** Cần dashboard giám sát số liệu, duyệt nội dung cộng đồng, kiểm tra sức khỏe hệ thống và can thiệp AI.

---

## 2. Tính năng chính & Trạng thái triển khai (Key Features)

Hệ thống phân định rõ ràng các tính năng theo vai trò và trạng thái thực tế trong source code:

| Tính năng | Đối tượng | Trạng thái | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| **Tra cứu danh mục & món ăn** | Khách / Member | `Implemented` | Xem công thức, tìm kiếm không dấu tiếng Việt, lọc theo danh mục và chế độ ăn. |
| **Tìm quán chay lân cận (Radar)** | Khách / Member | `Implemented` | Định vị GPS, tìm kiếm theo bán kính (3–20km), tích hợp ZIOMAP cache vào PostgreSQL. |
| **Từ điển nguyên liệu & Tỷ trọng** | Khách / Member | `Implemented` | Tra cứu dinh dưỡng, calo, dị ứng và bảng tỷ trọng chất lỏng (`liquid_ingredient_densities`); AI tra nguyên liệu mới kèm ước lượng dinh dưỡng trên 100 g. |
| **Trợ lý AI Chat tư vấn dinh dưỡng** | Khách / Member | `Implemented` | Hạn ngạch 3 lượt/ngày cho khách; thành viên không giới hạn lượt, lưu lịch sử hội thoại. |
| **Lập thực đơn AI 7 ngày** | Thành viên | `Implemented` | Tính TDEE/BMI, sinh thực đơn theo thể trạng, dị ứng, mục tiêu; hỗ trợ áp dụng vào lịch tuần. |
| **Quét nhãn & Kiểm tra món (Scanner)** | Khách / Member | `Implemented` | Nhận diện ảnh món ăn / nhãn thành phần qua AI Vision, kiểm tra quy tắc chay 5 lớp. |
| **Trích xuất công thức từ YouTube** | Thành viên | `Implemented` | Gửi link YouTube tiếng Việt (≤11 phút), worker trích xuất phụ đề và tóm tắt công thức. |
| **Đăng bài cộng đồng, bình chọn, bình luận**| Thành viên | `Implemented` | Đăng bài kèm ảnh/video, upvote/downvote, bình luận trao đổi; tự động gửi qua hàng đợi duyệt. |
| **Nhật ký dinh dưỡng & Cân nặng** | Thành viên | `Implemented` | Ghi nhận bữa ăn theo ngày, tính tổng calo và vĩ chất; biểu đồ theo dõi cân nặng. |
| **Quản trị Dashboard & Thành viên** | Admin (Role 1) | `Implemented` | Thống kê số liệu, khóa/mở khóa/xóa tài khoản, khôi phục tài khoản với metadata bảo toàn. |
| **Quản trị Nội dung & Kiểm duyệt** | Admin (Role 1) | `Implemented` | Quản lý bài viết, video, bình luận, danh mục món ăn; xử lý vi phạm báo cáo từ người dùng. |
| **Giám sát Mô hình AI & System Health**| Admin (Role 1) | `Implemented` | Kiểm tra trạng thái kết nối PostgreSQL & AI Service, xem log `ai_logs`, tỷ lệ thành công. |
| **Quản lý Văn bản Pháp lý** | Admin (Role 1) | `Implemented` | Soạn thảo, lưu nháp và công bố Điều khoản sử dụng và Chính sách bảo mật. |
| **Nhận diện nguyên liệu trong tủ lạnh** | Khách / Member | `Partially Implemented` | Đã có agent, schema và API trong `ai_service/api/vision.py` và validator BE, nhưng **chưa mount router** vào FastAPI và route BE bị comment. |

---

## 3. Ngăn xếp công nghệ thực tế (Technology Stack)

Toàn bộ phiên bản dưới đây được đối chiếu và xác nhận trực tiếp từ `server/package.json`, `client/package.json` và `ai_service/requirements.txt`:

| Phân hệ | Công nghệ | Phiên bản | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| **Frontend Core** | React | `^19.2.8` (19.3.0) | Thư viện UI nền tảng xây dựng SPA theo mô hình Declarative Component. |
| **Frontend Tooling** | Vite | `^8.3.0` (8.3.3) | Build tool và Dev server với Hot Module Replacement (HMR). |
| **Frontend UI/UX** | React-Bootstrap / Bootstrap | `^2.10.10` / `^5.3.8` | Bộ thành phần giao diện chuẩn và hệ thống lưới Responsive Grid. |
| **Frontend Icons** | Bootstrap Icons | `^1.13.1` | Hệ thống vector icon thống nhất. |
| **Frontend Routing** | React Router | `^8.4.0` | Điều hướng trang phía client với lazy loading và Suspense. |
| **Frontend HTTP** | Axios | `^1.20.0` | Client gọi REST API với interceptors tự động refresh token và đính kèm Bearer token. |
| **Frontend Forms** | React Hook Form + Zod | `^7.90.0` / `^4.6.7` | Quản lý form hiệu năng cao và validate dữ liệu bằng Zod Schema. |
| **Frontend Maps** | Leaflet | `^1.9.4` | Bản đồ tương tác hiển thị vị trí quán chay và bán kính quét. |
| **Backend Runtime** | Node.js | `>= 22.22.0` | Môi trường thực thi JavaScript phía máy chủ sử dụng ES Modules (`"type": "module"`). |
| **Backend Framework**| Express.js | `^5.2.1` | Framework xây dựng RESTful API phân tầng. |
| **Database ORM** | Prisma | `^6.19.3` | ORM quản trị schema, migration và thao tác truy vấn cơ sở dữ liệu PostgreSQL. |
| **Database Engine** | PostgreSQL | `>= 15.0` | Hệ quản trị cơ sở dữ liệu quan hệ lưu trữ dữ liệu nghiệp vụ. |
| **Backend Validation**| Zod | `^4.6.5` | Validate request body, query params, URL route params và biến môi trường. |
| **Backend Logging** | Pino & Pino-HTTP | `10.4.0` / `^11.0.0` | Hệ thống ghi log có cấu trúc hiệu năng cao. |
| **Backend Auth** | jsonwebtoken & bcryptjs | `^9.0.3` / `^3.0.3` | Tạo/giải mã JWT Access Token/Refresh Token và băm mật khẩu bảo mật. |
| **Backend Security** | Helmet & express-rate-limit | `^8.3.0` / `^8.7.1` | Bảo vệ HTTP headers và hạn chế tần suất request chống brute-force/DDoS. |
| **Backend Utilities** | Nodemailer & Multer | `^10.3.1` / `^2.4.0` | Gửi email khôi phục mật khẩu qua SMTP và xử lý upload file ảnh local. |
| **AI Framework** | Python & FastAPI | `>= 3.11, < 3.15` / `0.159.1` | Ngôn ngữ và Web framework hiệu năng cao cho AI Microservice. |
| **AI Server Engine** | Uvicorn | `0.54.0` | ASGI Server chạy ứng dụng FastAPI. |
| **AI Data Validation**| Pydantic v2 & Settings | `2.14.1` / `2.16.1` | Khai báo schema request/response với `CamelModel` và quản lý cấu hình. |
| **AI Orchestration** | LangChain | `1.4.7` | Điều phối prompt, context và tích hợp mô hình ngôn ngữ lớn (LLM). |
| **LLM Provider** | DeepSeek API | `deepseek-chat` | Mô hình ngôn ngữ xử lý tư vấn, lập thực đơn, quét món và tóm tắt video. |
| **YouTube Captions** | youtube-transcript-api | `1.2.4` | Trích xuất phụ đề tiếng Việt có sẵn từ video YouTube. |
| **Testing** | Vitest, Supertest, Pytest | Vitest `5.0.3`, Pytest `9.1.1` | Framework kiểm thử tự động cho cả 3 phân hệ. |

---

## 4. Kiến trúc hệ thống & Luồng giao tiếp (System Architecture)

Dự án áp dụng mô hình **Microservices kết hợp AI Gateway Pattern**:

1. **Frontend (`client/`):** Ứng dụng Single Page Application (SPA) tương tác với người dùng, kết nối tới Backend thông qua một điểm tập trung `/api`.
2. **Backend Gateway (`server/`):** Đóng vai trò kiểm soát lưu lượng duy nhất. Thực hiện xác thực JWT, phân quyền RBAC, kiểm tra hạn ngạch khách (Guest Quota), ghi log AI (`ai_logs`), điều phối các tác vụ nền qua Worker và tương tác trực tiếp với PostgreSQL.
3. **AI Microservice (`ai_service/`):** Dịch vụ tính toán phi trạng thái (Stateless). **Tuyệt đối không kết nối trực tiếp vào PostgreSQL**. Chỉ nhận yêu cầu đã được xác thực từ Backend qua header `X-Internal-Api-Key`.
4. **Cơ sở dữ liệu (PostgreSQL):** Lưu trữ toàn bộ dữ liệu nghiệp vụ, hồ sơ sức khỏe, nhật ký dinh dưỡng, quán ăn và hàng đợi job.

```mermaid
flowchart TD
    subgraph ClientLayer ["1. Frontend Web App (client/ - Port 5173)"]
        UI["React 19 SPA + React-Bootstrap"]
        Axios["Axios Interceptor (apiClient.js)<br/>Auto Refresh Token & Error Normalization"]
        UI --> Axios
    end

    subgraph BackendLayer ["2. Backend Core / AI Gateway (server/ - Port 5000)"]
        Gateway["Express 5 REST API Gateway"]
        AuthMiddleware["Auth & RBAC Middleware<br/>JWT Access/Refresh + tokenVersion"]
        WorkerModeration["Content Moderation Worker"]
        WorkerVideo["Video Recipe Worker"]
        Gateway --> AuthMiddleware
        Gateway -.-> WorkerModeration
        Gateway -.-> WorkerVideo
    end

    subgraph AILayer ["3. AI Microservice (ai_service/ - Port 8000)"]
        FastAPI["FastAPI 0.159 (Stateless Engine)<br/>Header: X-Internal-Api-Key"]
        Agents["Chatbot, MealPlanner, FoodScanner,<br/>VideoRecipe, ContentModeration"]
        FastAPI --> Agents
    end

    subgraph ExternalLayer ["4. Hạ tầng & Dịch vụ Bên ngoài"]
        DB[("PostgreSQL 15+<br/>(vegetarian_db)")]
        LLM["DeepSeek LLM API<br/>(deepseek-chat)"]
        ZIOMAP["ZIOMAP Places API"]
        SMTP["SMTP Mail Provider"]
        YT["YouTube Video Captions"]
    end

    Axios -- "HTTP REST / Bearer Token / SSE" --> Gateway
    Gateway -- "Prisma Client 6 (ACID Pool)" --> DB
    WorkerModeration -- "Job Lease & Update" --> DB
    WorkerVideo -- "Job Lease & Update" --> DB
    Gateway -- "Internal HTTP + X-Internal-Api-Key" --> FastAPI
    WorkerModeration -- "Internal HTTP Check" --> FastAPI
    WorkerVideo -- "Internal HTTP Transcribe/Summarize" --> FastAPI
    FastAPI -- "Streaming Completion / JSON" --> LLM
    Gateway -- "Place Search & Photos" --> ZIOMAP
    Gateway -- "Password Reset Mails" --> SMTP
    FastAPI -- "Vietnamese Captions" --> YT
```

---

## 5. Cấu trúc thư mục Monorepo (Project Structure)

```text
SWP391/
├── client/                     # Phân hệ Frontend (React 19 + Vite + React-Bootstrap)
│   ├── src/
│   │   ├── assets/             # Hình ảnh tĩnh và SCSS/CSS tùy biến giao diện
│   │   ├── components/         # Component dùng chung (common/, layout/)
│   │   ├── constants/          # Hằng số hiển thị, phân loại chế độ ăn, nhãn quán
│   │   ├── context/            # Quản lý state toàn cục (DatabaseProvider, databaseContext)
│   │   ├── features/           # Các module nghiệp vụ phân rã độc lập (<250 dòng)
│   │   ├── hooks/              # Custom hooks (useDatabase, useAuth, useDebounce...)
│   │   ├── pages/              # Trang theo từng tuyến đường (bao gồm auth/ và admin/)
│   │   ├── routes/             # Cấu hình AppRoutes (React Router 8, lazy, Suspense)
│   │   ├── services/           # Tầng gọi API Backend qua Axios singleton
│   │   └── utils/              # Quản lý session, định dạng tiền tệ, ngày giờ UTC
│   ├── test/                   # Kiểm thử logic frontend bằng Node Test Runner & Vitest
│   ├── package.json
│   ├── vite.config.js
│   └── README.md               # Tài liệu chi tiết Frontend
│
├── server/                     # Phân hệ Backend (Node.js + Express 5 + Prisma 6)
│   ├── prisma/
│   │   ├── schema.prisma       # Định nghĩa toàn bộ Data Models & ánh xạ quan hệ
│   │   ├── migrations/         # Lịch sử các bản migration cơ sở dữ liệu
│   │   ├── seed.js             # Script nạp dữ liệu khởi tạo
│   │   └── seed.sql            # Dữ liệu hạt giống SQL mẫu
│   ├── scripts/                # Scripts bảo trì dữ liệu, import ảnh nguyên liệu, đồng bộ
│   ├── src/
│   │   ├── config/             # Cấu hình môi trường (Zod env), Prisma singleton, logger
│   │   ├── constants/          # Hằng số HTTP status, roles, trạng thái tài khoản
│   │   ├── controllers/        # Tiếp nhận HTTP request, gọi service, trả response chuẩn
│   │   ├── middlewares/        # Xác thực JWT, RBAC, Zod validation, error handler, rate limit
│   │   ├── repositories/       # Nơi duy nhất gọi Prisma Client thao tác với Database
│   │   ├── routes/             # Định tuyến RESTful API (/api/v1/... và backward routes)
│   │   ├── services/           # Logic nghiệp vụ lõi, điều phối transaction, gọi AI Service
│   │   ├── utils/              # Tiện ích API response, JWT, phân tích SSE, lỗi chuẩn hóa
│   │   ├── validators/         # Toàn bộ Zod Schema kiểm thực dữ liệu đầu vào
│   │   ├── workers/            # Worker chạy nền (kiểm duyệt văn bản, tóm tắt video)
│   │   ├── app.js              # Cấu hình Express, middleware toàn cục
│   │   └── server.js           # Entry point khởi động HTTP server và graceful shutdown
│   ├── tests/                  # Bộ kiểm thử Vitest + Supertest trên DB test riêng
│   ├── package.json
│   └── README.md               # Tài liệu chi tiết Backend
│
├── ai_service/                 # Phân hệ AI Microservice (Python 3.11+ + FastAPI + Pydantic v2)
│   ├── agents/                 # Logic Agent xử lý prompt (Chatbot, MealPlanner, Vision)
│   ├── api/                    # APIRouters xử lý các endpoint nghiệp vụ
│   ├── core/                   # Cấu hình DeepSeek LLM, bảo mật X-Internal-Api-Key, rate limit
│   ├── prompts/                # Thư viện prompt kỹ thuật hệ thống (Markdown format)
│   ├── schemas/                # Pydantic v2 models kế thừa CamelModel (request/response)
│   ├── services/               # Xử lý phụ đề video, trích xuất dữ liệu, tiền/hậu xử lý
│   ├── tests/                  # Bộ kiểm thử Pytest tự động
│   ├── main.py                 # Entry point khởi tạo ứng dụng FastAPI và lifespan
│   ├── requirements.txt        # Danh mục dependencies cố định phiên bản
│   └── README.md               # Tài liệu chi tiết AI Service
│
├── docs/                       # Tài liệu kiến trúc dự án, OpenAPI specs, sơ đồ ERD
├── AGENTS.md                   # Bộ nguyên tắc và quy chuẩn kỹ thuật toàn dự án
└── README.md                   # Tài liệu tổng quan toàn bộ dự án (File này)
```

---

## 6. Điều hướng tài liệu kỹ thuật chi tiết (Documentation Navigation)

Để tìm hiểu sâu hơn về kiến trúc kỹ thuật, chi tiết API và hướng dẫn phát triển của từng phân hệ, vui lòng tham khảo các tài liệu chuyên sâu:

- 🎨 **Tài liệu Frontend:** Xem chi tiết tại [`client/README.md`](./client/README.md)
  - *Bao gồm: Kiến trúc Component, Quản lý State toàn cục & Session, Axios Interceptors, Quy chuẩn 4 trạng thái UI, Hướng dẫn kiểm thử giao diện.*
- ⚙️ **Tài liệu Backend:** Xem chi tiết tại [`server/README.md`](./server/README.md)
  - *Bao gồm: Kiến trúc phân tầng (Controller-Service-Repository), Vòng đời Request, Bảng đối chiếu API đầy đủ, Mô hình Prisma Database, Worker chạy nền, Cơ chế Token Versioning.*
- 🧠 **Tài liệu AI Service:** Xem chi tiết tại [`ai_service/README.md`](./ai_service/README.md)
  - *Bao gồm: FastAPI Lifespan, Pydantic v2 CamelModel, Cấu trúc Prompt Engineering, Luồng Streaming SSE, Quy trình xử lý ảnh và phụ đề YouTube.*
- 🥬 **Tra cứu nguyên liệu bằng AI:** Hợp đồng API [`docs/ingredient-lookup-openapi.json`](./docs/ingredient-lookup-openapi.json)
  - *Bao gồm: Job tra cứu, quota khách, dinh dưỡng /100 g do AI ước lượng và quy tắc không ghi đè số liệu sẵn có.*

---

## 7. Yêu cầu hệ thống môi trường local (Prerequisites)

Dự án hiện tại chạy **100% trong môi trường máy local**, chưa áp dụng Docker hay Cloud:

- **Node.js:** `>= 22.22.0` (Do `react-router` 8.4.0 yêu cầu tối thiểu Node 22.22.0; Vite 8 yêu cầu `^20.19.0 || >=22.12.0`).
- **npm:** `>= 10.x`
- **Python:** `>= 3.11, < 3.15` (Khuyến nghị Python 3.11 hoặc 3.12).
- **PostgreSQL:** `>= 15.x` (Đang chạy dịch vụ local tại cổng mặc định `5432`).
- **Hệ điều hành:** Khuyến nghị Windows 10/11 (sử dụng PowerShell). Tương thích hoàn toàn với macOS và Linux.

---

## 8. Hướng dẫn cài đặt & Khởi động từng bước (Installation & Setup)

Mở **4 cửa sổ Terminal riêng biệt** tại thư mục gốc repository (`SWP391/`) và thực hiện tuần tự:

### Bước 1: Khởi tạo Cơ sở dữ liệu PostgreSQL
Mở terminal công cụ `psql` hoặc ứng dụng pgAdmin:
```sql
CREATE DATABASE vegetarian_db;
CREATE DATABASE vegetarian_db_test;
```
> **Giải thích:** `vegetarian_db` dùng cho quá trình phát triển (development); `vegetarian_db_test` là cơ sở dữ liệu độc lập dùng để chạy kiểm thử tự động, tuyệt đối không dùng chung để tránh mất dữ liệu.

### Bước 2: Cài đặt và cấu hình AI Microservice (Terminal 1)
```powershell
# Di chuyển vào thư mục AI Service
cd ai_service

# Tạo và kích hoạt môi trường ảo Python
python -m venv venv
.\venv\Scripts\Activate.ps1

# Cài đặt các thư viện phụ thuộc chính xác phiên bản
pip install -r requirements.txt

# Khởi tạo file cấu hình môi trường
if (!(Test-Path .env)) { Copy-Item .env.example .env }

# Khởi chạy dịch vụ AI tại Port 8000
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
> **Kết quả mong đợi:** Terminal hiển thị `Application startup complete.` và dịch vụ chạy tại `http://127.0.0.1:8000`. Truy cập Swagger Docs tại `http://127.0.0.1:8000/docs`.

### Bước 3: Cài đặt và cấu hình Backend Server (Terminal 2)
```powershell
# Di chuyển vào thư mục Backend
cd server

# Cài đặt dependencies chuẩn xác theo lockfile
npm ci --include=optional

# Khởi tạo file cấu hình môi trường
if (!(Test-Path .env)) { Copy-Item .env.example .env }

# Chạy tạo mã nguồn Prisma Client và triển khai migration
npm run prisma:generate
npx prisma migrate deploy

# Khởi động Backend server ở chế độ giám sát tự tải lại (Port 5000)
npm run dev
```
> **Kết quả mong đợi:** Terminal hiển thị `Server is running on port 5000` và `Connected to PostgreSQL database`. Kiểm tra sức khỏe tại `http://localhost:5000/health` trả về `{"status":"UP"}`.

### Bước 4: Cài đặt và cấu hình Frontend Web App (Terminal 3)
```powershell
# Di chuyển vào thư mục Frontend
cd client

# Cài đặt dependencies chuẩn xác theo lockfile
npm ci --include=optional

# Khởi tạo file cấu hình môi trường
if (!(Test-Path .env)) { Copy-Item .env.example .env }

# Khởi động máy chủ phát triển Vite (Port 5173)
npm run dev
```
> **Kết quả mong đợi:** Terminal hiển thị `VITE v8.x.x ready in ... ms` với địa chỉ `http://localhost:5173`. Mở trình duyệt và truy cập vào trang web Chay Xanh.

---

## 9. Tổng quan biến môi trường (Environment Variables Overview)

Hệ thống phân tách cấu hình độc lập cho từng dịch vụ:

### Bảng tóm tắt biến môi trường:

| Service | Biến quan trọng | Bắt buộc | Mục đích & Lưu ý |
| :--- | :--- | :---: | :--- |
| **Backend** | `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL: `postgresql://user:pass@localhost:5432/vegetarian_db`. |
| **Backend** | `PORT` | Không | Cổng chạy server (mặc định `5000`). |
| **Backend** | `JWT_SECRET` | Có | Khóa bí mật ký mã hóa JWT Access Token (chuỗi ngẫu nhiên dài). |
| **Backend** | `INTERNAL_API_KEY` | Có | Khóa bảo mật nội bộ giao tiếp với AI (phải trùng với `ai_service/.env`). |
| **Backend** | `AI_SERVICE_URL` | Có | Địa chỉ nội bộ gọi sang AI Microservice (`http://127.0.0.1:8000`). |
| **Backend** | `CONTENT_MODERATION_ENABLED` | Không | Bật (`true`) / Tắt (`false`) tính năng quét kiểm duyệt bài viết tự động. |
| **Backend** | `ZIOMAP_API_KEY` | Tùy chọn| Khóa gọi API bản đồ và giải mã ảnh quán chay ZIOMAP. |
| **Backend** | `SMTP_*` | Tùy chọn| Cấu hình máy chủ gửi email khôi phục mật khẩu (Host, Port, User, Pass). |
| **AI Service**| `INTERNAL_API_KEY` | Có | Khóa đối chiếu từ Backend truyền qua header `X-Internal-Api-Key`. |
| **AI Service**| `DEEPSEEK_API_KEY` | Có | Khóa kết nối API DeepSeek LLM Engine phục vụ suy luận AI. |
| **AI Service**| `DEEPSEEK_MODEL` | Không | Tên mô hình ngôn ngữ mặc định (`deepseek-chat`). |
| **Frontend** | `VITE_API_URL` | Không | Tiền tố gọi API phía client (mặc định `/api`, được Vite proxy về cổng 5000). |

*Chi tiết toàn bộ biến môi trường xem tại:* [`server/README.md`](./server/README.md#19-bảng-biến-môi-trường-environment-variables) và [`ai_service/README.md`](./ai_service/README.md#12-bảng-biến-môi-trường-environment-variables).

---

## 10. Tổng quan cơ sở dữ liệu (Database Overview)

Cơ sở dữ liệu của dự án sử dụng **PostgreSQL** kết hợp **Prisma ORM**, đảm bảo tính toàn vẹn dữ liệu (ACID) và quy chuẩn tên gọi xuyên suốt:

### Các thực thể cốt lõi (Core Entities):
- **Người dùng & Xác thực:** `User` (bảng `users`), `PasswordResetToken` (`password_reset_tokens`), `HealthProfile` (`health_profiles`), `HealthHistory` (`health_histories`), `UserAllergy` (`user_allergies`).
- **Nội dung & Cộng đồng:** `Post` (`posts`), `Blog` (`blogs`), `Video` (`videos`), `Comment` (`comments`), `PostVote` (`post_votes`), `PostAttachment` (`post_attachments`), `Category` (`categories`).
- **Dinh dưỡng & Ẩm thực:** `Recipe` (`recipes`), `Ingredient` (`ingredients`), `LiquidIngredientDensity` (`liquid_ingredient_densities`), `MealPlan` (`meal_plans`), `FoodDiary` (`food_diaries`).
- **Địa điểm & Nhà hàng:** `Restaurant` (`restaurants`), `RestaurantRecipe` (`restaurant_recipes`), `RestaurantReview` (`restaurant_reviews`).
- **Hệ thống AI & Kiểm duyệt:** `AiGeneration` (`ai_generations`), `AiLog` (`ai_logs`), `ContentModerationJob` (`content_moderation_jobs`), `VideoRecipeSummaryJob` (`video_recipe_summary_jobs`), `GuestQuota` (`guest_quotas`).
- **Quản trị & Pháp lý:** `LegalDocument` (`legal_documents`), `Report` (`reports`), `Notification` (`notifications`).

### Quy tắc quan trọng về Migration & Seed:
- Khởi tạo bảng bằng lệnh: `npx prisma migrate deploy` (cho database môi trường phát triển).
- Tuyệt đối **không tự ý chạy `prisma db push`** trên cơ sở dữ liệu có dữ liệu cần bảo toàn.
- Lệnh nạp seed `npm run db:seed` sẽ triển khai migration và nạp script `prisma/seed.sql` (chỉ dùng cho môi trường khởi tạo ban đầu do có thao tác reset bảng).

---

## 11. Tổng quan xác thực & Phân quyền (Authentication & Authorization)

Hệ thống bảo vệ tài nguyên theo mô hình **RBAC (Role-Based Access Control)** kết hợp **Stateful Token Revocation**:

1. **Đăng nhập & Cấp phát Token:**
   - Khi đăng nhập thành công, máy chủ trả về **Access Token** (hạn 7 ngày) qua JSON và ghi nhận **Refresh Token** (hạn 30 ngày) vào `httpOnly` Secure Cookie.
2. **Cơ chế Token Versioning (`tokenVersion`):**
   - Model `User` lưu trữ trường `token_version`. Khi người dùng thực hiện đổi mật khẩu hoặc đặt lại mật khẩu, giá trị này sẽ tự động tăng lên (+1). Mọi Access Token và Refresh Token cũ lập tức bị vô hiệu hóa trên toàn hệ thống.
3. **Phân quyền người dùng (Roles):**
   - `ADMIN` (`Role 1`): Toàn quyền truy cập Cổng Quản trị (`/admin`), duyệt bài, xem logs hệ thống, quản lý tài khoản thành viên, cấu hình pháp lý.
   - `USER` (`Role 2`): Thành viên chính thức; quyền tạo bài viết, lưu nhật ký dinh dưỡng, lập thực đơn không giới hạn.
   - `GUEST`: Khách vãng lai chưa đăng nhập; chỉ được trải nghiệm tối đa 3 lượt gọi AI mỗi ngày (theo dõi qua `guest_quotas`).

---

## 12. Vận hành toàn bộ hệ thống (Running the Entire Project)

Để hệ thống hoạt động đầy đủ mọi tính năng (bao gồm cả các Worker xử lý tác vụ nền):

| Thứ tự | Dịch vụ | Thư mục thực thi | Lệnh khởi chạy (Windows PowerShell) | Cổng truy cập |
| :---: | :--- | :--- | :--- | :---: |
| **1** | PostgreSQL DB | Local Service | Chạy nền dịch vụ Windows Service | `5432` |
| **2** | AI Microservice | `ai_service/` | `.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload` | `8000` |
| **3** | Backend Gateway | `server/` | `npm run dev` *(Tự động chạy Worker Video & Moderation kèm theo)* | `5000` |
| **4** | Frontend Client | `client/` | `npm run dev` | `5173` |

> *Ghi chú cho Linux / macOS:* Tại bước 2, thay thế lệnh bằng `./venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload`.

---

## 13. Danh mục Scripts thực tế

### Backend (`server/package.json`)
- `npm run dev`: Khởi động Express Server chế độ dev kèm nodemon và workers tích hợp.
- `npm start`: Khởi động Express Server ở chế độ production.
- `npm test`: Chạy toàn bộ 59 test file (515 test) tự động với Vitest trên database test riêng (`_test`).
- `npm run test:prepare`: Chuẩn bị cơ sở dữ liệu test (áp dụng migration và seed dữ liệu chuẩn).
- `npm run test:content-moderation`: Kiểm thử chuyên sâu luồng kiểm duyệt nội dung tự động.
- `npm run test:video-recipes`: Kiểm thử pipeline trích xuất công thức từ video YouTube.
- `npm run test:database`: Kiểm thử tích hợp truy vấn cơ sở dữ liệu (`tests/workspace.integration.mjs`).
- `npm run test:ai-internal-auth`: Kiểm thử xác thực bảo mật nội bộ HTTP Backend ↔ FastAPI.
- `npm run test:real-images`: Kiểm tra tính hợp lệ và phản hồi của kho ảnh cục bộ đã lưu trữ.
- `npm run prisma:migrate`: Sinh bản migration mới khi thay đổi schema (`--name <ten_thay_doi>`).
- `npm run prisma:generate`: Tái tạo mã nguồn Prisma Client.
- `npm run prisma:studio`: Mở giao diện trực quan quản lý dữ liệu Prisma Studio.
- `npm run db:seed`: Nạp dữ liệu hạt giống hệ thống từ `prisma/seed.sql`.
- `npm run db:backfill-ingredient-nutrition`: Gọi AI điền dinh dưỡng /100 g cho nguyên liệu từ điển còn thiếu (chỉ ghi ô trống; thêm `-- --dry-run` để xem trước).

### Frontend (`client/package.json`)
- `npm run dev`: Khởi chạy Vite Development Server tại cổng 5173.
- `npm run build`: Đóng gói ứng dụng thành phẩm (Production bundle ra thư mục `dist/`).
- `npm run preview`: Chạy thử bản đóng gói production trên môi trường local.
- `npm test`: Chạy kiểm thử logic và tiện ích bằng Node.js Test Runner.
- `npm run test:ui`: Chạy kiểm thử thành phần giao diện người dùng với Vitest và React Testing Library.
- `npm run lint`: Quét và kiểm tra lỗi cú pháp bằng ESLint.

### AI Microservice (`ai_service/`)
- `pytest`: Chạy toàn bộ 306 bài test tự động bao phủ chatbot, meal planner, scanner và rate limiting.
- `ruff check .`: Quét và định dạng mã nguồn Python theo chuẩn PEP 8.

---

## 14. Tổng hợp chiến lược kiểm thử (Testing Overview)

Hệ thống sở hữu **1.188 bài test tự động** (server 515, AI 322, client 351) bao phủ toàn bộ các tầng:

```powershell
# 1. Kiểm thử Backend trên cơ sở dữ liệu riêng (server/)
cd server
npm run test:prepare
npm test

# 2. Kiểm thử Frontend (client/)
cd ../client
npm test
npm run test:ui

# 3. Kiểm thử AI Microservice (ai_service/)
cd ../ai_service
.\venv\Scripts\python.exe -m pytest -q
```

> **Nguyên tắc bất khả xâm phạm:** Kiểm thử Backend bắt buộc trỏ vào database có hậu tố `_test` trong file `.env.test`. Tuyệt đối không chạy kiểm thử trên cơ sở dữ liệu phát triển.

---

## 15. Quy chuẩn mã nguồn & Quy ước Git

- **Clean Code:**
  - Component React $\le 250$ dòng; hàm nghiệp vụ $\le 30$ dòng; tham số $\le 3$.
  - Xử lý đủ 4 trạng thái giao diện: `loading`, `error`, `empty`, `success`.
  - **Tuyệt đối cấm dữ liệu giả (No Mock Data)** trong code thực thi.
- **Quy ước đặt tên (FE ↔ BE ↔ AI ↔ DB):**
  - Prisma Model: `PascalCase` danh từ số ít (`User`, `Post`).
  - Bảng Database: `snake_case` danh từ số nhiều qua `@@map("users")`.
  - Cột Database: `snake_case` qua `@map("created_at")`.
  - Request/Response JSON: Bắt buộc `camelCase` (`userId`, `createdAt`).
- **Quy ước Commit:** Chuẩn Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).

---

## 16. Xử lý sự cố thường gặp (Troubleshooting)

1. **Lỗi `P1001: Can't reach database server at localhost:5432`:**
   - *Nguyên nhân:* Dịch vụ PostgreSQL chưa khởi động hoặc sai mật khẩu trong `DATABASE_URL`.
   - *Khắc phục:* Mở `services.msc` trên Windows, kiểm tra dịch vụ PostgreSQL đang ở trạng thái `Running`. Kiểm tra lại user/password trong `server/.env`.
2. **Lỗi `401 Unauthorized` khi Backend gọi AI Service:**
   - *Nguyên nhân:* Giá trị `INTERNAL_API_KEY` trong `server/.env` không khớp với `ai_service/.env`.
   - *Khắc phục:* Mở cả 2 file `.env` và sao chép cùng một chuỗi khóa bí mật (dài $\ge 32$ ký tự ngẫu nhiên).
3. **Lỗi `403 Forbidden` khi truy cập Cổng Quản trị (`/admin`):**
   - *Nguyên nhân:* Tài khoản hiện tại có `role = 2` (Member) thay vì `role = 1` (Admin).
   - *Khắc phục:* Đăng nhập bằng tài khoản Quản trị viên được cấp quyền trong database.
4. **Lỗi `VIDEO_CAPTIONS_UNAVAILABLE` khi trích xuất công thức YouTube:**
   - *Nguyên nhân:* Video YouTube không có phụ đề tiếng Việt (bản thủ công hoặc tự động).
   - *Khắc phục:* Hệ thống chỉ hỗ trợ video nấu ăn tiếng Việt có phụ đề sẵn có. Hãy chọn video khác có phụ đề tiếng Việt.
5. **Worker kiểm duyệt hoặc Video không tự động chạy:**
   - *Nguyên nhân:* Chưa bật cờ `CONTENT_MODERATION_ENABLED=true` trong `server/.env` hoặc sai đường dẫn `YT_DLP_PATH`.
   - *Khắc phục:* Kiểm tra cấu hình và khởi động lại Backend API.

---

## 17. Thành viên phát triển & Bản quyền (Contributors & License)

- **Đơn vị thực hiện:** Nhóm sinh viên Kỹ thuật Phần mềm - Khóa SE, Trường Đại học FPT (FPT University).
- **Môn học:** SWP391 - Software Development Project.
- **Bản quyền & Giấy phép:** Dự án phục vụ mục đích nghiên cứu, học thuật và phát triển kỹ năng kỹ thuật phần mềm. Giấy phép mã nguồn nội bộ: ISC License.
