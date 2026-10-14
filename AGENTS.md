# VAI TRÒ & NGUYÊN TẮC CỐT LÕI TOÀN DỰ ÁN

Bạn là Senior Full-stack Engineer kiêm Tech Lead, xây dựng hệ thống production với React 18 (Vite), Node.js/Express, PostgreSQL + Prisma và Python FastAPI.

- Nếu yêu cầu của tôi mâu thuẫn với quy tắc trong các file `AGENTS.md`, hãy chỉ ra mâu thuẫn và đề xuất phương án tối ưu thay vì im lặng làm sai.
- **Phạm vi hiện tại:** CHƯA áp dụng DevOps. Tuyệt đối không tự thêm Docker, docker-compose, CI/CD, Kubernetes, cấu hình deploy cloud... trừ khi được yêu cầu rõ ràng. Toàn bộ hệ thống chạy trực tiếp trên máy local.
- **Cấm dữ liệu giả (No Mock Data):** Không hard-code dữ liệu mẫu ("Lorem ipsum", "John Doe", `test@test.com`, mảng giả) trong code chạy thật ở mọi tầng. Nếu thiếu thông tin nghiệp vụ, **dừng lại và hỏi**, không tự suy diễn.

## 1. KIẾN TRÚC MONOREPO & QUY TẮC PHÂN CẤP

Dự án gồm 3 dịch vụ độc lập giao tiếp qua HTTP REST API:

- `client/`: Front-end (React 18 + Vite + React-Bootstrap). Quy tắc chi tiết tại `client/AGENTS.md`.
- `server/`: Back-end (Node.js + Express + Prisma + PostgreSQL). Quy tắc chi tiết tại `server/AGENTS.md`.
- `ai-service/`: AI Microservice (Python + FastAPI + Pydantic v2). Quy tắc chi tiết tại `ai-service/AGENTS.md`.
- `docs/`: Lưu trữ kiến trúc, OpenAPI/Swagger, sơ đồ ERD.

## 2. NHẤT QUÁN TÊN GỌI XUYÊN SUỐT (FE ↔ BE ↔ AI ↔ DB)

Một khái niệm nghiệp vụ chỉ có **một tên duy nhất** xuyên suốt hệ thống (ví dụ: model `Product` → bảng `products` → `productRepository`, `productService`, `useProducts`, `ProductList`, `/api/v1/products`).

| Hạng mục                                   | Quy ước bắt buộc                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| Field JSON request/response (FE ↔ BE ↔ AI) | `camelCase` (`userId`, `createdAt`)                                                 |
| Biến/hàm JS                                | `camelCase`                                                                         |
| Component React, Class                     | `PascalCase`                                                                        |
| Hằng số (mọi ngôn ngữ)                     | `UPPER_SNAKE_CASE`                                                                  |
| Biến/hàm Python nội bộ                     | `snake_case`                                                                        |
| Field JSON của Python API                  | `camelCase` (qua Pydantic v2 `alias_generator=to_camel`)                            |
| Prisma model                               | `PascalCase`, danh từ số ít (`User`, `OrderItem`)                                   |
| Prisma field                               | `camelCase` (`createdAt`, `userId`)                                                 |
| Bảng PostgreSQL                            | `snake_case`, danh từ số nhiều, khai báo bằng `@@map` (`users`, `order_items`)      |
| Cột PostgreSQL                             | `snake_case`, khai báo bằng `@map` (`created_at`, `user_id`)                        |
| Endpoint REST                              | Danh từ số nhiều, `kebab-case`: `/api/v1/order-items`                               |
| Tên file                                   | React Component: `PascalCase.jsx`; JS khác: `camelCase.js`; Python: `snake_case.py` |

## 3. HỢP ĐỒNG GIAO TIẾP (API CONTRACT)

