# Rà soát client với database mới — 12/10/2026

Client lấy catalog từ `GET /api/workspace/catalog`; nhật ký, kế hoạch, bài viết và đánh giá được lưu qua backend. Không cần chạy seed lại để dùng dữ liệu hiện có.

## Các lỗi đã sửa

- ID 6 là Keto Chay, ID 7 là Eat Clean Chay. Lựa chọn và tên chế độ ăn được khôi phục theo catalog; cả hai chế độ đều lưu được qua reload.
- Bộ lọc không bỏ qua Keto/Eat Clean. Công thức chỉ hiển thị nhãn được phân loại; không suy ra chay Phật giáo từ nhãn Vegan vì có thể chứa hành/tỏi.
- API hỗ trợ cả phản hồi auth và envelope workspace, có thời gian chờ, giữ nguyên nguyên nhân lỗi kết nối. Phiên vẫn dùng được khi browser chặn storage; phản hồi 401 của token cũ không xóa phiên mới.
- Tách context và hook để Fast Refresh hoạt động, sửa lỗi lint và ngăn hiển thị bài cá nhân của phiên trước khi đổi tài khoản.
- Xử lý hướng dẫn công thức null, bài viết thiếu bản ghi blog/video, ảnh/video lỗi và nguyên liệu chưa có thông tin nguồn gốc.
- Chỉ đường dùng địa chỉ khi quán thiếu tọa độ; chi tiết hiển thị số điện thoại hiện có.
- Form auth ngăn gửi lặp và đồng bộ giới hạn trường với API. Vite preview có proxy API như dev.
- Kiểm thử database dựa trên số bản ghi thực tế, tự tạo tài khoản kiểm thử và dọn dữ liệu sau khi kết thúc.

## Kiểm tra

Trong `client`: `npm run lint`, `npm test`, `npm run build`.

Trong `server`: `npm test`, `npm run test:database`. Bộ tích hợp kiểm tra catalog, auth, cộng đồng, nhật ký riêng tư, quyền sở hữu, dinh dưỡng, kế hoạch tuần và đánh giá.

Đã kiểm tra các trang trên trình duyệt: trang chủ, công thức, kiểm tra món, đổi món, từ điển, quán chay, cộng đồng, nhật ký khi chưa đăng nhập, đăng nhập và đăng ký.

## Giới hạn hiện tại

- Video trong database đang dùng URL `cdn.example.com`, cần thay bằng tài nguyên video thật để phát. Client hiển thị thông báo khi video không khả dụng.
- Chế độ Keto/Eat Clean có thể chưa có công thức được gắn nhãn; kết quả rỗng là đúng dữ liệu hiện có. Bộ kiểm tra thành phần chưa có quy tắc riêng cho hai chế độ này.
- Chat hiện tra cứu công thức từ database; nhận diện ảnh/OCR và kết nối AI chưa được triển khai ở client.
- `db:verify` kiểm tra bộ demo cũ (mật khẩu và số lượng/quan hệ mẫu), nên không dùng kết quả đó để kết luận database mới hỏng và không reset dữ liệu để đạt điều kiện demo.
- Chưa chạy được bộ test AI vì Python hiện có thiếu pytest. Prisma generate bị khóa DLL khi backend đang dùng engine; cần dừng backend trước khi sinh lại client theo schema mới.

Khi deploy bản build, cấu hình web server chuyển `/api` đến backend và các đường dẫn SPA về `index.html`.
