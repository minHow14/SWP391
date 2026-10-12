# 📋 BÁO CÁO KIỂM TOÁN VÀ ĐỒNG BỘ TOÀN DIỆN CODEBASE (PROJECT AUDIT REPORT)

> **Dự án:** SWP391 - Chay Xanh (Vegetarian & Healthy Living Platform)  
> **Thời điểm thực hiện:** 12/10/2026  
> **Vai trò:** Senior Full-Stack Developer, Software Architect & QA Engineer  
> **Trạng thái tổng thể:** ✅ ĐÃ KIỂM TRA, SỬA LỖI, ĐỒNG BỘ VÀ XÁC MINH TOÀN DIỆN

---

## A. NHỮNG LỖI VÀ BẤT CẬP ĐÃ PHÁT HIỆN

| Mã lỗi | Mức độ | Phân hệ / File | Mô tả lỗi | Nguyên nhân gốc |
|---|---|---|---|---|
| **BUG-01** | **P1 (High)** | `server/prisma/seed.mjs` & `server/package.json` | Lệnh `npm run db:verify` và `npm run db:seed` thất bại với mã lỗi 1 (`Diet ID 1 differs from frontend constants`, `Verification failed`). | `seed.mjs` kiểm tra cứng chuỗi tên viết thường `Thuần chay` và cố định 6 chế độ ăn; trong khi database thực tế đã nâng cấp lên 7 chế độ ăn (`Thuần Chay (Vegan)`, `Keto Chay`, `Eat Clean Chay`). Hàm verify chỉ lọc theo tiền tố `[Demo]`, không nhận diện dữ liệu chuẩn và tài khoản `@swp391.com`. |
| **BUG-02** | **P2 (Medium)** | `server/prisma/seed.sql` | Kế hoạch bữa ăn thứ 2 (`Thực Đơn Chay Dưỡng Nhan Giảm Mỡ`) có 0 chi tiết bữa ăn (`meal_plan_details`), dẫn đến dữ liệu tuần bị rỗng. | File `seed.sql` chỉ chèn 21 bản ghi chi tiết cho `plan_id = 1`, bỏ sót chi tiết cho `plan_id = 2`. |
| **BUG-03** | **P3 (Low)** | `server/.env.example` | Dòng 11 chứa câu lệnh shell ngẫu nhiên `npm run prisma:generate`, làm sai lệch file mẫu cấu hình môi trường. | Do thao tác copy-paste nhầm lệnh terminal vào cuối file cấu hình. |
| **BUG-04** | **P3 (Low)** | `ai_service/` & `client/` | Thiếu file mẫu môi trường `.env.example`, gây khó khăn cho thành viên mới khi clone dự án và thiết lập môi trường chạy. | Chưa tạo file tài liệu mẫu môi trường tương ứng cho phân hệ AI và Client. |
| **BUG-05** | **P2 (Medium)** | `server/README.md` & `README.md` | Thiếu tài liệu cho toàn bộ nhóm API `/api/workspace` (Catalog, Journal, Weekly Plan, Review), thiếu lệnh `db:website`, `db:verify`, `test:database`. Báo cáo số ca test ở client sai lệch (ghi 15 ca thay vì 30 ca thực tế). | Code phát triển bổ sung tính năng nhưng tài liệu README chưa được đồng bộ cập nhật kịp thời. |
| **BUG-06** | **P2 (Medium)** | `client/src/pages/Profile.jsx` & `server/src/services/auth.service.js` | Trường giới tính nhập tự do có thể tạo dữ liệu không đồng nhất; cần chuẩn hóa giới tính và dropdown lựa chọn. | Nhánh của nhóm đang cải tiến `normalizeGender` nhưng chưa được kiểm thử đồng bộ với API. |

---

## B. NHỮNG THAY ĐỔI ĐÃ THỰC HIỆN

### 1. Tối ưu và Đồng bộ Database Schema, Seed Data & Prisma (Phương án B)
- **Chuẩn hóa thư mục `server/prisma/` về đúng 3 file thiết yếu duy nhất**:
  - `schema.prisma`: Định nghĩa 23 models và quan hệ cơ sở dữ liệu.
  - `seed.sql`: Tập lệnh SQL hợp nhất toàn diện, bao gồm cả 23 bảng Prisma chính và 7 bảng mở rộng (`ingredient_details`, `ingredient_alternatives`, `restaurant_details`, `restaurant_menu_prices`, `diary_nutrients`, `profile_preferences`, `restaurant_reviews`) cùng 42 chi tiết bữa ăn tuần.
  - `seed.js`: Trình thực thi nạp dữ liệu duy nhất, chạy 56 câu lệnh trong transaction 60s, tự động xác thực số lượng bản ghi và kiểm tra mật khẩu bcrypt của các tài khoản chuẩn.
