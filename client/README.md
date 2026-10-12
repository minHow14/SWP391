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
├── index.html                 # Entry HTML template
├── package.json               # Cấu hình dự án, dependencies và scripts
├── vite.config.js             # Cấu hình Vite bundler & React plugin
├── eslint.config.js           # Cấu hình ESLint chuẩn React
├── test/                      # Bộ kiểm thử tự động
│   ├── dietSelection.test.js  # Test logic lưu trữ & khôi phục lựa chọn ăn chay
│   ├── postAttachments.test.js# Test kiểm tra file đính kèm bài viết (ảnh/video)
│   └── recipeFilters.test.js  # Test bộ lọc món ăn và tìm kiếm không dấu
├── src/
│   ├── main.jsx               # Entry point ứng dụng React
│   ├── App.jsx                # Thiết lập routing hệ thống (React Router)
│   ├── App.css                # Style chung của ứng dụng
│   ├── Home.css / Explore.css # Styles cho các trang chuyên biệt
│   │
│   ├── assets/                # Hình ảnh, biểu tượng tĩnh
│   │
│   ├── components/            # Các thành phần giao diện tái sử dụng
│   │   ├── SiteLayout.jsx     # Layout bọc chung (Header + Nội dung + Footer)
│   │   ├── Header.jsx         # Thanh điều hướng (Navbar) & Menu
│   │   ├── Footer.jsx         # Chân trang & Thông tin liên hệ
│   │   ├── HomeMain.jsx       # Nội dung chính trang chủ
│   │   ├── WelcomeModal.jsx   # Modal chào mừng & hướng dẫn chọn chế độ ăn
│   │   ├── ChatBox.jsx        # Hộp thoại chat AI Assistant
│   │   ├── AuthForm.jsx       # Form đăng nhập / đăng ký
│   │   ├── ContentDialog.jsx  # Dialog xem nội dung chi tiết
│   │   ├── ContentImage.jsx   # Hiển thị ảnh nội dung
│   │   └── PostMedia.jsx      # Xử lý media đính kèm bài viết
│   │
│   ├── pages/                 # Các trang giao diện chính
│   │   ├── Home.jsx           # Trang chủ
│   │   ├── Recipes.jsx        # Trang danh mục & công thức món chay
│   │   ├── Community.jsx      # Trang diễn đàn cộng đồng
│   │   ├── Login.jsx          # Trang đăng nhập
│   │   └── Register.jsx       # Trang đăng ký tài khoản
│   │
│   ├── lib/                   # Xử lý logic nghiệp vụ phía frontend
│   │   ├── dietSelection.js   # Quản lý trạng thái & local storage chế độ ăn
│   │   ├── recipeFilters.js   # Logic tìm kiếm không dấu & bộ lọc món chay
│   │   ├── postAttachments.js # Validate định dạng, kích thước ảnh/video tải lên
│   │   ├── modelFields.js     # Định nghĩa các trường dữ liệu
│   │   └── chatReplies.js     # Logic xử lý tin nhắn chat
│   │
│   └── data/                  # Dữ liệu tĩnh dự phòng (Mock data)
│       ├── recipes.js         # Dữ liệu công thức mẫu
│       ├── community.js       # Dữ liệu bài viết mẫu
│       └── homeData.js        # Dữ liệu trang chủ
```

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
*Hiện tại hệ thống bao gồm 15 bài kiểm thử cho logic lọc món ăn, đính kèm media và lưu trữ chế độ ăn.*

### 4. Build sản phẩm (Production):
```bash
npm run build
```
Kết quả build được lưu tại thư mục `dist/`.

### 5. Xem trước bản build:
```bash
npm run preview
```
