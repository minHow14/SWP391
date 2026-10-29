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

BE dùng `authService` và `userRepository` để xác thực JWT, validate `user_id` là số nguyên hợp lệ với PostgreSQL, rồi đọc danh tính/quyền hiện tại từ DB. Token hết hạn, sai chữ ký, thiếu/sai claim hoặc tài khoản không còn tồn tại trả 401; tài khoản bị khóa, xóa mềm hoặc không hoạt động trả 403. Quyền trong JWT không thay thế quyền trong DB; thu hồi quyền admin có hiệu lực với cả token đã cấp. Lỗi DB không chuyển ngầm người gọi thành khách.

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

### Quota nghiệp vụ do BE quản lý

- Khách có 3 lượt/ngày mặc định (`GUEST_DAILY_LIMIT` trong BE), dùng chung cho chat, thực đơn và quét ảnh. Thành viên đăng nhập không giới hạn số lượt theo ngày.
- BE giữ lượt nguyên tử trước khi gọi AI. Hết quota trả `429 AI_QUOTA_EXCEEDED` kèm thời điểm mở lượt mới theo ngày Việt Nam, không gọi mô hình.
- Số lượt AI tự trả trong response không quyết định quota: sự kiện `done.remaining` được BE tính lại từ lần giữ lượt. FE chỉ hiển thị số liệu BE trả về; API xem quota không tiêu thụ lượt và không gọi AI.
- Mỗi lần giữ lượt lưu `reservationRevision` nội bộ. Admin reset đặt số lượt về 0 và tăng phiên bản trong cùng transaction audit; yêu cầu cũ thất bại sau reset không được hoàn nhầm lượt của yêu cầu mới.
- Cột `guest_quota.reservation_revision` được thêm bằng migration additive, mặc định 0 cho dữ liệu cũ. Reset giữ hàng quota thay vì xóa hàng để bảo toàn phiên bản. API public không trả trường này.

Giới hạn tần suất kỹ thuật `RATE_LIMIT` trong AI được giữ theo phạm vi chủ dự án đã chọn; nó không quản lý quota 3 lượt/ngày. Thay đổi lần này không chuyển giới hạn tần suất.

Nếu cả DB không thể ghi, BE trả `AI_STORAGE_ERROR`; bản ghi có thể còn `PROCESSING`. SSE không phải hàng đợi bền vững: tắt tiến trình BE giữa chừng không tự tiếp tục tác vụ. Lịch sử này lưu kết quả AI và không tự tạo các hàng `meal_plans`/`meal_plan_details`; thực đơn chỉ vào Nhật Ký khi người dùng bấm “Áp dụng vào Nhật Ký” (xem mục dưới).

## Áp dụng thực đơn AI vào Nhật Ký

Thực đơn tuần hoàn tất (`ai_generations.type = MEAL_PLAN`, `status = COMPLETED`) chỉ được ghi vào kế hoạch tuần của Nhật Ký khi thành viên bấm “Áp dụng vào Nhật Ký” trong hộp thoại thực đơn. Khách không có bản ghi `ai_generations` nên không có nút này.

- `POST /api/workspace/plan/apply-ai` (Bearer Token), body `{ "generationId": "<uuid>", "date": "YYYY-MM-DD" }`. BE kiểm tra bản ghi thuộc về người gọi, đúng loại và đã hoàn tất; sai một điều kiện trả `404`. Sai định dạng trả `400`, thiếu token trả `401`.
- Tuần áp dụng là tuần Thứ Hai–Chủ Nhật chứa `date` (FE gửi ngày hôm nay, múi giờ Việt Nam). `dayNumber` 1–7 của thực đơn ứng với Thứ Hai–Chủ Nhật, theo đúng thứ trong tuần chứ không theo ngày bắt đầu.
- Trong một transaction có khóa theo người dùng và tuần, BE tạo hoặc cập nhật `meal_plans` của tuần đó (tên, `end_date`, `target_calories`), **xóa toàn bộ `meal_plan_details` cũ của tuần** rồi ghi món mới. Nhật ký thực tế `food_diaries` không bị thay đổi. Ghi lại lần nữa cho cùng tuần không tạo bản sao.
- Mỗi món AI là một hàng `meal_plan_details` có `recipe_id = NULL`, `custom_food_name` (≤255 ký tự), `calories`, `protein`, `carbs`, `fat`; `meal_type` là `BREAKFAST`, `LUNCH`, `DINNER` hoặc `SNACK` (từ trường `snacks`).
- Response: `data = { planId, weekStart, appliedMeals }`.
- `GET /api/workspace/journal` trả thêm `customPlans[YYYY-MM-DD][breakfast|lunch|dinner|snack] = { name, calories, protein, carbs, fat }`. Món từ công thức vẫn nằm ở `plans`.
- `POST /api/workspace/plan/record` ghi cả món AI vào `food_diaries` (`custom_food_name`, `diary_nutrients`) và vẫn trả `409` nếu ngày đó đã có nhật ký.
- Để chạy test trên DB riêng, áp dụng migration `20261029030511_add_custom_meals_to_meal_plan_details` cho `vegetarian_db_test` bằng `prisma migrate deploy` với `.env.test`.

