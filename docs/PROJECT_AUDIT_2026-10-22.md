<!-- docs/PROJECT_AUDIT_2026-10-22.md -->
# Rà soát ChayXanh ngày 22/10/2026

## Phạm vi và kết luận

Đã rà soát cấu hình, dependency, schema, migration, seed, xác thực, API, luồng catalog/nhật ký, giao tiếp AI, frontend và cấu hình kiểm thử của ba service. Đây là rà soát mã nguồn kết hợp các kiểm tra chạy được trên máy hiện tại; chưa phải xác nhận toàn bộ nghiệp vụ chạy đúng với PostgreSQL thật hoặc nhà cung cấp AI thật.

Lỗi được cung cấp có nguyên nhân xác định: runner gọi sai tên Prisma delegate sau khi SQL đã được commit. Có thêm vấn đề nghiêm trọng hơn về seed xóa dữ liệu, dữ liệu khởi tạo không đúng quy định, runtime kiểm thử và tính dinh dưỡng.

Chỉ tạo báo cáo này. Không chạy seed, reset, migration hoặc ghi vào database. Ba file `server/.env.example`, `server/.env.test.example`, `ai_service/.env.example` đã ở trạng thái bị xóa trong working tree trước khi bắt đầu; chưa khôi phục hoặc sửa chúng.

## 1. Nguyên nhân lỗi seed

- `server/prisma/seed.js:163` gọi `prisma.ai_logs.count()`.
- `server/prisma/schema.prisma:372` khai báo `model AiLog` và ánh xạ bảng bằng `@@map("ai_logs")`.
- Prisma Client hiện có `aiLog.count`; không có delegate `ai_logs`.
- Kiểm tra trực tiếp client đã generate cho kết quả: `aiLogDelegate = object`, `oldAiLogsDelegate = undefined`, `count = function`. Cả 34 model trong schema đều có trong client đã generate.

Sửa trực tiếp cần thực hiện là đổi lời gọi thành `prisma.aiLog.count()`. Không cần đổi tên bảng hoặc tạo migration cho thay đổi này. Generate client lại sau khi cài dependency là bước chuẩn bị hợp lý, nhưng không tự sửa được tên gọi sai trong mã nguồn.

Transaction SQL ở dòng 109 đã hoàn tất trước phần thống kê. Vì vậy, theo luồng mã nguồn và log được cung cấp, dữ liệu SQL đã commit trước khi tiến trình trả exit code 1. Không thể suy ra database rỗng hoặc import SQL thất bại từ exit code đó. Chưa truy cập database của runner để xác minh số lượng bản ghi.

Log thành công ở dòng 126 xuất hiện trước kiểm tra thống kê và mật khẩu. Ngoài ra, `process.exit(1)` trong catch có thể kết thúc tiến trình trước khi cleanup bất đồng bộ ở finally hoàn tất. Nên kiểm tra điều kiện cần trước khi ghi, chỉ thông báo hoàn tất sau xác thực, dùng `process.exitCode = 1` và disconnect trong finally.

## 2. Các vấn đề cần xử lý theo ưu tiên

### P1 — Seed thông thường đang xóa dữ liệu nghiệp vụ

`server/prisma/seed.sql:20–54` chạy `TRUNCATE ... CASCADE` trên người dùng, bài đăng, nhật ký, thực đơn và nhiều bảng khác. CASCADE còn có thể đưa bảng phụ thuộc vào phạm vi truncate. Đây không phải cơ chế upsert bảo toàn dữ liệu theo `server/AGENTS.md`.

**Hướng xử lý:** Seed thường chỉ tạo/cập nhật dữ liệu nền đã được duyệt qua Prisma upsert và khóa duy nhất ổn định. Loại bỏ truncate khỏi lệnh seed thường. Nếu còn nhu cầu dựng lại dữ liệu test, đặt trong công cụ test riêng có kiểm tra chặt database đích; không dùng lệnh này trên DB phát triển cần giữ dữ liệu. Không chạy lại seed hiện tại để thử bản sửa trên DB đang có dữ liệu.

