# Frontend Web Application - Chay Xanh (SWP391)

Ứng dụng web giao diện người dùng (Single Page Application - SPA) cho dự án **SWP391 - Vegetarian & Healthy Platform (Chay Xanh)**, được xây dựng trên nền tảng **React 19**, **Vite**, **Bootstrap 5** và **React Router 8**.

---

## 🌟 Tính năng chính

- **Trang chủ (Home):** Giới thiệu sứ mệnh sống khỏe, chế độ ăn chay, món ăn nổi bật và cẩm nang dinh dưỡng.
- **Khám phá món chay (Recipes):** Tìm kiếm món ăn thông minh (không phân biệt dấu tiếng Việt), lọc đa tầng theo danh mục và chế độ ăn (Thuần chay / Vegan, Chay có sữa / Lacto, Chay có trứng / Ovo, v.v.).
- **Cộng đồng Chay Xanh (Community):**
  - Đăng bài viết chia sẻ kinh nghiệm, nhật ký ăn chay kèm hình ảnh và video.
  - Bình luận, trao đổi và bình chọn (Upvote / Downvote) bài viết.
- **Trợ lý dinh dưỡng AI (AI ChatBox):** Hộp thoại tư vấn thực đơn chay, giải đáp thắc mắc dinh dưỡng và nguyên liệu thay thế.
- **Xác thực tài khoản (Authentication):** Đăng ký và đăng nhập bảo mật, lưu trữ thông tin phiên làm việc.
- **Cá nhân hóa chế độ ăn (Diet Selection):** Cho phép người dùng lựa chọn và lưu trữ mục tiêu ăn chay cá nhân trên trình duyệt.

---

## 📁 Cấu trúc thư mục

```text
client/
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
├── docs/
│   └── srcStructure.md        # Quy tắc thư mục và bảng đối chiếu đường dẫn
├── test/                     # Kiểm thử API, session và tiện ích frontend
└── src/
    ├── assets/
    │   ├── images/           # Ảnh tĩnh
    │   └── styles/           # Style toàn cục và dùng chung
    ├── components/
    │   ├── common/           # Dialog, media, trạng thái, ErrorBoundary
    │   └── layout/           # SiteLayout, Header, Footer
    ├── constants/            # Hằng số phân loại chế độ ăn và nhà hàng
    ├── context/              # DatabaseContext, DatabaseProvider
    ├── features/             # Component, hook, style, util theo nghiệp vụ
    │   ├── admin/
    │   ├── auth/
    │   ├── chat/
    │   ├── community/
    │   ├── diet/
    │   ├── foodScanner/
    │   ├── foodSwap/
    │   ├── home/
    │   ├── ingredients/
    │   ├── journal/
    │   ├── mealPlan/
    │   ├── profile/
    │   └── restaurants/
    ├── hooks/                # useDatabase và custom hook dùng chung
    ├── pages/                # Trang theo route; nhóm auth/ và admin/
    ├── routes/               # AppRoutes (lazy + Suspense), RouteAccessibility
    ├── services/             # API backend, AI streaming, API quản trị
    ├── utils/                # Session, sự kiện, định dạng và hàm tiện ích
    ├── App.jsx               # ErrorBoundary và AppRoutes
    └── main.jsx              # Khởi tạo React, Router, Provider và global CSS
```

Chi tiết trách nhiệm từng thư mục và đường dẫn di chuyển: [Cấu trúc src](docs/srcStructure.md).

---

## 🛠️ Công nghệ sử dụng

- **Core:** [React 19](https://react.dev/), [React DOM](https://react.dev/)
- **Build Tool:** [Vite 8](https://vitejs.dev/) (HMR cực nhanh, tối ưu hóa bundle)
- **UI & Styling:** [Bootstrap 5](https://getbootstrap.com/), [Bootstrap Icons](https://icons.getbootstrap.com/)
- **Routing:** [React Router 8](https://reactrouter.com/)
- **Testing:** Node.js Native Test Runner (`node --test`)
- **Linting:** ESLint 10

---

## 🚀 Hướng dẫn khởi chạy

### 1. Cài đặt dependencies:
```bash
npm install
```

### 2. Chạy môi trường phát triển (Development):
```bash
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:5173`

### 3. Chạy kiểm thử tự động (Unit Tests):
```bash
npm test
```
*Hiện tại hệ thống bao gồm 50 bài kiểm thử cho logic phiên đăng nhập, phân tích thành phần nhãn, nhật ký calo theo ngày/tuần, đính kèm media, chỉ đường và bộ lọc món ăn không dấu.*

### 4. Build sản phẩm (Production):
```bash
npm run build
```
Kết quả build được lưu tại thư mục `dist/`.

### 5. Xem trước bản build:
```bash
npm run preview
```
