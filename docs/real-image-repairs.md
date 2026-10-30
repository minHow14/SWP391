# 2026-10-30 — Ảnh thực tế và trạng thái backend

## Dữ liệu đã sửa

- 26 quán trong DB local, ID 2–27: đổi mã tài nguyên `places/.../photos/...` thành ảnh Google Maps lấy qua API ZIOMAP hiện có, kiểm tra prefix đúng Google Place ID của từng bản ghi. Không tìm theo tên gần giống và không lấy ảnh quán khác.
- 26 ảnh có 26 SHA-256 khác nhau, rộng 800 px, cao tối thiểu 450 px; tổng 6.641.145 byte. Đã kiểm tra trực quan bảng ảnh trước khi cập nhật. Ảnh được lưu nguyên byte trong `server/uploads/restaurants/`.
- Manifest [restaurant-image-sources.json](./restaurant-image-sources.json) lưu địa điểm, trang Google Maps, URL ảnh nguồn, hash, kích thước và giá trị cũ. Không khẳng định giấy phép mở cho ảnh Google Maps; giữ nguồn gốc ảnh khi sử dụng và chuyển giao dữ liệu.
- Nguyên liệu Bắp ngọt (ID 28): thay PNG 1×1, 70 byte bằng ảnh JPEG 635×418, 155.552 byte. Nguồn [VegCorn.jpg — Wikimedia Commons](https://commons.wikimedia.org/wiki/File:VegCorn.jpg), nguồn USDA, public domain. SHA-256 mới: `2d1d84b0ae468870fc077745ffc813b50e35d4b7ab3c7354b5e1acecba067f5a`.
- Các ảnh nguyên liệu còn lại được giữ nguyên. Không reset, truncate hay chạy seed.

## Lệnh bảo trì

Chạy từ thư mục `server/`:

```powershell
node scripts/repairRestaurantImages.js
node scripts/repairRestaurantImages.js --apply
```

Lệnh đầu chỉ chuẩn bị ảnh và manifest, dùng tối đa hai kết nối đồng thời. Lệnh thứ hai kiểm tra lại hash, ảnh trùng và cập nhật theo lô trong transaction; nếu Google Place ID hoặc giá trị ảnh cũ không còn khớp thì rollback toàn bộ. Không chạy lại lệnh chuẩn bị để ghi đè manifest sau khi dữ liệu đã được áp dụng.

Ảnh và bản sao binary bắp cũ nằm trong thư mục Git bỏ qua `server/uploads/`; khi chuyển máy phải sao chép thư mục này cùng DB. Manifest giữ `previousImageUrl` của 26 quán để khôi phục có kiểm soát nếu cần. Bản sao bắp cũ nằm tại `server/uploads/image-repair-cache/corn-before.json`. URL ảnh nguyên liệu được thêm version hash để cache cũ không che ảnh đã thay.

## Backend

- `GET /api/admin/system-health` dùng RBAC admin hiện có, kiểm tra kết nối DB bằng `SELECT 1` và HTTP `/health` của AI Service, thời hạn 3 giây. HTTP AI lên không có nghĩa provider inference đã được kiểm tra. Nếu DB hỏng đến mức không xác thực được admin, request có thể lỗi; frontend phải hiển thị unavailable/unknown.
- Mô hình chưa có log trả `status: UNKNOWN`, `successRate: null`.
- Không còn tự sinh ảnh Unsplash thay cho ảnh quán. Luồng tìm quán giải mã ảnh thật với tối đa hai kết nối và tổng thời gian bổ sung tối đa 3 giây; ảnh lỗi trả `null`, không làm mất kết quả tìm kiếm.
- Import ảnh nguyên liệu không ghi PNG giả khi offline. Catalog dùng ảnh JPEG thật của bắp thay cho đường dẫn SVG không tồn tại.

## Phase 2 — đã thực hiện sau xác nhận của người dùng

- Banner frontend gọi health API thật khi mở và khi bấm “Kiểm tra lại”; có loading, lỗi, rỗng và trạng thái chưa xác định. Lỗi hoặc kiểm tra lại xóa kết quả cũ, không giữ nhãn xanh từ lần trước. Không tự polling để hạn chế mạng.
- Thẻ mô hình chưa có log hiển thị “Chưa có dữ liệu”, không hiện 100% hoặc cảnh báo sự cố giả. Giá trị 0% khi có lượt gọi thực vẫn được giữ.
- Xóa ngân hàng ảnh quán mẫu và các fallback Unsplash bên client. Ảnh không có hoặc lỗi hiển thị empty state.
- Thay tám ảnh công thức Unsplash bằng tám ảnh món ăn tham khảo từ trang công thức gốc, tải tổng 1.242.219 byte. Tám SHA-256 khác nhau, không trùng 26 ảnh quán. Chỉ đổi `recipes.image_url`, giữ nguyên nội dung, nguyên liệu và số liệu; transaction kiểm tra URL cũ trước khi cập nhật.
- [recipe-image-sources.json](./recipe-image-sources.json) lưu nguồn, tiêu đề nguồn, URL ảnh, kích thước, hash và giá trị cũ. Nguồn là My Goodness Kitchen, Fuldkorn, Hovis, Veggie Anh, Minimalist Baker, Andie Mitchell, Cooking For Peanuts và Lazy Cat Kitchen. Đây là ảnh món ăn từ công thức tham khảo, không khẳng định trùng chính xác biến thể nguyên liệu của công thức trong ứng dụng; UI ghi rõ “Ảnh món ăn tham khảo”. Không gán giấy phép mở cho các ảnh này.
- Bốn thumbnail YouTube giữ nguyên đã kiểm tra bằng oEmbed và HEAD ảnh: HTTP 200, tên video tương ứng đậu hũ kho nấm, salad táo óc chó, canh rong biển đậu hũ và cơm gạo lứt trộn rau củ.
- Các ảnh công thức cũng lưu trong thư mục Git bỏ qua `server/uploads/recipes/`; cần sao chép cùng dữ liệu DB khi chuyển máy. Không chạy lại seed để áp dụng các sửa chữa này; seed vẫn chứa dữ liệu demo và ảnh cũ, không thuộc luồng khởi động mặc định trong README.

## Xác minh Phase 2

- 79/79 UI test trong 16 file, 94/94 Node test; build frontend thành công.
- ESLint không có lỗi; còn hai cảnh báo exhaustive-deps có sẵn trong `RestaurantMap.jsx`.
- Render bằng Chrome headless qua lệnh, API/DB local thật, viewport 1440 và 390 px: banner, mô hình, quán, công thức và trang chủ. Không tràn ngang hay runtime exception; cả tám ảnh công thức local tải được. Tài nguyên Internet bên ngoài bị chặn riêng trong profile QA để giảm tải mạng, nên ảnh YouTube không hiển thị trong screenshot QA dù đã xác nhận nguồn HTTP 200 bằng lệnh riêng.
- Đã xem ảnh giao diện desktop/điện thoại và kiểm tra nhãn tham khảo không đè metadata thời gian/calo. Ảnh chụp và kết quả nằm trong `server/uploads/image-repair-cache/phase2-qa/`.
- Review Phase 2 độc lập không ghi nhận lỗi correctness/security cụ thể. Kiểm tra tổng hợp RBAC/outage và OpenAPI/README được tiếp tục ở Phase 3 sau xác nhận của người dùng.

## Xác minh Phase 1

- 45/45 test trong 8 file backend qua, gồm rollback DB test và deadline ảnh khi upstream treo.
- API local: health không đăng nhập trả 401; admin trả 200, DB UP và AI HTTP DOWN tại lần kiểm tra.
- Catalog trả 26 quán, đủ 26 URL local khác nhau. Endpoint ảnh bắp trả image/jpeg, 155.552 byte.
- DB không còn ảnh nguyên liệu dưới 1.024 byte. git diff --check qua.

## Phase 3 — tích hợp và tài liệu

- [OpenAPI quản trị](./admin-health-openapi.json) mô tả endpoint health có RBAC, deadline probe 3.000 ms, HTTP 200 kèm `DEGRADED` khi probe lỗi, và lỗi request khi DB không xác thực được admin. Đo HTTP AI không đo provider inference. Mô hình không có log trả `UNKNOWN`, `successRate: null`, `lastActive: null`; tỷ lệ được tính từ tối đa 100 log gần nhất, không phải độ chính xác mô hình.
- `server/tests/adminHealthApi.test.js` kiểm tra middleware/controller/service với DB `_test` thật: thiếu/sai token, member giả claim role admin, kết nối DB thật, header nội bộ, AI 503/phản hồi sai/body treo, DB probe lỗi và DB lỗi ngay tại xác thực. Các tình huống upstream chỉ dùng HTTP fixture local; lỗi DB được mô phỏng tại repository, không dừng DB đang dùng.
- Chạy `npm run test:real-images` từ `server/` sau khi cấu hình `.env.test` và sao chép uploads. Lệnh opt-in kiểm tra hai manifest, hash không trùng, số byte, MIME và HTTP phục vụ 34 ảnh; không tải Internet, không ghi DB. Thiếu file thì báo lỗi thay vì sinh ảnh giả. Lệnh này được tách khỏi `npm test` mặc định để checkout mới không phụ thuộc file Git bỏ qua.
- Đối chiếu chỉ đọc DB local ngày 2026-10-30: đủ 26 quán khớp Place ID/URL trong manifest, tám công thức khớp URL, 30 ảnh nguyên liệu trên 1.024 byte. Toàn bộ 64 ảnh binary có hash khác nhau, phục vụ HTTP 200 và khớp byte/hash nguồn đã lưu. Bốn thumbnail YouTube thuộc kiểm tra nguồn riêng ở Phase 2, không tính vào 64 binary local này.
- Kiểm tra quyền trên DB local cũng trả 401 khi chưa đăng nhập, 403 cho member dù token claim admin, 200 cho admin. Trạng thái đo được lúc kiểm tra: database `UP`, aiService `DOWN`, tổng `DEGRADED`; không tự đổi thành trạng thái tốt để che việc AI Service chưa phản hồi.
- README giữ đủ 14 mục, thêm hợp đồng health, nguồn ảnh, lệnh kiểm tra, cách chuyển uploads và xử lý lỗi. `.env.example` giải thích header ZIOMAP chỉ dùng phía server và deadline health tách khỏi inference. Không thêm biến môi trường hay dependency mới.

### Kết quả xác minh cuối Phase 3

- `npm test -- --reporter=dot` trong `server/`: 395/395 test, 47 file qua, exit 0. Lượt đầu có một test seed cũ timeout ở subprocess 60 giây; chạy riêng lại hai test seed qua, rồi chạy lại toàn bộ suite qua trong 69,36 giây. Seed test chỉ dùng DB `seed_*_test` tạm, không chạy seed trên DB phát triển.
- `npm run test:real-images`: xác minh đủ 34 ảnh quán/công thức, hash duy nhất và HTTP 200. DB local chỉ được đọc để đối chiếu tổng 64 ảnh binary như mô tả trên.
- Frontend: `npm test` 94/94 test; `npm run test:ui -- --reporter=dot` 79/79 test trong 16 file; build thành công. Lint exit 0, không có lỗi, còn hai cảnh báo dependency có sẵn trong `RestaurantMap.jsx`; build còn cảnh báo chunk trên 500 kB.
- Ở lượt Phase 3 ban đầu, `venv/Scripts/python.exe -m pytest tests/test_health.py -q`: hai test qua; năm cảnh báo deprecation từ SlowAPI. Lượt này chỉ kiểm tra health, chưa chạy toàn bộ suite AI; kết quả bổ sung toàn suite nằm dưới đây.
- OpenAPI parse JSON thành công, 11 local `$ref` đều tồn tại; README đủ 14 mục. `git diff --check` qua. Review độc lập đã xác nhận sửa lỗi phụ thuộc ảnh local của suite mặc định và không còn phát hiện cần xử lý.
- Không commit, không reset DB phát triển, không thêm DevOps. Hướng dẫn nguồn/giấy phép và sao chép uploads ở trên vẫn áp dụng khi chuyển dữ liệu sang máy khác.

## Kiểm tra bổ sung sau commit 15b189c

Lời báo hoàn tất ban đầu chưa nêu đủ giới hạn kiểm thử: 395 test backend mặc định không bao gồm các integration `.mjs` chạy riêng; phía AI mới chỉ chạy hai test health. Sau khi người dùng yêu cầu kiểm tra lại, đã chạy thêm:

| Lệnh | Kết quả |
| --- | --- |
| `ai_service/venv/Scripts/python.exe -m pytest tests -q` từ thư mục gốc | 242 test qua, năm cảnh báo deprecation SlowAPI |
| `venv/Scripts/python.exe -m ruff check agents api core schemas main.py tests` từ `ai_service/` | Qua, không có lỗi |
| `npm run test:database` từ `server/` | Qua sau khi sửa assertion ảnh stock đã lỗi thời |
| `npm run test:ingredient-images` từ `server/` | Qua, 28 ảnh trong DB test khớp bytes/hash qua API |
| `npm run test:ai-internal-auth` từ `server/` | Qua, HTTP thật BE → FastAPI với khóa sai/đúng, hoàn quota và provider không khả dụng |
| `npm run test:real-images` từ `server/` | Qua, 34 ảnh local có hash riêng biệt và HTTP đúng |

Integration Workspace cũ còn yêu cầu giữ URL Unsplash dù yêu cầu nghiệp vụ đã loại ảnh stock. Đã thay bằng ba trường hợp thiếu ảnh/stock/local, kiểm tra cả response API và `restaurants.image_url` lưu trong DB. Thiếu ảnh và stock phải là `null`, URL local hợp lệ được giữ. Không thay mã production để chiều theo assertion cũ.

Fixture đề xuất quán được ghi nhận bằng tên UUID trước khi gửi request; kiểm tra ID trả về và dọn quán/tài khoản test trong transaction ở `finally`, kể cả khi response hoặc assertion lỗi. Đã dọn đúng một bản ghi fixture còn sót từ lần chạy thất bại trên DB `_test`. Review độc lập không còn phát hiện cần xử lý trong thay đổi này.

Sau khi sửa integration, đã chạy lại bộ backend mặc định: 395/395 test trong 47 file, exit 0; client Node: 94/94; UI: 79/79 trong 16 file. Frontend lint exit 0 với hai cảnh báo dependency cũ, build exit 0 với cảnh báo chunk trên 500 kB. Cộng với 242 test AI và bốn integration riêng ở trên, toàn bộ các suite tự động hiện có đã được chạy; các alias video/kiểm duyệt là tập con của suite mặc định, không tính lặp số test.

Các suite tự động đã chạy không đồng nghĩa toàn bộ hành vi thực tế không còn lỗi. Chưa xác minh suy luận bằng API key/provider thật, toàn bộ luồng người dùng bằng E2E, hay toàn bộ dữ liệu seed/demo. Integration AI sử dụng HTTP thật với provider bị vô hiệu hóa có chủ đích. DB phát triển không bị seed/reset hoặc cập nhật bởi các bài kiểm tra này.

## Phạm vi còn lại của dữ liệu demo

Đợt sửa này xử lý health, số liệu AI khi chưa có log, fallback ảnh và các ảnh đã xác minh. Không khẳng định toàn dự án đã sạch dữ liệu giả: `server/prisma/seed.sql` và `seed.js` vẫn có tài khoản/mật khẩu demo, ảnh Unsplash cũ và dữ liệu hoạt động mẫu; `client/src/pages/admin/AdminPortal.jsx` vẫn có hướng dẫn đăng nhập demo. Không tự xóa tài khoản, lịch sử hay seed vì cần quy tắc cấp quyền và dữ liệu khởi tạo thật của nhóm. README không còn đề nghị dùng tài khoản demo để khởi động hệ thống.