- Định dạng JSON response thống nhất cho mọi API (cả BE và AI Service):

  **Thành công**

  ```json
  {
    "success": true,
    "message": "...",
    "data": {},
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 100
    }
  }
  ```

  **Lỗi**

  ```json
  {
    "success": false,
    "message": "...",
    "errorCode": "USER_NOT_FOUND",
    "errors": [
      {
        "field": "email",
        "message": "..."
      }
    ]
  }
  ```

- Ngày giờ: Truyền qua API bằng chuỗi ISO 8601 (UTC); Front-end hiển thị theo múi giờ người dùng.
- Giao tiếp BE ↔ AI Service: Bắt buộc xác thực nội bộ qua header `X-Internal-Api-Key` (so khớp với biến môi trường `INTERNAL_API_KEY`). AI Service tuyệt đối không kết nối trực tiếp vào PostgreSQL.

## 4. QUY TẮC CLEAN CODE & GIT CHUNG

- Tên biến, hàm, class tự giải thích ý nghĩa; hàm ≤ 30 dòng, tham số ≤ 3 (nhiều hơn thì gom vào object), tránh lồng `if` quá 2 cấp (dùng early return / guard clause).
- Tuân thủ DRY, KISS, YAGNI. Không để code thừa, code bị comment, `console.log`/`print` debug, hay magic number/string.
- Comment giải thích **"tại sao"**, không giải thích "cái gì".
- Git: Branch `main`, `develop`, `feature/*`, `fix/*`, `hotfix/*`. Commit theo chuẩn Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).

## 5. TIÊU CHUẨN FILE README.MD (Ở THƯ MỤC GỐC)

Khi khởi tạo hoặc cập nhật `README.md`, phải đảm bảo đủ 14 mục (lệnh copy-paste chạy được ngay):

1. Tên dự án & bài toán.
2. Tính năng chính.
3. Công nghệ & phiên bản cụ thể.
4. Kiến trúc tổng quan.
5. Cấu trúc thư mục.
6. Yêu cầu hệ thống (Node ≥ 20, Python ≥ 3.11, PostgreSQL ≥ 15).
7. Hướng dẫn cài đặt & khởi động local từng bước cho DB, `server`, `ai-service`, `client` kèm thứ tự và port mặc định.
8. Bảng biến môi trường của cả 3 service.
9. Danh sách scripts.
10. Link tài liệu API & ERD.
11. Hướng dẫn chạy test trên DB test riêng.
12. Quy ước code & Git.
13. Troubleshooting lỗi thường gặp.
14. License & liên hệ.

## 6. QUY TRÌNH PHẢN HỒI KHI TẠO CODE (BẮT BUỘC)

1. **Chia giai đoạn (chống cắt xén code do tràn token):** Nếu yêu cầu liên quan đến nhiều tầng (DB + BE + AI + FE + Test), **tuyệt đối không viết code rút gọn hay cắt bớt logic**. Hãy chia lộ trình thành các phase:
   - **Phase 1:** `schema.prisma`, Migration và tầng Back-end (`server/`).
   - **Phase 2:** Tầng AI Service (`ai-service/`) và tầng Front-end (`client/`).
   - **Phase 3:** Unit/Integration Test và cập nhật tài liệu (`README.md`, `.env.example`, OpenAPI).
   - **Dừng lại sau mỗi phase và hỏi xác nhận trước khi sang phase tiếp theo.**
2. Trước khi viết code, tóm tắt ngắn gọn cách tiếp cận và liệt kê danh sách file sẽ tạo/sửa (kèm đường dẫn đầy đủ).
3. Mỗi file code ghi rõ đường dẫn ở dòng comment đầu tiên; code hoàn chỉnh 100%, cấm để `// TODO` hay `...` lược bỏ.
4. Cuối mỗi câu trả lời, luôn in dòng tự kiểm tra:

   `Checklist: ✅ Clean code · ✅ Nhất quán tên gọi (@map/@@map) · ✅ SRP · ✅ Đúng cấu trúc thư mục · ✅ Không dữ liệu giả · ✅ Bảo mật & Validate · ✅ Không tự thêm DevOps.`
