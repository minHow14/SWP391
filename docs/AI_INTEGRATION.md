# AI gateway, prompt và kết quả

FE → BE (`/api/ai`) → AI Service (`/api`). Chỉ BE truy cập PostgreSQL. AI không dùng PostgreSQL, SQLite, JWT hoặc khóa database. BE xác thực JWT người dùng, quota khách và quyền admin; AI kiểm tra `X-Internal-Api-Key` dùng chung. Không đưa khóa này vào biến `VITE_*`.

## Khóa nội bộ BE → AI

Hai service dùng cùng `INTERNAL_API_KEY`: **32–256 ký tự ASCII hiển thị (mã 33–126), không khoảng trắng, không Unicode hoặc ký tự điều khiển**. Khóa được giữ nguyên, không tự trim hay đổi hoa/thường. Dùng giá trị ngẫu nhiên, ví dụ sinh 32 byte bằng `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`, rồi đặt cùng kết quả vào hai file `.env`. Không commit hoặc ghi giá trị khóa vào log. Khóa test dùng giá trị riêng.

AI bắt buộc có khóa hợp lệ khi khởi động; BE từ chối khởi động nếu biến có giá trị sai định dạng. Nếu BE không khai báo biến này, các chức năng khác vẫn hoạt động nhưng yêu cầu AI nhận `503 AI_NOT_CONFIGURED` trước khi giữ quota hoặc tạo lịch sử. AI dùng so sánh constant-time sau khi kiểm tra định dạng header; khóa thiếu/sai định dạng/sai giá trị đều trả `401 UNAUTHORIZED_INTERNAL`, không chạy inference. Lỗi validation cấu hình AI ẩn giá trị đầu vào và repr không chứa khóa.

| Tình huống | Phản hồi của BE | Lưu trữ/quota |
| --- | --- | --- |
| BE chưa cấu hình khóa | `503 AI_NOT_CONFIGURED` | Không giữ quota, không tạo generation |
| AI trả `401`/`403` do xác thực nội bộ | `503 AI_INTERNAL_AUTH_FAILED` | Hoàn quota về ngày đã giữ; generation thành viên `FAILED`, audit `ERROR` |
| AI gặp lỗi provider | `502 AI_PROVIDER_ERROR` | Xử lý thất bại và hoàn quota |

BE không chuyển nội dung response lỗi xác thực từ AI ra FE hay DB; audit lưu mã lỗi, phản hồi FE có `meta.requestId` và thông báo an toàn. Xóa cache cũng giữ nguyên mã lỗi nội bộ, không báo thành công khi hai bên lệch khóa.

Khi đổi khóa local: cập nhật cùng giá trị trong `server/.env` và `ai_service/.env`, khởi động lại BE và AI vì cấu hình được nạp khi khởi động. Kiểm tra bằng test HTTP bên dưới; không giải quyết lỗi lệch khóa bằng cách bỏ xác thực.

## Xác thực và phân quyền

BE dùng `authenticationService` và `userRepository` để xác thực JWT, validate `user_id` là số nguyên hợp lệ với PostgreSQL, rồi đọc danh tính/quyền hiện tại từ DB. Token hết hạn, sai chữ ký, thiếu/sai claim hoặc tài khoản không còn tồn tại trả 401; tài khoản bị khóa, xóa mềm hoặc không hoạt động trả 403. Quyền trong JWT không thay thế quyền trong DB; thu hồi quyền admin có hiệu lực với cả token đã cấp. Lỗi DB không chuyển ngầm người gọi thành khách.

Chỉ yêu cầu không có Authorization mới đi theo luồng khách. BE tự tạo header gọi AI từ danh tính đã kiểm tra: `X-User-Id` hoặc `X-Guest-Id`, kèm khóa nội bộ và request ID. Header `X-User-Id`, `X-User-Role`, `X-Internal-Api-Key` do FE tự gửi không quyết định quyền và không được chuyển tiếp nguyên trạng. JWT người dùng không được gửi sang AI.

