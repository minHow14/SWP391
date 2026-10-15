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
├── test/                      # Bộ kiểm thử tự động (7 suites, 30 tests)
│   ├── api.test.js            # Test phiên xác thực in-memory & timeout
│   ├── dietSelection.test.js  # Test logic lưu trữ & khôi phục lựa chọn ăn chay
│   ├── foodScanner.test.js    # Test bộ phân tích thành phần & phát hiện nguyên liệu động vật
│   ├── journal.test.js        # Test tính calo nhật ký & ngày tuần múi giờ Bangkok
│   ├── postAttachments.test.js# Test kiểm tra file đính kèm bài viết (ảnh/video)
│   ├── recipeFilters.test.js  # Test bộ lọc món ăn và tìm kiếm không dấu
│   └── restaurantDirections.test.js # Test chỉ đường bản đồ quán chay
├── src/
│   ├── main.jsx               # Entry point ứng dụng React (DatabaseProvider)
│   ├── App.jsx                # Thiết lập routing hệ thống (React Router 8)
│   ├── App.css                # Style chung của ứng dụng
│   ├── Discovery.css / Explore.css / FoodScanner.css / FoodSwap.css / Home.css / Journal.css / Profile.css / RestaurantDetail.css
│   │
│   ├── assets/                # Hình ảnh, biểu tượng tĩnh
│   │
│   ├── components/            # Các thành phần giao diện tái sử dụng
│   │   ├── SiteLayout.jsx     # Layout bọc chung (Header + Nội dung + Footer + WelcomeModal + ChatBox)
│   │   ├── Header.jsx         # Thanh điều hướng (Navbar) & Menu
│   │   ├── Footer.jsx         # Chân trang & Thông tin liên hệ
│   │   ├── HomeMain.jsx       # Nội dung chính trang chủ
│   │   ├── WelcomeModal.jsx   # Modal chào mừng & hướng dẫn chọn chế độ ăn (Bắt buộc)
│   │   ├── ChatBox.jsx        # Hộp thoại chat AI Assistant
│   │   ├── AuthForm.jsx       # Form đăng nhập / đăng ký
│   │   ├── ContentDialog.jsx  # Dialog xem nội dung chi tiết
│   │   ├── ContentImage.jsx   # Hiển thị ảnh nội dung
│   │   ├── ContentVideo.jsx   # Hiển thị video nội dung
│   │   ├── PostMedia.jsx      # Xử lý media đính kèm bài viết
│   │   └── RestaurantDetail.jsx # Modal chi tiết nhà hàng, thực đơn và đánh giá
│   │
│   ├── pages/                 # Các trang giao diện chính
│   │   ├── Home.jsx           # Trang chủ
│   │   ├── Recipes.jsx        # Trang danh mục & công thức món chay (/cong-thuc)
│   │   ├── Community.jsx      # Trang diễn đàn cộng đồng (/cong-dong)
│   │   ├── FoodScanner.jsx    # Trang kiểm tra món & nhãn thành phần (/kiem-tra-mon)
│   │   ├── FoodSwap.jsx       # Trang chuyển đổi món mặn sang chay (/doi-mon-chay)
│   │   ├── IngredientDictionary.jsx # Trang từ điển nguyên liệu chay (/tu-dien-chay)
│   │   ├── Restaurants.jsx    # Trang bản đồ & danh sách quán chay (/quan-chay)
│   │   ├── Journal.jsx        # Trang nhật ký dinh dưỡng & thực đơn tuần (/nhat-ky)
│   │   ├── Profile.jsx        # Trang hồ sơ sức khỏe & dị ứng cá nhân (/ho-so)
│   │   ├── Login.jsx          # Trang đăng nhập (/dang-nhap)
│   │   └── Register.jsx       # Trang đăng ký tài khoản (/dang-ky)
│   │
│   └── lib/                   # Xử lý logic nghiệp vụ phía frontend
│       ├── api.js             # API Client & quản lý session JWT
│       ├── DatabaseContext.jsx# React Context nạp /api/workspace/catalog
│       ├── databaseContext.js # React Context định nghĩa useDatabase
│       ├── dietSelection.js   # Quản lý trạng thái & local storage chế độ ăn
│       ├── foodScanner.js     # Thuật toán quét nguyên liệu & phụ gia ẩn
│       ├── journal.js         # Thuật toán tính calo, macro, tuần theo lịch Bangkok
│       ├── modelFields.js     # Tiện ích định dạng ngày giờ & ID
│       ├── postAttachments.js # Validate định dạng, kích thước ảnh/video tải lên
│       ├── recipeFilters.js   # Logic tìm kiếm không dấu & bộ lọc đa tầng
│       ├── restaurantDirections.js # Tạo link Google Maps dẫn đường
│       ├── restaurantLabels.js# Nhãn phân loại loại hình nhà hàng chay
│       └── chatReplies.js     # Logic tìm kiếm công thức trả lời chat
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
*Hiện tại hệ thống bao gồm 30 bài kiểm thử cho logic phiên đăng nhập, phân tích thành phần nhãn, nhật ký calo theo ngày/tuần, đính kèm media, chỉ đường và bộ lọc món ăn không dấu.*

### 4. Build sản phẩm (Production):
```bash
npm run build
```
Kết quả build được lưu tại thư mục `dist/`.

### 5. Xem trước bản build:
```bash
npm run preview
```
