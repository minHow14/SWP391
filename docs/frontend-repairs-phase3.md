# Kết quả Phase 3 — kiểm thử tích hợp và tài liệu

Ngày: 04/11/2026. Nhánh: `fix-frontend`. Không push/merge, không thay đổi logic runtime hoặc bản đồ trong Phase 3.

## Kết quả triển khai

- Thêm `server/tests/frontendAuthIntegration.test.js`: client Axios/authService thật gọi Express qua HTTP loopback và PostgreSQL `_test`. Chỉ thay SMTP transport trong test; header Cookie ở Node mô phỏng cookie jar của trình duyệt. Ba luồng: khôi phục/đăng nhập lại/thu hồi phiên cũ và chống dùng lại link; tự refresh rồi lưu hồ sơ cùng tài khoản; cookie refresh của tài khoản khác bị từ chối trước khi ghi dữ liệu.
- Thêm OpenAPI cho chín path về recovery, refresh/logout/đổi mật khẩu, pháp lý và restore/status tài khoản. Mô tả đúng envelope, validation, quyền admin, token fragment, no-store, generic SMTP response và giới hạn dữ liệu cũ. Đồng bộ bảy chế độ ăn và history mặc định trong OpenAPI AI.
- ERD bổ sung PasswordResetToken/LegalDocument, User.tokenVersion và metadata trạng thái nội dung trước khi xóa tài khoản. Không sửa schema hoặc migration đã áp dụng.
- README giữ đủ 14 mục, cập nhật phiên bản theo lockfile, Node ≥22.22 cho dependencies hiện hành, thứ tự DB → AI → BE → FE, SMTP/TLS, công bố pháp lý, migration DB test không reset, test và các giới hạn thực tế. Các mẫu môi trường không chứa secret thật; client giữ cùng-origin `/api`, DB test vô hiệu hóa SMTP thật mặc định.

## Kiểm chứng cuối

| Lệnh / kiểm tra | Kết quả |
| --- | --- |
| `cd server; npm test` | **486/486 test, 58/58 file**, exit 0; 87,29 giây |
| `cd server; npm run test:database` | PASS: catalog, auth/hồ sơ, CRUD cộng đồng/comment/vote, nhật ký riêng, dinh dưỡng, ownership, kế hoạch và đánh giá |
| `cd server; npm run test:ai-internal-auth` | PASS: HTTP BE → FastAPI thật, khóa nội bộ sai/đúng, hoàn quota, lưu FAILED và từ chối provider chưa sẵn sàng; không gọi provider |
| `cd client; npm test` | **129/129** test logic, exit 0 |
| `cd client; npm run test:ui` | **169/169** test, 35/35 file, exit 0 |
| `cd client; npm run lint` | **0 lỗi, 2 cảnh báo** RestaurantMap, exit 0 |
| `cd client; npm run build` | Thành công; chunk chính 588,59 kB trước gzip / 188,66 kB gzip, còn cảnh báo >500 kB |
| `cd ai_service; .\venv\Scripts\python.exe -m pytest -q` | **284/284** test; 5 cảnh báo deprecation SlowAPI; 5,90 giây |
| Prisma validate / migrate status | Schema hợp lệ; DB phát triển và `_test` đều cập nhật đủ 14 migration; chỉ đọc |
| OpenAPI | Hai file parse JSON, toàn bộ internal `$ref` hợp lệ; FastAPI OpenAPI model validation đạt |
| README / mẫu env | Đủ mục 1–14, các link file local tồn tại, tất cả biến trong mẫu ba service có trong README |

Test backend được chặn nếu tên DB không kết thúc `_test`. Không chạy seed/reset DB, ghi DB phát triển, đổi mật khẩu thật, gửi email thật hoặc inference trả phí. Server HTTP và FastAPI con do integration test tạo được đóng ở cleanup. File untracked không liên quan giữ nguyên.

Lần chạy đầu của test mới thất bại vì test giả định thứ tự ID của hai fixture được tạo đồng thời. Đã sửa assertion so sánh theo user_id; không thay code runtime để làm test đạt. Test mới sau đó đạt 3/3, rồi đạt trong toàn bộ suite.

## Hai cảnh báo bản đồ là gì?