- **Dọn dẹp các file dư thừa đã được hợp nhất**: Đã loại bỏ an toàn các file `SEED.md`, `seed.mjs`, `website-data.mjs`, `website-data.sql`, `fixtures/foodSwaps.mjs`, `fixtures/ingredients.mjs`.
- **Đồng bộ hóa scripts trong `server/package.json`**:
  - Giữ lại các lệnh chuẩn: `"seed": "node prisma/seed.js"`, `"db:seed": "node prisma/seed.js"`.
  - Loại bỏ các script cũ không còn cần thiết (`db:website`, `db:verify`).

### 2. Cấu hình môi trường (Environment Configuration)
- **`server/.env.example`**: Dọn dẹp dòng lệnh rác, giữ nguyên vẹn các biến `NODE_ENV`, `PORT`, `DATABASE_URL`, `CLIENT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`.
- **`ai_service/.env.example`**: Tạo mới file mẫu cấu hình cho phân hệ FastAPI + LangChain (`DB_HOST`, `DB_PORT`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `ALLOWED_ORIGINS`, `GUEST_DAILY_LIMIT`).
- **`client/.env.example`**: Tạo mới file mẫu cấu hình Vite SPA (`VITE_API_URL`).

### 3. Frontend & Backend Code Integrity
- **Giữ nguyên vẹn các thay đổi chưa commit của thành viên trong nhóm**:
  - `client/src/pages/Profile.jsx`: Hàm `normalizeGenderValue` và dropdown `<select name="gender">`.
  - `server/src/services/auth.service.js`: Hàm `normalizeGender` chuẩn hóa Nam/Nữ/Khác và MALE/FEMALE/OTHER.

### 4. Cập nhật và Hoàn thiện Tài liệu (Documentation)
- **`README.md` (Root)**:
  - Cập nhật quy trình nạp seed data: duy nhất `npm run seed` cho toàn bộ dữ liệu hệ thống và catalog.
  - Bổ sung tài khoản mẫu kiểm thử: `admin@swp391.com` / `123456`, `user@swp391.com` / `123456`.
  - Cập nhật bảng kiểm thử tự động (Frontend 30 tests, Backend 21 tests, Database Integration Test).
  - Bổ sung danh mục API `/api/workspace` (Catalog, Mine, Journal, Profile, Diary, Plan, Plan Record, Restaurants, Reviews).
- **`server/README.md`**:
  - Cập nhật cấu trúc thư mục `prisma/` tinh gọn đúng 3 file.
  - Bổ sung `workspace.route.js` vào cây thư mục.
  - Thêm bảng chi tiết 10 endpoints của nhóm `/api/workspace`.
  - Thêm bảng tài khoản demo chuẩn và hướng dẫn chạy các lệnh kiểm thử cơ sở dữ liệu.

---

## C. KẾT QUẢ KIỂM THỬ THỰC TẾ

### 1. Phân hệ Frontend (`client/`)
| Lệnh kiểm thử | Kết quả | Chi tiết |
|---|---|---|
| `npm run build` | ✅ **THÀNH CÔNG** | Vite build production thành công trong ~300ms, không có lỗi import hay cú pháp. Bundle: `dist/index.html`, `dist/assets/index-*.js`, `dist/assets/index-*.css`. |
| `npm run lint` | ✅ **THÀNH CÔNG** | ESLint 10 chạy sạch 0 cảnh báo, 0 lỗi. |
| `npm test` | ✅ **THÀNH CÔNG** | **30/30 tests PASS** (Node.js Test Runner). Đã kiểm thử: in-memory session, envelope workspace, token timeout, diet storage, hidden ingredients scanner, BangKok calendar journal, media upload limits, accent-insensitive recipe search, filter composition. |

### 2. Phân hệ Backend (`server/`)
| Lệnh kiểm thử | Kết quả | Chi tiết |
|---|---|---|
| `npm test` | ✅ **THÀNH CÔNG** | **21/21 tests PASS** (Vitest). Bao gồm 3 tests API Boundary & Zod Validation (`app.test.js`) và 18 tests Places API & Cache & Rate Limiting (`places.test.js`). |
| `npm run test:database` | ✅ **THÀNH CÔNG** | **PASS toàn bộ luồng tích hợp database**: catalog, authentication, community CRUD, comments, votes, private journals, persisted nutrition, ownership protection, weekly plans, restaurant reviews, input validation. |
| `npm run seed` | ✅ **THÀNH CÔNG** | **PASS toàn bộ 56 câu lệnh SQL và tự động xác thực**: Nạp thành công 23 models chính và 7 bảng mở rộng catalog, xác thực khớp mật khẩu bcrypt tài khoản `admin@swp391.com` & `user@swp391.com`. |

