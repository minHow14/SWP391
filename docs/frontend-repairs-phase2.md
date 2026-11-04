# Kết quả sửa frontend audit — Phase 2

Ngày kiểm chứng: 04/11/2026. Nhánh duy nhất: `fix-frontend`. Không merge hoặc push.

## Phạm vi đã triển khai

Đã sửa các lỗi frontend/AI trong báo cáo ngày 03/11, nối backend cần thiết và bổ sung hai yêu cầu người dùng xác nhận: triển khai backend quên mật khẩu/điều khoản, khôi phục đúng trạng thái nội dung trước khi xóa tài khoản. Bảng dưới ghi nhận sửa mã và kiểm thử; không thay thế kiểm chứng nhà cung cấp email/AI thật.

| Nhóm / mục audit | Commit chức năng |
| --- | --- |
| 01 — bỏ thông tin đăng nhập quản trị công khai | `7f51d62` |
| Phát hiện toàn bộ test giao diện | `ff455f1` |
| 07 — giữ media/bình luận chuẩn hóa của bài riêng | `58cd224` |
| 08 — phân trang năm bảng quản trị | `274ad04` |
| 09 — nhóm danh mục theo quan hệ thật, bỏ lựa chọn không lưu | `795ff6c` |
| 04 — gom refresh đồng thời, thử lại một lần, bảo vệ phiên mới | `a33d1b9`, `a5925df` |
| 10 — đồng bộ session/hồ sơ sau sửa Nhật ký | `1d07416`, `7dbc6e9` |
| 11 — sắp giá món thấp nhất từ menu đã lưu, giá thiếu ở cuối | `f47364c` |
| 17 — quota theo guestId từ cookie đã ký | `f720944` |
| 16 — lọc log theo feature hiện hành | `e584797` |
| 13–15, 18 — dị ứng thật, hủy kết quả cũ, trạng thái chưa xác minh, gợi ý thay thế | `5a38370`, `730197b` |
| 06, 20 — metadata trạng thái gốc, khôi phục đúng trạng thái, caller riêng | `c7c2871`, `dd4dd2a`, `8634b40` |
| 12 — giữ đủ bảy chế độ ăn FE/BE/AI | `1b220f8` |
| Quên mật khẩu qua SMTP và thu hồi JWT cũ | `1f169fa`, `fb46985` |
| Điều khoản/chính sách do quản trị viên soạn, nháp hoặc công bố | `8f9b466` |
| 05 — logout backend và ghi nhớ đăng nhập thật | `8e1c812` |
| Quét ảnh trong chat, chặn response/file đọc muộn | `ecb2a7a` |
| 19 — BMI từ số đo hồ sơ, không gọi inference để làm phép tính | `62efa33` |
| Thứ tự cookie đổi mật khẩu/logout/đăng nhập | `c37f154` |
| Giao diện khôi phục mật khẩu, liên kết pháp lý thật | `91234a4` |
| Ràng buộc danh tính refresh giữa các tab | `86f102a` |
| Tiêu đề và thông báo trang mới cho trình đọc màn hình | `b633954` |

Các mục 02, 03 đã sửa ở Phase 1. Kế hoạch Phase 2 được lưu riêng ở `62e837b`.

## Bằng chứng kiểm tra cuối

| Kiểm tra | Kết quả |
| --- | --- |
| `cd server; npm test` | 483/483 test, 57/57 file; exit 0; 89,86 giây |
| `cd client; npm test` | 129/129 test logic; exit 0 |
| `cd client; npm run test:ui` | 169/169 test, 35/35 file; exit 0 |
| `cd client; npm run lint` | 0 lỗi; 2 cảnh báo dependency có sẵn ở RestaurantMap.jsx |
| `cd client; npm run build` | Thành công; chunk chính khoảng 588,59 kB trước gzip, 188,66 kB gzip |
| `cd ai_service; .\venv\Scripts\python.exe -m pytest -q` | 284/284 test; 5 cảnh báo deprecation từ SlowAPI; 4,03 giây |
| `cd server; npx prisma validate` | Schema hợp lệ |
| `cd server; npx prisma migrate status` | 14 migrations; DB phát triển đã cập nhật |

Test backend chỉ dùng DB có tên kết thúc `_test`, được kiểm tra khi nạp môi trường. Provider ngoài được giả lập trong test; không dùng dữ liệu giả trong luồng chạy thật và không gọi inference có phí. TEMP/TMP đặt trong cache workspace. Các lệnh PostgreSQL/asyncio chạy ngoài sandbox hạn chế socket; lỗi quyền socket trước đó không bị coi là lỗi ứng dụng.