Cả hai là **`react-hooks/exhaustive-deps` của ESLint** trong `client/src/features/restaurants/components/RestaurantMap.jsx`:

1. **Dòng 108: thiếu `userLocation` trong dependency của effect khởi tạo bản đồ (dòng 39–108).** Effect dùng vị trí người dùng để chọn tâm ban đầu nhưng khai báo `[]`, nên chỉ chạy khi mount. Nếu GPS tới sau, marker vẫn có thể được cập nhật bởi effect khác, còn phần khởi tạo tâm không chạy lại. Tâm bản đồ có thể giữ vị trí ban đầu cho đến khi chọn quán hoặc bấm “Vị trí của tôi”. Không thể kết luận bản đồ hỏng chỉ từ warning. Thêm `[userLocation]` trực tiếp sẽ chạy cleanup và tạo lại Leaflet khi object vị trí đổi, nên cần tách vòng đời tạo map khỏi việc cập nhật viewport nếu muốn sửa.

2. **Dòng 171: thiếu object `searchCenter` và `userLocation` trong dependency của effect vẽ marker/vòng bán kính (dòng 110–183).** Code truyền cả object vào `hasCoordinates`, nhưng dependency lại liệt kê từng `lat`, `latitude`, `lng`, `longitude` của chúng. Linter yêu cầu object vì effect có đọc object. Hiện `hasCoordinates` cũng chỉ kiểm tra chính các trường tọa độ đó, và tọa độ đã được theo dõi đầy đủ; việc đổi object nhưng giữ nguyên tọa độ không làm kết quả hiển thị khác. Vì vậy đây chưa phải bằng chứng marker bị cũ hoặc API chưa nối. Có thể xử lý bằng chuẩn hóa tọa độ scalar rồi dùng thống nhất trong effect và dependency, khi có yêu cầu sửa riêng.

Hai warning không chặn build. Cảnh báo kích thước bundle >500 kB là cảnh báo thứ ba, riêng biệt, không thuộc bản đồ. Phase 3 giữ nguyên code bản đồ theo phạm vi người dùng yêu cầu giải thích.

## Review và dấu vết commit

Review độc lập đối chiếu test/tài liệu với code và không phát hiện thêm lỗi chức năng chắc chắn. Có một lỗi tài liệu P2 đã sửa: refresh không ưu tiên raw Cookie hơn JSON body khi đồng thời có cả hai; mô tả hiện tại ghi rõ thứ tự thực tế. Comment mẫu env cũ về khởi động worker cũng được đồng bộ với việc worker tự chạy cùng API, trong phạm vi cập nhật hướng dẫn local.

| Commit | Phạm vi |
| --- | --- |
| `b4cef9d` | Kế hoạch Phase 3 |
| `b96b5f0` | Ba test auth xuyên FE/HTTP/BE/DB |
| `54c3cc8` | OpenAPI recovery/legal/restore, bảy chế độ ăn và ERD |
| `5d70ff3` | Sửa mô tả thứ tự lấy refresh token theo source |
| `c24255b` | README đủ 14 mục, cấu hình local/SMTP và DB test riêng |

Commit báo cáo đi riêng; xem `git log --oneline` trên nhánh `fix-frontend`.

## Giới hạn còn lại

- SMTP thật, email tới hộp thư và kết quả inference của provider thật chưa được kiểm chứng. Cần cấu hình/tài khoản thật; test không giả vờ xác nhận các phần này.
- Nội dung điều khoản/chính sách cần được người có trách nhiệm duyệt và admin công bố. Không tạo nội dung pháp lý mẫu.
- Nếu mật khẩu admin hiện tại còn là mật khẩu seed từng công khai, chủ tài khoản phải đổi; chưa thử hoặc thay mật khẩu trong DB phát triển.
- Nội dung xóa trước migration không còn metadata trạng thái gốc không thể khôi phục tự động đúng trạng thái. Các cảnh báo bản đồ/bundle và deprecation SlowAPI/Prisma vẫn được ghi nhận.

Ba phase đã hoàn tất phạm vi sửa mã, kiểm thử và tài liệu được duyệt. Các kiểm chứng phụ thuộc cấu hình thật được tách rõ ở trên, không được coi là đã chạy thành công.