## API BE

| Endpoint | Quyền | Kết quả |
| --- | --- | --- |
| `GET /api/ai/usage` | Khách hoặc thành viên | Quota camelCase; thành viên `unlimited: true`, `remaining: null` |
| `POST /api/ai/chat/stream` | Khách hoặc thành viên | SSE `token`, `done`, `error` |
| `POST /api/ai/meal-planner/generate/stream` | Khách hoặc thành viên | SSE `progress`, `done`, `error` |
| `POST /api/ai/food-scanner/analyze` | Khách hoặc thành viên | Phân tích ảnh món ăn/bao bì; kết quả JSON chuẩn camelCase |
| `GET /api/v1/ai-generations` | Thành viên | Lịch sử của chính mình; `page`, `limit` (≤100), `type`, `status` |
| `GET /api/v1/ai-generations/:id` | Chủ sở hữu | Đầu vào, kết quả, trạng thái; người khác nhận 404 |
| `GET /api/v1/ai-logs`, `/stats` | Admin | Nhật ký/thống kê; phân trang trong `meta` |
| `GET`, `DELETE /api/v1/guest-quotas/:guestId` | Admin | Xem/reset quota có audit |
| `POST /api/admin/ai/chatbot-cache/clear` | Admin | Gọi AI nội bộ, báo lỗi thật nếu không xóa được |

API lịch sử không trả `promptMessages` chứa system prompt. Bộ lọc `type` nhận `CHAT`, `MEAL_PLAN`, `FOOD_SCAN`; danh sách bỏ `requestPayload.imageBase64` để không tải lại ảnh cho từng hàng, endpoint chi tiết vẫn giữ đầu vào gốc. Chỉ chủ sở hữu đọc được danh sách/chi tiết; đổi tài khoản hủy yêu cầu cũ và xóa nội dung riêng đang hiển thị.

Trong chat, thành viên mở **Lịch sử AI**, chọn Hỏi đáp hoặc Thực đơn, rồi mở bản ghi để khôi phục câu hỏi/câu trả lời hoặc thẻ thực đơn. Trang **Kiểm tra món** có lịch sử `FOOD_SCAN` riêng, gồm trạng thái chờ, hoàn tất hoặc thất bại; bấm bản ghi để xem lại kết quả/lỗi. Lịch sử phân trang 10 mục; chi tiết chỉ tải khi chọn. OpenAPI BE: [ai-openapi.json](ai-openapi.json). OpenAPI AI: `http://127.0.0.1:8000/openapi.json` khi chạy local.

## Quét ảnh và lưu nhật ký

`POST /api/ai/food-scanner/analyze` và alias `/api/v1/ai/food-scanner/analyze` nhận `imageBase64`, `mimeType`, `dietTypeId`, `scanType`, `dishName`, `allergies`. Ảnh sau giải mã tối đa **10 MiB (10,485,760 byte)**; base64 tối đa **13,981,016 ký tự**, JSON tối đa **14,046,552 byte** gồm 64 KiB phần còn lại. Chỉ hai route quét ảnh được tăng giới hạn JSON; các route khác vẫn 1 MiB. Payload quá giới hạn parser trả `413 PAYLOAD_TOO_LARGE`; base64/kích thước/tham số sai qua validator trả 422. AI kiểm tra thêm signature JPEG/PNG/WebP khớp MIME; model chịu trách nhiệm đọc ảnh.

Kết quả hợp lệ gồm `dishName`, `detectedScanType` (`LABEL`/`DISH`), `status` (`clear`/`warning`/`inconclusive`), `summary`, `findings`, `identifiedIngredients`, `restaurantChecklist`, `swapSuggestions`. Mỗi finding có `ingredient`, `reason`, `layer` 1–5 và `severity`. Trạng thái `clear` không được chứa finding `violation`. `nutritionEstimate` là `null`/không có hoặc object đủ `calories`, `protein`, `carbs`, `fat` với số hữu hạn không âm; thiếu số không được thay bằng 0.