### 3. Xác thực Dữ liệu Thực tế (Data Flow Trace)
- **Đăng nhập Admin & User**: Xác minh trực tiếp với database qua bcrypt (`admin@swp391.com`, `user@swp391.com` mật khẩu `123456`) -> Thành công, cấp JWT token và thông tin profile chuẩn xác.
- **Hàm `loadCatalog()`**: Tải thành công 7 chế độ ăn, 10 danh mục, 28 nguyên liệu, 10 công thức món ăn, 14 bài viết cộng đồng và 8 nhà hàng chay kèm giá thực đơn và đánh giá từ PostgreSQL.

---

## D. VIỆC CẦN THỰC HIỆN THỦ CÔNG KHI SETUP MÁY MỚI

Nếu một thành viên trong nhóm clone dự án về máy tính mới, cần thực hiện theo các bước sau:

1. **Chuẩn bị PostgreSQL**:
   - Cài đặt PostgreSQL >= 15.
   - Tạo cơ sở dữ liệu `vegetarian_db`:
     ```sql
     CREATE DATABASE vegetarian_db;
     ```
2. **Cấu hình Backend (`server/`)**:
   - Copy file môi trường:
     ```bash
     cd server
     cp .env.example .env
     ```
   - Chỉnh sửa `DATABASE_URL` trong `.env` cho khớp với mật khẩu PostgreSQL cục bộ.
   - Chạy đồng bộ và nạp dữ liệu:
     ```bash
     npm install
     npm run prisma:generate
     npm run prisma:push
     npm run seed
     npm run dev
     ```
3. **Cấu hình AI Microservice (`ai_service/`)** *(Nếu sử dụng tính năng Chatbot AI)*:
   - Tạo môi trường ảo Python 3.11+:
     ```bash
     cd ai_service
     python -m venv venv
     .\venv\Scripts\Activate.ps1   # Windows
     pip install -r requirements.txt
     cp .env.example .env
     ```
   - Điền API key `DEEPSEEK_API_KEY` trong `ai_service/.env`.
   - Khởi chạy AI service:
     ```bash
     uvicorn main:app --host 0.0.0.0 --port 8000 --reload
     ```
4. **Cấu hình Frontend (`client/`)**:
   - Khởi chạy ứng dụng:
     ```bash
     cd client
     npm install
     npm run dev
     ```
   - Mở trình duyệt tại `http://localhost:5173`. Đăng nhập với tài khoản `admin@swp391.com` hoặc `user@swp391.com` (mật khẩu `123456`).

---

## E. BẢNG TỔNG KẾT TRẠNG THÁI DỰ ÁN

| Phân hệ / Thành phần | Trạng thái | Ghi chú kiểm chứng |
|---|---|---|
| **Frontend Web App (`client/`)** | 🟢 **Hoạt động hoàn hảo** | Build pass, Lint sạch, 30/30 tests pass. Giao diện trang chủ, công thức, cộng đồng, nhật ký, bản đồ quán chay kết nối API đồng bộ. |
| **Backend Core Server (`server/`)** | 🟢 **Hoạt động hoàn hảo** | 21/21 vitest pass, database integration test pass. Layered Architecture, Zod validation, JWT authentication và phân quyền role thực thi ở backend. |
| **Cơ sở dữ liệu (`PostgreSQL` + `Prisma`)** | 🟢 **Hoạt động hoàn hảo** | 23 bảng Prisma chính và 7 bảng mở rộng catalog đã được nạp dữ liệu chuẩn xác, quan hệ khóa ngoại toàn vẹn, 42 chi tiết bữa ăn tuần đầy đủ. |
| **Dữ liệu mẫu (Seed Data)** | 🟢 **Hoạt động hoàn hảo** | Tinh gọn theo **Phương án B** với duy nhất 3 file trong `server/prisma/` (`schema.prisma`, `seed.js`, `seed.sql`), lệnh `npm run seed` duy nhất nạp và tự kiểm chứng dữ liệu, idempotent và bảo mật bcrypt. |
| **Tài liệu & Cấu hình môi trường** | 🟢 **Hoàn thiện & Chính xác** | `.env.example` đầy đủ cả 3 phân hệ; README root, client, server phản ánh chính xác 100% code thực tế. |
| **AI Microservice (`ai_service/`)** | 🟡 **Sẵn sàng mã nguồn** | Code FastAPI + LangChain + Rate Limit đầy đủ; việc chạy kiểm thử tự động tại chỗ bị giới hạn do máy chưa cài môi trường ảo Python venv với pytest. |
