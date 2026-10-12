# Dữ liệu mẫu ChayXanh

Chạy trong thư mục `server` sau khi đã tạo các bảng từ `schema.prisma`:

```powershell
npm run db:seed
npm run db:verify
```

Script đọc `server/.env` và chỉ chấp nhận database tên `vegetarian_db`.
Toàn bộ thao tác thêm dữ liệu nằm trong một transaction; lỗi sẽ rollback.
Không xóa bảng, không sửa tài khoản hoặc dữ liệu đã có. Chạy lại cùng ngày không nhân đôi bản ghi.
Các nhóm dữ liệu được nhận diện bằng tên/email hoặc nhãn `[Demo]`.
Chạy ở ngày khác sẽ bổ sung nhật ký, lịch sử và kế hoạch cho khoảng ngày mới.

## Tài khoản đăng nhập backend

| Quyền | Email | Mật khẩu | Trạng thái |
|---|---|---|---|
| Admin | admin@chayxanh.local | Admin@123456 | ACTIVE |
| User | user@chayxanh.local | User@123456 | ACTIVE |
| User | minhanh@chayxanh.local | User@123456 | ACTIVE |
| User | hoangnam@chayxanh.local | User@123456 | ACTIVE |
| User | ngoclinh@chayxanh.local | User@123456 | ACTIVE |
| User kiểm thử khóa | locked@chayxanh.local | User@123456 | LOCKED |

Mật khẩu lưu bằng bcrypt cost 10. Tài khoản LOCKED dùng để kiểm tra việc từ chối đăng nhập.
Nếu email mẫu đã tồn tại với mật khẩu/quyền khác, script dừng và giữ nguyên dữ liệu.

## Phạm vi

- 6 loại chế độ ăn; 9 danh mục; 24 nguyên liệu, gồm trứng/sữa và phụ gia để kiểm thử tra cứu.
- 13 công thức và nguyên liệu liên quan, bài đăng RECIPE, danh mục.
- 6 blog (có PUBLISHED, DRAFT, PENDING), 3 video minh họa, bình luận và upvote/downvote.
- 5 quán giả lập ở TP.HCM/Hà Nội, thực đơn liên kết với công thức.
- 5 hồ sơ sức khỏe, lịch sử 7 ngày, dị ứng mẫu.
- Nhật ký 7 ngày và kế hoạch 7 ngày × 4 bữa cho 4 user hoạt động.
- Thông báo đã đọc/chưa đọc, báo cáo PENDING/RESOLVED/REJECTED, log AI SUCCESS/ERROR.

Tên quán, địa chỉ, đánh giá, dinh dưỡng và hồ sơ là dữ liệu giả lập để thử ứng dụng.
Video hoa CC0 là nội dung thử trình phát, không phải video nấu ăn.
Ảnh nằm trong `client/public/demo-assets`, URL mặc định `http://localhost:5173/demo-assets/...`.
Frontend hiện dùng dữ liệu demo riêng; seed database không tự thay việc kết nối frontend với API.