Thiếu provider key, model không nhận ảnh hoặc provider lỗi: AI nội bộ trả `503 FOOD_SCAN_UNAVAILABLE`. JSON/kết quả model không hợp lệ: AI trả `502 FOOD_SCAN_INVALID_OUTPUT`. Gateway giữ lỗi provider an toàn ở `502 AI_PROVIDER_ERROR`; nếu response thành công nhưng sai contract thì `502 AI_INVALID_OUTPUT`. Khóa nội bộ lệch trả `503 AI_INTERNAL_AUTH_FAILED`; quá deadline trả `504 AI_TIMEOUT`. Các lỗi không tạo `COMPLETED`; thành viên có lịch sử `FAILED`, lượt khách được hoàn. Không sinh đậu phụ/nấm, calo hoặc ảnh placeholder khi lỗi. Client quét ảnh chờ tối đa 190 giây để bao phủ deadline BE mặc định 180 giây; nếu đổi `AI_TIMEOUT_MS`, cần giữ các budget phù hợp.

Với kết quả `clear`, **Lưu vào Nhật ký ăn uống** mở form xác nhận thay vì chuyển trang. Thành viên điền ngày, bữa ăn, tên món, khẩu phần, xác nhận 4 số dinh dưỡng từ AI nếu có và nhập chất xơ còn thiếu. Khi thiếu dinh dưỡng, form để trống và yêu cầu nhập số đã biết. Chỉ sau `POST /api/workspace/diary` thành công mới báo đã lưu; form giữ dữ liệu khi lỗi và chặn gửi lặp lúc đang lưu. Sau đó **Xem nhật ký** đọc lại qua `GET /api/workspace/journal`. Khách phải đăng nhập; lưu lịch sử AI không tự tạo món trong nhật ký.

## Video YouTube chạy nền

Thành viên gửi `POST /api/v1/video-recipe-summary-jobs` với `videoUrl`. Chấp nhận một link YouTube nấu ăn tiếng Việt tối đa 660 giây; job mới trả 202 và `data.jobId`. Gửi lại cùng nguồn/phiên bản của chính mình trả job hiện có; job hoàn tất trả 200. Job lỗi được thử lại qua `POST /api/v1/video-recipe-summary-jobs/{jobId}/retries`. Trạng thái là `PENDING` → `PROCESSING` → `COMPLETED`/`FAILED`; `stage` cho biết đang kiểm tra metadata, tải âm thanh, chuyển lời nói, sinh công thức hay lưu kết quả. Mỗi tài khoản chỉ có một job đang chờ/chạy.

`npm run dev` và `npm start` tại `server/` tự chạy worker cùng API, abort/đợi worker trước khi đóng kết nối Prisma. Lệnh `npm run worker:video-recipes` vẫn dùng được riêng; lease trong DB ngăn hai worker cùng giữ một job. Sau khi cài requirements AI, đặt `YT_DLP_PATH` ở BE thành executable yt-dlp có trên PATH hoặc đường dẫn tuyệt đối tới venv AI; AI cần `GROQ_API_KEY`, DeepSeek key và yt-dlp/FFmpeg (đã có trong dependencies). Các timeout/lease/retry nằm trong `server/.env.example`, các giới hạn media/provider nằm trong `ai_service/.env.example`. Không cần thêm hệ thống hàng đợi hay dịch vụ ngoài máy local.

BE lưu job và transcript vào `video_recipe_summary_jobs`, công thức vào `video_recipe_summaries`. Client đọc `GET /api/v1/video-recipe-summary-jobs` (phân trang, lọc `status`/`videoId`), `GET /api/v1/video-recipe-summary-jobs/{jobId}` và `GET /api/v1/video-recipe-summaries/{summaryId}`. API luôn kiểm tra chủ sở hữu, người khác nhận 404. Mở chat sau reload khôi phục tối đa 10 job gần nhất cộng tác vụ còn hoạt động, tải công thức của job hoàn tất và hiển thị lỗi/thử lại cho job thất bại. Đóng tab không hủy job bền vững; giới hạn này khác luồng SSE của chat/thực đơn.

Nếu Groq chưa có request, kiểm tra job/stage và log worker trước: job còn `PENDING` cần tiến trình BE/worker chạy đúng DB; `VALIDATING_VIDEO` cần yt-dlp hoạt động và truy cập YouTube. Groq chỉ được gọi sau metadata và tải/giải mã âm thanh. Khi khởi động lại, worker nhận lại job đủ điều kiện theo lease/retry; không seed hoặc reset DB để sửa hàng chờ. Không requeue hàng loạt hay xóa dữ liệu lịch sử để thử lại.

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

Script khởi chạy app FastAPI thật trên port loopback tạm, dùng khóa khác BE để kiểm tra chat/thực đơn/quét ảnh, hoàn quota, lịch sử `FAILED` và xóa cache; sau đó khởi động lại AI với khóa khớp để xác nhận phục hồi và quét ảnh thiếu provider key không tạo thành công giả. Chỉ ghi DB `_test`, không đọc/ghi DB phát triển, không gọi DeepSeek và tự dừng tiến trình con. Mặc định dùng `ai_service/venv`; nếu Python ở nơi khác, đặt biến `AI_TEST_PYTHON` trỏ tới executable phù hợp.
