# Kết quả sửa frontend audit — Phase 1 backend

Ngày: 03/11/2026. Nhánh duy nhất: `fix-frontend`.

## Các commit chức năng

| Commit | Phạm vi |
| --- | --- |
| `9c2dda0` | Validator thành viên nhận ACTIVE/LOCKED/DELETED theo USER_STATUS; loại trạng thái cũ không hỗ trợ |
| `5e03515` | Validator báo cáo nhận DISMISSED theo REPORT_STATUS |
| `53abe81` | Không cho PATCH ACTIVE/LOCKED xóa dấu khôi phục của tài khoản DELETED |
| `726ff19` | Dùng chung logic đồng bộ lịch sử cân nặng giữa hồ sơ auth và Nhật ký, trong cùng transaction |
| `96c097c` | Tuần tự hóa PATCH/DELETE/restore bằng khóa hàng trong transaction; DELETE lặp lại giữ timestamp; PATCH DELETED dùng cùng cascade |
| `e1bca95` | Chống lịch sử trùng bằng số đo đã lưu và bản ghi được thêm gần nhất, không phụ thuộc recorded_date |

Kế hoạch được ghi riêng tại commit `5420dce`. Các bản sửa phát sinh từ review được commit theo cùng chức năng, không gộp với chức năng khác. Không merge hoặc push.

## Bằng chứng kiểm tra

- Baseline trước sửa: 395/395 test, 47/47 file đạt.
- Contract thành viên: tái hiện 3 failure rồi 8/8 test đạt.
- Contract báo cáo: tái hiện 2 failure rồi tổng hai suite 15/15 đạt.
- Bảo vệ tài khoản: tái hiện generic PATCH xóa metadata; sau sửa các ca khóa/mở, giữ metadata và selective restore đạt.
- Review bổ sung: tái hiện DELETE lặp lại đổi timestamp, PATCH DELETED bỏ qua cascade và PATCH đồng thời làm sống lại tài khoản. Sau sửa, 18/18 test trong hai suite admin API đạt.
- Nhật ký: tái hiện thiếu lịch sử và thiếu rollback khi history persistence lỗi. Kiểm tra thêm biên cân nặng đã được validator hồ sơ hiện hành chấp nhận, weight null, BMI và hai endpoint dùng chung.
- Review bổ sung: tái hiện cân nặng nhiều chữ số thập phân bị trùng do PostgreSQL REAL và bản ghi ngày tương lai làm sai dedup. Sau sửa, 17/17 test auth/journal đạt.
- Lần cuối sau tất cả bản sửa: `cd server; npm test` → **425/425 test, 51/51 file đạt**, 68,45 giây; exit code 0.
- `git diff 03b2852..HEAD --check` không có lỗi whitespace.

Test chỉ dùng database `_test` được kiểm tra tên trong loadTestEnvironment.js. TEMP/TMP được đặt trong cache workspace để tránh lỗi đường dẫn tạm của sandbox. Các provider AI ngoài được giả lập trong test hiện có; không gọi inference có phí. Không thay đổi schema, dependency, dữ liệu nghiệp vụ hoặc cấu hình triển khai.

## Quyết định và giới hạn

- Làm trực tiếp trong checkout/nhánh `fix-frontend` người dùng đã chọn; giữ nguyên file untracked không liên quan.
- Giới hạn cân nặng standalone recordWeight vẫn như cũ. Đồng bộ hồ sơ dùng toàn bộ miền giá trị mà chính validator hồ sơ đã chấp nhận, tránh lưu hồ sơ nhưng âm thầm bỏ lịch sử.
- Khóa hàng account được lấy trước mọi chuyển trạng thái tài khoản để ngăn read/write race và tránh thay timestamp khi client gửi lại DELETE. Các query nằm trong repository, transaction do service điều phối.
- Phase 2 phải nối frontend với endpoint restore; đến lúc đó frontend gửi ACTIVE cho tài khoản DELETED sẽ nhận ACCOUNT_RESTORE_REQUIRED thay vì làm mất metadata.
- Contract chế độ ăn phải sửa đồng thời FE/BE/AI ở phase tiếp theo; chưa mở rộng enum backend khi AI chưa hỗ trợ.
- Rủi ro có sẵn được review ghi nhận riêng: restore tài khoản chưa giữ trạng thái kiểm duyệt cũ của bài/bình luận. Phải chốt quy tắc và bổ sung metadata trạng thái gốc; không suy diễn dữ liệu đã mất. Mục 20 trong audit theo dõi việc này, chưa coi restore là hoàn chỉnh về kiểm duyệt.
- Frontend/AI và kiểm thử trình duyệt đầu cuối chưa được thực hiện trong Phase 1. Các chức năng quên mật khẩu/điều khoản cần thông tin thật, không được tự bịa.

Theo AGENTS.md dòng 107, dừng ở ranh giới phase để nhận xác nhận trước Phase 2.