Đã mở Vite và API tạm không khởi động worker để kiểm tra giao diện công khai, sau đó dừng các tiến trình tạm. Trình duyệt xác nhận liên kết đăng nhập → quên mật khẩu, giao diện 390×844, thiếu token hiển thị lỗi cùng đường yêu cầu mới, trang pháp lý 1366×900 hiển thị trạng thái chưa công bố từ API thật. Không tạo tài khoản, đổi mật khẩu thật hoặc gửi email từ trình duyệt. Admin và kết quả AI được kiểm tra tự động, chưa kiểm tra bằng tài khoản/provider thật trong browser.

Review độc lập tìm được hai lỗi bổ sung và đã có test tái hiện trước khi sửa: đổi mật khẩu ghi đè sau reset/khóa/xóa đồng thời; cookie refresh của tab B khiến thao tác tab A gửi lại bằng quyền B. Review bản sửa không phát hiện thêm lỗi chắc chắn trong phạm vi đã xem. Test hồ sơ cũng tái hiện và sửa trường hợp token tự gia hạn khiến dữ liệu mới bị bỏ qua.

## Schema và hành vi dữ liệu

Ba migration bổ sung đã áp dụng cho DB phát triển và DB test, không xóa dữ liệu nghiệp vụ:

- `20261104002853_preserve_account_content_status`: lưu trạng thái bài/bình luận trước khi xóa tài khoản.
- `20261104003005_add_password_reset_tokens`: token khôi phục chỉ lưu SHA-256 và phiên bản JWT của tài khoản.
- `20261104003257_add_legal_documents`: lưu nội dung pháp lý, phiên bản, trạng thái công bố và thời gian.

Khôi phục nội dung mới giữ nguyên PUBLISHED/HIDDEN/HIDDEN_BY_AI/PENDING_MODERATION/DRAFT và trạng thái bình luận gốc. Nội dung xóa từ trước migration thiếu metadata tiếp tục DELETED, có số lượng/cảnh báo; không đoán trạng thái hoặc tự công bố. Các trạng thái gốc đã mất không thể khôi phục tự động.

Keto yêu cầu dữ liệu chất xơ từng món để xác minh carb thuần cả ngày. Một ảnh hoặc lịch sử quét cũ không đủ dữ liệu nên không được kết luận đã đạt giới hạn cả ngày. Buddhist/Eat Clean giữ quy tắc từ mô tả nghiệp vụ hiện có, không bổ sung ngưỡng dinh dưỡng tự suy diễn.

## Phần cần cấu hình hoặc kiểm chứng thật

- SMTP cần thông tin nhà cung cấp thật trong `server/.env`; các biến và cổng TLS đã có trong `.env.example`. Chưa thử gửi/nhận email thật. Thiếu cấu hình hoặc verify SMTP thất bại trả 503 đồng nhất; nếu gửi thất bại sau verify, token bị thu hồi và vẫn trả thông báo chung không tiết lộ tài khoản. Thời gian phản hồi tài khoản tồn tại có thể khác do chờ gửi SMTP; chưa có hàng đợi gửi bền vững.
- Quản trị viên cần nhập và công bố nội dung đã được phê duyệt ở tab pháp lý. Không seed văn bản pháp lý giả. Các route công khai là `/dieu-khoan`, `/chinh-sach-bao-mat`; khôi phục là `/quen-mat-khau`, `/dat-lai-mat-khau#token=…`.
- Đã xóa mật khẩu admin khỏi UI; chưa xác minh hoặc đổi mật khẩu admin hiện tại trong DB. Nếu DB còn dùng mật khẩu seed đã công khai, chủ tài khoản cần đổi bằng luồng đổi mật khẩu.
- Chưa kiểm chứng email, chất lượng mô hình/provider, quota ngoài thực tế và toàn bộ luồng quản trị trong browser. Hai cảnh báo effect bản đồ, cảnh báo kích thước bundle, deprecation SlowAPI/Prisma vẫn còn.

Phase 3 còn cập nhật tài liệu API/README theo đủ 14 mục và kiểm thử tích hợp đầu cuối phù hợp với cấu hình thật. Dừng ở ranh giới Phase 2 theo yêu cầu xác nhận từng phase trong AGENTS.md.