### P1 — Dữ liệu khởi tạo và ảnh thay thế vi phạm No Mock Data

`seed.sql` chứa tài khoản với mật khẩu chung `123456`, lịch sử sức khỏe/tương tác và bản ghi AI cố định. `seed.js:183–202` kiểm tra và công bố tài khoản mẫu. Kiểm tra hash ngoại tuyến xác nhận cả chín hash đều khớp mật khẩu chung. Những bản ghi như AI log không nên được nạp như sự kiện vận hành thật.

`server/prisma/import-ingredient-images.js:13,62–65` dùng `DUMMY_PNG` 1×1 khi không tìm/tải được ảnh. Thư mục ảnh local lại bị bỏ qua trong Git, nên checkout mới phụ thuộc vào tải ảnh trực tuyến và có thể âm thầm nhận ảnh giả.

**Hướng xử lý:** Loại dữ liệu mô phỏng khỏi seed chạy thật; tách fixture kiểm thử. Chỉ nhập danh mục và ảnh có nguồn được xác nhận. Thiếu ảnh thì trả trạng thái thiếu ảnh hoặc lỗi có thông tin rõ ràng; frontend dùng empty state. Không thay bằng ảnh 1×1 để kiểm thử đạt. Không tự tạo tài khoản quản trị hoặc tự chọn thông tin đăng nhập thay người dùng. Cần xác nhận nguồn dữ liệu và thông tin bootstrap trước khi triển khai phần đó.

### P1 — Runtime hiện tại không khớp cấu hình Node 20

Đọc manifest dependency đã cài cho thấy:

| Dependency | Phiên bản hiện có | Yêu cầu Node |
| --- | --- | --- |
| client/react-router | 8.4.0 | >=22.22.0 |
| server/vitest | 5.0.3 | ^22.12.0 hoặc ^24.0.0 hoặc >=26.0.0 |
| client/vite | 8.3.3 | ^20.19.0 hoặc >=22.12.0 |

Workflow hiện dùng Node 20 ở cả client và server. Vì thế việc sửa seed chưa giải quyết tính tương thích runtime của các bước phía sau. Các kiểm tra thành công trong lần rà soát này chạy bằng Node 24.21.0.

**Hướng xử lý:** Với bộ dependency hiện tại, chuẩn hóa một phiên bản Node 24 cụ thể cho local và tài liệu, khai báo engines và giữ lockfile đồng bộ. Nếu bắt buộc giữ Node 20 thì phải chọn lại bộ dependency tương thích và kiểm thử lại; không chỉ đổi phiên bản khai báo. Báo cáo không tạo hoặc chỉnh sửa DevOps/CI.

### P1 — Database trong workflow không vượt qua hàng rào bảo vệ test

`.github/workflows/ci.yml:73` đặt `DATABASE_URL` trỏ đến `vegetarian_db`. `server/tests/loadTestEnvironment.js:6` từ chối database không có hậu tố `_test`. Sau khi vượt qua seed, bước `npm test` với môi trường hiện khai báo vẫn gặp điều kiện này, độc lập với vấn đề runtime.

Workflow dùng `prisma db push`, trong khi local đã có ba migration và helper test dùng `migrate deploy`. Hai đường khởi tạo này không kiểm chứng cùng một lịch sử migration. `test:prepare` chỉ nạp `seed.sql`, không chạy các bước repair/import ảnh của `seed.js`; ảnh trong DB test cần chuẩn bị riêng.

**Hướng xử lý:** Giữ nguyên guard `_test`; chuẩn bị PostgreSQL test riêng; dùng migration thật và fixture kiểm thử tách khỏi dữ liệu chạy thật. Kiểm tra ảnh thật trong bài integration riêng. Không bỏ guard để làm test chạy qua. Việc thay đổi workflow nằm ngoài phạm vi local hiện được cho phép.

### P1 — Tính macro dùng sai đơn vị và có thể ghi sai nhật ký