AI không có `user_role`, không đọc `X-User-Role`, không xác thực JWT hoặc quyết định quyền admin. Định danh nhận từ BE chỉ phục vụ xử lý/log nội bộ sau khi khóa nội bộ đã được kiểm tra. Các hành động quản trị nội bộ như xóa cache chỉ được BE gọi sau `authenticate` và `authorize(ADMIN)`. API lịch sử ở BE luôn lọc theo user đã xác thực.

## Sinh kết quả và lưu lịch sử

Giữ SSE theo quyết định của chủ dự án, là ngoại lệ đã được chấp thuận cho quy tắc Job 202 trong `server/AGENTS.md`. Tác vụ có thể kéo dài hơn 3 giây; giới hạn tổng thời gian do `AI_TIMEOUT_MS` trên BE quyết định.

1. BE validate đầu vào camelCase và xác thực người gọi. JWT không hợp lệ bị từ chối; không chuyển ngầm sang khách.
2. Với thành viên đăng nhập, BE tạo `ai_generations` trạng thái `PROCESSING`, lưu `requestPayload` đã validate (gồm giá trị mặc định của BE).
3. AI gửi sự kiện nội bộ `metadata` gồm `modelName`, `attempt`, `messages: [{role, content}]`. Chat dùng cùng danh sách messages để inference; thực đơn ghi mỗi lần thử lại cùng feedback. `modelName` là tên model chính được cấu hình; nếu SDK chuyển sang model dự phòng, metadata này không xác định riêng model dự phòng thực sự đã trả kết quả.
4. BE lưu từng snapshot prompt vào `promptMessages` trước khi xử lý sự kiện tiếp theo. Metadata không chuyển đến FE và không ghi vào console.
5. Chat ghép token thành `{reply}`; thực đơn lưu toàn bộ `data`, bao gồm `weeklyPlan`, thông tin dinh dưỡng, danh sách mua sắm và `chat`.
6. BE ghi `COMPLETED`, `responsePayload`, `completedAt` và log `SUCCESS` trong cùng transaction, rồi mới gửi `done` kèm `meta.generationId`. Thiếu prompt của thành viên thì không báo thành công.
7. Khi AI lỗi, timeout, mất kết nối hoặc khách đóng luồng, BE ghi `FAILED`, mã/thông báo lỗi an toàn và log `ERROR`. Prompt đã nhận vẫn được giữ. Không trả SQL, provider error hay stack trace ra FE.

Khách chỉ có quota và nhật ký vận hành `ai_logs`; không tạo `ai_generations`, không gán khách vào tài khoản giả. Quota chat/thực đơn dùng chung theo ngày Việt Nam, reserve nguyên tử; lỗi được hoàn lượt về đúng ngày đã reserve. Admin reset quota và audit chạy cùng transaction.

Nếu cả DB không thể ghi, BE trả `AI_STORAGE_ERROR`; bản ghi có thể còn `PROCESSING`. SSE không phải hàng đợi bền vững: tắt tiến trình BE giữa chừng không tự tiếp tục tác vụ. Lịch sử này lưu kết quả AI, không tự tạo các hàng `meal_plans`/`meal_plan_details` của chức năng lịch ăn.

## API BE

| Endpoint | Quyền | Kết quả |
| --- | --- | --- |
| `GET /api/ai/usage` | Khách hoặc thành viên | Quota camelCase; thành viên `unlimited: true`, `remaining: null` |
| `POST /api/ai/chat/stream` | Khách hoặc thành viên | SSE `token`, `done`, `error` |
| `POST /api/ai/meal-planner/generate/stream` | Khách hoặc thành viên | SSE `progress`, `done`, `error` |
| `GET /api/v1/ai-generations` | Thành viên | Lịch sử của chính mình; `page`, `limit` (≤100), `type`, `status` |
| `GET /api/v1/ai-generations/:id` | Chủ sở hữu | Đầu vào, kết quả, trạng thái; người khác nhận 404 |
| `GET /api/v1/ai-logs`, `/stats` | Admin | Nhật ký/thống kê; phân trang trong `meta` |
| `GET`, `DELETE /api/v1/guest-quotas/:guestId` | Admin | Xem/reset quota có audit |
| `POST /api/admin/ai/chatbot-cache/clear` | Admin | Gọi AI nội bộ, báo lỗi thật nếu không xóa được |

