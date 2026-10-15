# QUY TẮC FRONT-END (REACT 18 + VITE + REACT-BOOTSTRAP)

## 1. Công nghệ chốt cứng (`client/`)

- **Core:** React 18+ khởi tạo bằng **Vite** (functional components + hooks), React Router v6+, ES Modules.
- **UI Framework:** **React-Bootstrap** (Bootstrap 5). Ưu tiên tuyệt đối dùng các component của `react-bootstrap` (`Container`, `Row`, `Col`, `Button`, `Form`, `Modal`, `Table`, `Alert`, `Spinner`, `Card`...) thống nhất toàn dự án; không trộn lẫn việc viết class Bootstrap HTML thuần rời rạc hay lạm dụng inline style.
- **Form & Validation:** Dùng **React Hook Form** kết hợp **Zod** (`@hookform/resolvers/zod`).
- **HTTP Client:** Dùng **Axios** thông qua một instance duy nhất.
- **Testing:** Vitest + React Testing Library.

## 2. Cấu trúc thư mục & Phân tách trách nhiệm (SRP)

```text
client/src/
├── assets/                   # Ảnh tĩnh, biến SCSS/CSS tuỳ biến theme Bootstrap
├── components/               # common/, layout/ - Chỉ nhận dữ liệu/callback qua props, tái sử dụng được
├── features/                 # (Tuỳ chọn) Gom nhóm theo miền nghiệp vụ
├── pages/                    # Ghép các component theo route; KHÔNG gọi Axios trực tiếp tại đây
├── hooks/                    # Custom hooks quản lý state/side-effect (useAuth, useProducts...)
├── services/                 # Chỉ chứa các hàm gọi API qua Axios instance dùng chung
├── context/                  # State toàn cục (AuthContext, ThemeContext, ToastContext)
├── routes/                   # Cấu hình React Router, ProtectedRoute (RBAC), Lazy loading
├── constants/                # Đường dẫn route, hằng số cấu hình, enum hiển thị
├── utils/                    # Format ngày giờ (UTC -> Local timezone), format tiền tệ
├── App.jsx
└── main.jsx
```

- **Giới hạn kích thước:** Mỗi file chỉ chứa 1 component chính (`PascalCase.jsx`). Nếu file vượt quá **200–250 dòng**, bắt buộc phải tách thành các sub-components hoặc custom hooks.

## 3. Quy tắc Quản lý Trạng thái, API & Hiển thị

- **Bắt buộc đủ 4 trạng thái UI:** Mọi khu vực tải dữ liệu từ API phải xử lý rõ ràng 4 trạng thái:
  1. `loading`: Hiển thị `Spinner` hoặc Skeleton.
  2. `error`: Hiển thị `Alert` hoặc Toast thân thiện (lấy từ `message`/`errorCode` của BE, không in object lỗi thô).
  3. `empty`: Khi mảng dữ liệu rỗng (`data.length === 0`), hiển thị giao diện Empty State rõ ràng kèm nút hành động (nếu có).
  4. `success`: Hiển thị dữ liệu thật từ API.
- **Không dữ liệu giả:** Cấm tạo mảng mock data ("Lorem ipsum", "John Doe") trong component để hiển thị tạm.
- **Axios Interceptor:** Cấu hình tại `src/services/apiClient.js` để tự động đính kèm Access Token, tự động gọi API refresh token khi gặp mã `401`, và chuẩn hóa object lỗi trả về. Thiết lập `withCredentials: true` để làm việc với `httpOnly` cookie.
- **Trải nghiệm & Hiệu năng:**
  - Thiết kế Responsive (mobile-first) bằng hệ thống Grid (`Container`, `Row`, `Col` với `xs`, `md`, `lg`).
  - Đảm bảo Accessibility cơ bản: mọi ô input phải có `Form.Label` (`controlId`), ảnh có `alt`, nút bấm có trạng thái `disabled` kèm `Spinner` nhỏ khi đang submit form.
  - Dùng `React.lazy` và `Suspense` cho các trang ở tầng `routes/`. Bọc toàn ứng dụng trong `ErrorBoundary`.