`server/src/services/workspace.service.js:58,363` tính macro bằng `nutrientPer100g × quantity / 100` mà không kiểm tra `unit`. `seed.sql:400` trở đi có đơn vị `trái`, `quả`, `ổ`, `ml` bên cạnh `gram`. Một trái có quantity bằng 1 sẽ bị tính như 1 gram. Luồng ghi kế hoạch vào nhật ký cũng dùng phép tính này nên sai số được lưu xuống DB. Fiber được khởi tạo bằng 0 trong khi dữ liệu nguyên liệu chưa đủ để tính giá trị thật.

**Hướng xử lý:** Chuẩn hóa khối lượng ăn được theo gram hoặc lưu chuyển đổi theo nguyên liệu/khẩu phần có nguồn đáng tin cậy. Không tự suy ra mọi trái/quả có cùng trọng lượng, hoặc mọi ml tương đương một gram. Khi thiếu dữ liệu, thể hiện chưa đủ dữ liệu thay vì gán số 0 như kết quả đo. Cần thống nhất quy tắc khẩu phần và nguồn chuyển đổi trước khi sửa nghiệp vụ.

### P2 — Hợp đồng API, Prisma và frontend chưa thống nhất

Nhiều field Prisma vẫn là `user_id`, `full_name`, `created_at`, trong khi một số model AI đã dùng camelCase với `@map`. API hiện có cả `/api/...` và `/api/v1/...`; một số response vừa bọc `data` vừa trải payload ở root (`server/src/utils/apiResponse.js`).

Frontend có Axios instance tại `apiClient.js`, fetch thường tại `api.js` và transport SSE riêng. `api.js:11` không ưu tiên `message`; cả helper fetch và interceptor Axios đều có thể làm mất `errorCode`, HTTP status và lỗi theo field khi chuyển thành `Error` thường.

**Hướng xử lý:** Chuẩn hóa tên field Prisma bằng `@map` để giữ tên cột vật lý; chuẩn hóa DTO và API theo từng miền có kiểm thử tương thích. Không đổi hàng loạt response trước khi cập nhật consumer. Dùng một lớp lỗi và xác thực chung cho HTTP thường; giữ fetch streaming cho SSE nếu cần, nhưng dùng chung quy tắc identity/error. Không cần ép SSE vào Axios.

### P2 — Xác thực và cấu hình còn lệch tiêu chuẩn dự án

`server/src/config/index.js` chỉ kiểm tra một phần biến môi trường khi production; môi trường khác có JWT secret mặc định cố định. Access token mặc định sống bảy ngày. Client lưu token trong sessionStorage; interceptor xử lý 401 bằng xóa phiên, chưa có refresh token qua cookie httpOnly theo quy định backend/frontend.

**Hướng xử lý:** Validate cấu hình bắt buộc bằng Zod ở mọi môi trường, phân biệt cấu hình tính năng AI tùy chọn với khóa xác thực bắt buộc. Xóa secret mặc định, dùng access token ngắn hạn và refresh token có rotation/revocation nếu triển khai đầy đủ chính sách hiện quy định. Việc này cần thay đổi đồng bộ BE/FE, không ghép vào bản sửa một dòng của seed.

### P2 — Catalog chưa phân trang và tải lại toàn bộ quá rộng

`server/src/repositories/workspace.repository.js:5` tải toàn bộ công thức, bài đăng, bình luận, votes, nhà hàng và reviews. `DatabaseProvider.jsx` tải catalog chung và tải lại khi nhận sự kiện đồng bộ. Nhiều query không có giới hạn hoặc thứ tự phụ theo ID. Dữ liệu tăng sẽ làm response nặng, tăng thời gian truy vấn và bộ nhớ dù người dùng chỉ mở một màn hình.

**Hướng xử lý:** Giữ bootstrap catalog nhỏ cho danh mục ít thay đổi; phân trang feed/công thức/nhà hàng, tải bình luận theo nhu cầu, truy vấn tổng vote thay vì trả toàn bộ votes. Dùng thứ tự ổn định và refresh đúng miền dữ liệu thay đổi.

### P2 — AI tự bổ sung tuổi và nhận BMI mà chưa đối chiếu