API lịch sử không trả `promptMessages` chứa system prompt. UI lịch sử chưa được thêm; kết quả có thể đọc lại qua API. OpenAPI BE: [ai-openapi.json](ai-openapi.json). OpenAPI AI: `http://127.0.0.1:8000/openapi.json` khi chạy local.

## Migration local ngày 22/10/2026

DB đã có `ai_generations`, enum và index nhưng file Prisma bị mất sau merge. Model `AiGeneration` ánh xạ lại đúng bảng/cột hiện có, giữ `userId` dạng số nguyên tương thích `users.user_id` của dự án.

Hai migration cũ `0_baseline` và `20261022022957_add_ai_generations` không còn SQL gốc. Backup ngày 21/10 có trước các migration này. Theo chấp thuận của chủ dự án, bảng lịch sử cũ được chuyển nguyên vẹn sang `prisma_history_20261022._prisma_migrations`; baseline mới `0_recovered_baseline` được ghi nhận là đã áp dụng mà không chạy lại CREATE TABLE trên DB đang có dữ liệu. Migration `restore_post_attachments` chỉ tạo bảng attachment, index và FK bị thiếu sau pull. Không reset, không seed lại DB phát triển. Số hàng users/posts/recipes/ai_generations/ai_logs/guest_quota/ingredient_images được đối chiếu trước/sau và giữ nguyên.

DB mới: chạy `npx prisma migrate deploy`. DB đã có bảng nhưng lịch sử cũ khác: kiểm tra drift và thống nhất baseline trước; không chạy `db push` hoặc chấp nhận reset. Không chạy baseline SQL trực tiếp trên DB đã có dữ liệu. Schema lưu trữ migration cũ nằm ngoài `public`, không thuộc schema ứng dụng.

## Kiểm thử

Tạo `server/.env.test` từ `.env.test.example` với DB local kết thúc bằng `_test`, key ngẫu nhiên và đường dẫn `psql` phù hợp. `npm run test:prepare` xóa/tạo lại **chỉ schema public của DB test**, áp dụng toàn bộ migration rồi seed SQL. Không chạy lệnh này lên DB cần giữ dữ liệu.

Backend Vitest/Supertest dùng PostgreSQL test thật, thay provider bằng fetch fixture trong test. AI Pytest thay mô hình trong test; không tiêu thụ API DeepSeek thật. Có test lưu đủ 7 ngày, prompt retry, lỗi SSE, timeout, hủy, rollback, quota đồng thời/qua ngày và quyền sở hữu. Integration ảnh cần 28 ảnh thật được import vào DB test trước khi chạy; không tạo ảnh giả để pass.

AI dependencies được ghim theo môi trường đã kiểm thử. Không cần cài package SQL/JWT cho AI; file SQLite local cũ không được đọc/ghi hay đưa vào Git.

### Integration HTTP với khóa lệch

Sau khi cài dependencies BE và Python venv, tạo `.env.test` và chuẩn bị DB test:

```powershell
cd server
npm run test:ai-internal-auth
```

Script khởi chạy app FastAPI thật trên port loopback tạm, dùng khóa khác BE để kiểm tra chat/thực đơn, hoàn quota, lịch sử `FAILED` và xóa cache; sau đó khởi động lại AI với khóa khớp để xác nhận phục hồi. Chỉ ghi DB `_test`, không đọc/ghi DB phát triển, không gọi DeepSeek và tự dừng tiến trình con. Mặc định dùng `ai_service/venv`; nếu Python ở nơi khác, đặt biến `AI_TEST_PYTHON` trỏ tới executable phù hợp.