`ai_service/api/meal_planner.py:44` mặc định tuổi 25; `core/nutrition.py:93` cũng thay tuổi trống bằng 25. Dòng 94 ưu tiên BMI request gửi lên thay vì luôn tính lại từ chiều cao/cân nặng. Đây là giả định có ảnh hưởng đến kết quả cá nhân hóa.

**Hướng xử lý:** Quy định trường nào bắt buộc và cách xử lý khi thiếu hồ sơ; yêu cầu bổ sung thông tin trước khi tính nếu nghiệp vụ cần tuổi. Tính lại hoặc kiểm tra BMI từ dữ liệu đầu vào. Chưa tự thay quy tắc dinh dưỡng hoặc đặt hệ số mới trong lần rà soát này.

### P3 — Cấu trúc, tài liệu và chất lượng mã nguồn

- Client thực tế dùng React 19, trong khi hướng dẫn gốc ghi React 18 và hướng dẫn client cho phép 18+. Cần chốt phiên bản mục tiêu và cập nhật quy định tương ứng; không tự hạ React trong bản sửa seed.
- Thư mục thực tế là `ai_service/`, khác tên `ai-service/` trong AGENTS; code AI cũng chưa theo cấu trúc `app/` được mô tả. Chưa có lý do đổi tên trong bản sửa sự cố.
- Nhiều bảng dùng integer/composite key, thiếu timestamp chuẩn; điều này lệch quy định UUID/timestamp. Không chuyển UUID hàng loạt trên DB đang có dữ liệu chỉ để tuân thủ hình thức: cần lộ trình tương thích, đánh giá FK và xác nhận trước thay đổi có rủi ro.
- Import ảnh còn `CREATE TABLE IF NOT EXISTS` trong script dữ liệu; schema phải được quản lý bởi migration.
- Ruff báo 20 lỗi I001 sắp xếp import. Backend chưa có script lint/format và Pino như quy định. Có file/component/service dài, cần tách theo trách nhiệm trong các phase sau.
- README còn hướng dẫn copy các `.env.example` hiện đang bị xóa ở working tree; một số tài liệu và dữ liệu tài khoản mẫu không đồng nhất. Cần xác định chủ đích các thay đổi đang có trước khi khôi phục.

## 3. Kết quả kiểm chứng

| Kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| Client `npm test` | 66/66 pass | Node Test Runner; không chứng minh toàn bộ UI qua trình duyệt |
| Client `npm run lint` | Pass | ESLint hiện có |
| Client `npm run build` | Pass | Node 24.21.0, dependency local |
| Prisma validate | Pass | Không chứng minh migration đã áp dụng đúng vào DB thật |
| Schema/client | Đủ 34 model; delegate sai được tái hiện | Không chạy query DB |
| Hash mật khẩu seed | 9/9 khớp mật khẩu chung | Kiểm tra ngoại tuyến |
| Backend 6 file không cần DB thật | 45/45 pass | app, sseParser, internalApiKey, ingredients, ingredientImages, places |
| Backend `npm test` mặc định | Dừng ở guard `_test` | Không có `.env.test` phù hợp; chưa chạy toàn bộ integration |
| AI pytest | 112/112 pass; 4 deprecation warning của SlowAPI | Python 3.14.7 local; provider được thay thế trong test, chưa kiểm chứng Python 3.11 của workflow |
| AI Ruff | 20 lỗi I001 | Chưa tự động sửa |
| Python syntax | 37 file dự án không có SyntaxError | Không tính venv |

Một số test HTTP ban đầu bị sandbox chặn cổng local/lưu file tạm; chạy lại ngoài sandbox thành công. Không tính các lỗi sandbox này là lỗi ứng dụng. Backend unit test được chạy với URL database không hoạt động ở port 1 để tránh truy cập DB thật. Chưa chạy `npm ci` trên checkout sạch, kiểm tra migration drift qua DB thật, integration BE–AI trực tiếp hoặc suy luận với provider thật.

## 4. Lộ trình xử lý đề xuất

### Phase 1 — Ổn định database và backend

1. Sửa delegate `aiLog`, kiểm tra trước khi ghi, thông báo hoàn tất đúng thời điểm, cleanup tiến trình đúng cách.
2. Tách seed dữ liệu nền khỏi fixture test; loại truncate, tài khoản mẫu và sự kiện AI mô phỏng khỏi seed thường. Chỉ triển khai nội dung seed khi có nguồn dữ liệu và thông tin bootstrap được xác nhận.
3. Bỏ ảnh 1×1; tách import tài nguyên khỏi seed tối thiểu; bỏ DDL trong script nhập dữ liệu.
4. Chuẩn hóa runtime local; bảo toàn guard test DB và chuẩn bị test theo migration.
5. Xử lý quy đổi đơn vị sau khi chốt nghiệp vụ; bắt đầu chuẩn hóa field/API theo phạm vi nhỏ, giữ tương thích.

File trọng tâm dự kiến: `server/prisma/seed.js`, `server/prisma/seed.sql`, `server/prisma/import-ingredient-images.js`, `server/prisma/repair-ingredients.js`, `server/prisma/schema.prisma`, `server/src/config/index.js`, `server/src/services/workspace.service.js`, `server/src/repositories/workspace.repository.js`, `server/package.json`. Migration chỉ bổ sung nếu cần thay đổi cấu trúc đã được đánh giá; không tạo migration cho việc sửa delegate.

Tiêu chí nghiệm thu: seed chạy hai lần trên DB test riêng mà không mất dữ liệu người dùng; lỗi validation được phát hiện trước ghi; không có ảnh giả; seed chỉ báo thành công khi xác thực hoàn tất. Việc áp dụng lên DB đang có dữ liệu phải được kiểm tra và sao lưu trước.

### Phase 2 — Đồng bộ AI và frontend

1. Chuẩn hóa response/error, identity và naming giữa các service.
2. Hoàn thiện auth/refresh flow đồng bộ nếu áp dụng chính sách hiện quy định.
3. Bổ sung UI thiếu ảnh/thiếu dữ liệu dinh dưỡng, phân trang và tải theo màn hình.
4. Loại mặc định tuổi không được xác nhận; kiểm tra BMI và dữ liệu hồ sơ ở biên API.

File trọng tâm: `client/src/services/apiClient.js`, `client/src/services/api.js`, `client/src/services/aiApi.js`, `client/src/context/DatabaseProvider.jsx`, các màn hình chịu ảnh hưởng; `ai_service/api/meal_planner.py`, `ai_service/core/nutrition.py` và schema liên quan.

Tiêu chí nghiệm thu: BE/FE/AI dùng cùng hợp đồng; lỗi giữ nguyên mã và field; trạng thái loading/error/empty/success rõ ràng; không sinh dữ liệu cá nhân hóa từ thông tin tự đặt.

### Phase 3 — Kiểm thử hồi quy và tài liệu

1. Bổ sung regression test cho delegate, seed chạy lặp và rollback khi validation thất bại.
2. Kiểm tra migration từ DB test rỗng, tính dinh dưỡng theo gram/ml/khẩu phần, luồng auth và SSE.
3. Chạy đầy đủ backend integration với PostgreSQL `_test`, client test/lint/build, AI test/lint.
4. Cập nhật README đủ 14 mục, env template theo chủ đích thay đổi hiện có, API/OpenAPI và ERD. Thống nhất phiên bản runtime, tên service và các ngoại lệ schema nếu được chấp thuận.

Theo AGENTS gốc, khi bắt đầu triển khai phải dừng sau mỗi phase và xin xác nhận trước phase kế tiếp. Không tự thêm hoặc chỉnh sửa Docker, CI/CD hay cấu hình triển khai trong lộ trình local này. Bộ workflow hiện có chỉ được đọc để chẩn đoán lỗi người dùng cung cấp.

## Khuyến nghị thực hiện

Ưu tiên bản sửa backend nhỏ cho lỗi delegate và độ an toàn seed trước; sau đó xử lý phép tính đơn vị và các thay đổi hợp đồng theo phase. Không chạy lại seed hiện tại trên DB có dữ liệu cần giữ, không reset DB để chữa lỗi JavaScript, và không thay toàn bộ schema/UUID trong một lần.
