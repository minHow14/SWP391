# Kiểm duyệt nội dung cộng đồng

Tính năng kiểm tra **văn bản bài blog, video, bình luận** và **ảnh tải lên kèm bài** (ảnh đính kèm blog, ảnh bìa video tự upload) bằng DeepSeek qua AI Service. Express lưu nội dung và job trong cùng transaction; worker local gọi AI qua HTTP ngoài transaction. AI không đọc PostgreSQL. Không thêm Redis, dịch vụ hàng đợi hay công cụ triển khai.

## Quy tắc đường dẫn media

| Trường | Chấp nhận | Từ chối (`400`) |
| --- | --- | --- |
| `attachments[].url` (blog) | Chỉ đường dẫn do `POST /api/v1/upload/post-media` trả về: `/uploads/posts/<tên>.<jpg\|jpeg\|png\|webp\|gif\|mp4\|webm\|ogg>` | Mọi link ngoài (`https://…`), thư mục khác, `..`, query string |
| `video_url` (video) | Link YouTube HTTPS: `watch?v=`, `youtu.be/`, `shorts/`, `embed/`; không kèm playlist. Lưu dạng chuẩn `https://www.youtube.com/watch?v=<id>` | Vimeo, link `http://`, file `.mp4`, link có `list=` |
| `thumbnail_url` (video) | Rỗng/null, ảnh `/uploads/posts/…` tự upload, hoặc `https://img.youtube.com/vi/<id>/…`, `https://i.ytimg.com/vi/<id>/…` | Link ảnh ngoài khác |

Quy tắc chỉ áp khi tạo/sửa. Dữ liệu cũ không bị đổi; lần sửa sau phải gửi đường dẫn hợp lệ. Ảnh tải lên tối đa 10 MB (video file 50 MB) và được kiểm tra chữ ký file khi upload.

## Chính sách đã chốt

| Nội dung | Hướng xử lý |
| --- | --- |
| Sườn chay/thịt chay từ nấm, đậu nành; nấm đùi gà | Cho phép khi văn bản nêu rõ là chay/nguyên liệu thực vật |
| Món chay có trứng/sữa/mật ong | Cho phép theo chính sách cộng đồng, không áp chế độ thuần chay cá nhân |
| Chia sẻ chuyển từ món thịt sang món chay; phủ định “không dùng thịt/cá” | Cho phép khi ngữ cảnh rõ ràng |
| Nhắc tới món/thực phẩm từ thịt, cá, hải sản, kể cả chỉ có tên món (“Cá kho tộ”, “Gà rán”, “Sườn kho”, “thịt bò”) | Đề nghị Admin xem xét |
| Spam, lừa đảo, công kích; mô tả chay mâu thuẫn với thành phần động vật | Đề nghị Admin xem xét khi có dấu hiệu trong nội dung |
| Phân vân, ngữ cảnh không rõ ràng | Đề nghị Admin xem xét (`REVIEW` chỉ tạm ẩn, không xóa hay phạt) |

Chính sách hiện tại: `vegetarian-community-v2` (văn bản), `vegetarian-community-image-v1` (ảnh).

`REVIEW` yêu cầu lý do, ít nhất một phân loại và bằng chứng trích nguyên văn từ tiêu đề/nội dung. `ALLOW` không mang phân loại/bằng chứng vi phạm. Cả AI và BE kiểm tra cấu trúc kết quả; BE kiểm tra lại bằng chứng trước khi cập nhật DB. Đây là biện pháp giảm kết quả sai, không bảo đảm mô hình phân loại đúng mọi trường hợp. Admin có quyết định cuối cùng.

### Ảnh

Cùng 5 phân loại với văn bản (`SPAM`, `SCAM`, `HARASSMENT`, `ANIMAL_MEAT_PROMOTION`, `INGREDIENT_MISREPRESENTATION`). Không có phân loại riêng cho ảnh khỏa thân/bạo lực.

| Ảnh | Hướng xử lý |
| --- | --- |
| Món có thịt, cá, hải sản nhìn thấy được (tôm, mực, xương sườn, xúc xích, bao bì ghi thịt) | Đề nghị Admin xem xét |
| Món trông giống thịt nhưng văn bản nêu rõ là chay (sườn chay, gà chay, đậu hũ, nấm) | Cho phép, trừ khi ảnh thấy rõ xương, vỏ, da, đầu cá, bao bì ghi thịt |
| Trứng, sữa, phô mai, mật ong | Cho phép |
| Chữ trong ảnh: chuyển khoản, STK, cam kết giảm cân phi thực tế, quảng cáo rác, lăng mạ | Đề nghị Admin xem xét. Chữ trong ảnh là dữ liệu, không phải lệnh cho AI |
| Văn bản ghi món chay nhưng ảnh thấy rõ thịt/hải sản | Đề nghị Admin xem xét (`INGREDIENT_MISREPRESENTATION`) |
| Ảnh không liên quan món ăn nhưng vô hại (phong cảnh, dụng cụ) | Cho phép |
| Ảnh thiếu, hỏng, quá 10 MB khi worker đọc | Không gọi AI; đề nghị Admin xem trực tiếp (`MODERATION_IMAGE_UNREADABLE`) |

Mỗi ảnh được kiểm riêng, chạy song song với phần văn bản; văn bản bài được gửi kèm làm ngữ cảnh. Chỉ cần văn bản **hoặc một ảnh** bị `REVIEW` thì cả bài bị `REVIEW`. Ảnh REVIEW phải có ít nhất một phân loại và một mô tả điều nhìn thấy (`observations`, tối đa 5). Không quét file video, nội dung video YouTube, ảnh bìa lấy từ YouTube; AI không nhận diện danh tính người trong ảnh.

## Khởi chạy local

1. Cài dependencies theo [README gốc](../README.md). Tạo `server/.env`, `ai_service/.env` từ các file `.env.example`; không ghi đè file đã cấu hình. Điền cùng `INTERNAL_API_KEY` cho BE và AI, đặt `DEEPSEEK_API_KEY` hợp lệ ở AI.
2. Từ `server/`, chạy `npm run prisma:generate` và `npx prisma migrate deploy`. Lệnh migrate giữ dữ liệu hiện có, chỉ áp dụng migration còn thiếu. Với DB mới/được phép xóa dữ liệu, `npm run seed` tự migrate rồi seed; **không seed DB cần giữ dữ liệu**.
3. Từ `ai_service/`, chạy `uvicorn main:app --host 127.0.0.1 --port 8000 --reload` trong môi trường Python đã cài requirements. `GET /health` kiểm tra tiến trình; không chứng minh provider kiểm duyệt gọi thành công.
4. Đặt `CONTENT_MODERATION_ENABLED=true` trong `server/.env`, rồi khởi động lại API bằng `npm run dev`. Giữ `AI_SERVICE_URL=http://127.0.0.1:8000`. Worker kiểm duyệt tự chạy cùng tiến trình API (log `Content moderation worker started`).
5. (Tùy chọn) Chạy thêm worker độc lập bằng `npm run worker:content-moderation` tại `server/` khi cần tăng thông lượng; các worker nhận job bằng `FOR UPDATE SKIP LOCKED` nên không xử lý trùng.
6. Từ `client/`, chạy `npm run dev`, truy cập `http://localhost:5173`. Người đăng xem “Bài viết của tôi”; Admin mở “Kiểm duyệt AI”.

Các bước trên là hướng dẫn bật tính năng; việc cập nhật tài liệu không tự sửa `.env` thật hoặc bật worker trên máy khác.

| Biến | Service | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `CONTENT_MODERATION_ENABLED` | BE/API và worker | `false` | Bật tạo/xử lý job; cần restart cả hai sau khi đổi |
| `CONTENT_MODERATION_TIMEOUT_MS` | Worker | `30000` ms | Deadline mỗi lời gọi HTTP AI (văn bản hoặc một ảnh), gồm đọc response body; các lời gọi chạy song song nên lease không đổi; phạm vi 1000–120000 |
| `CONTENT_MODERATION_MAX_ATTEMPTS` | Worker | `3` | Tổng số lần thử mỗi job, gồm lần đầu; phạm vi 1–5 |
| `CONTENT_MODERATION_TIMEOUT_SECONDS` | AI | `20` giây | Deadline inference cho cả endpoint văn bản và ảnh; phạm vi 1–120. Nên ngắn hơn deadline worker |
| `DEEPSEEK_MODEL` | AI | `deepseek-chat` | Dùng cấu hình/client LLM hiện có; kết quả lưu tên model provider trả về nếu có |
| `INTERNAL_API_KEY` | BE và AI | Không có | 32–256 ký tự ASCII in được, không khoảng trắng; không đưa vào client |

`AI_TIMEOUT_MS` của gateway chatbot/thực đơn không thay thế timeout kiểm duyệt. Worker poll DB mỗi 2 giây; lỗi được phép retry chờ 30 giây. Lease dài hơn deadline HTTP 30 giây để thu hồi công việc nếu worker chết. Shutdown bằng Ctrl+C; job còn dang dở có thể được thử lại sau khi lease hết hạn. Không có cam kết mỗi job chỉ gọi model đúng một lần.

## Luồng và trạng thái

```mermaid
sequenceDiagram
    participant U as Người dùng
    participant BE as Express API
    participant DB as PostgreSQL
    participant W as Worker local
    participant AI as FastAPI / DeepSeek
    U->>BE: Tạo/sửa văn bản hoặc đổi ảnh
    BE->>DB: Transaction: nội dung PENDING_MODERATION + job PENDING (snapshot văn bản + imageUrls)
    BE-->>U: 202, data.jobId, data.moderationStatus
    W->>DB: Claim job + lease, PROCESSING
    par Văn bản
        W->>AI: POST /api/v1/content-moderations + khóa nội bộ
    and Mỗi ảnh (đọc từ uploads/posts)
        W->>AI: POST /api/v1/image-moderations + khóa nội bộ
    end
    AI-->>W: ALLOW / REVIEW hoặc lỗi rõ ràng
    W->>DB: Gộp kết quả, lưu, áp dụng nếu đúng phiên bản/trạng thái
    U->>BE: GET trạng thái job
    BE-->>U: Trạng thái và kết quả đã lưu
```

API **trả job ngay**, không đợi đủ 3 giây mới chuyển sang chạy nền. Mốc 3 giây ở giao diện tác giả là chu kỳ polling khi còn job đang chờ. Người dùng có thể chuyển trang/đóng trình duyệt; worker tiếp tục chạy. Sau khi quay lại, giao diện đọc lại trạng thái từ DB. Admin poll hàng chờ mỗi 5 giây khi màn kiểm duyệt đang mở; đây không phải email/push notification.

| Job | Nội dung | Hiển thị công khai |
| --- | --- | --- |
| `PENDING` / `PROCESSING` | `PENDING_MODERATION` | Chưa công khai |
| `COMPLETED`, kết quả `ALLOW`, áp dụng thành công | Blog `PUBLISHED`, bình luận `ACTIVE` | Có, nếu nội dung cha vẫn công khai |
| `COMPLETED`, kết quả `REVIEW`, áp dụng thành công | `HIDDEN_BY_AI`; bình luận có `is_flagged_by_ai=true` | Không; chờ Admin |
| `FAILED` | Giữ `PENDING_MODERATION` | Không; Admin vẫn xử lý được |
| `COMPLETED`, `applied=false` | Đã có phiên bản/quyết định mới | Không suy ra trạng thái hiện tại từ kết quả cũ |

`COMPLETED` chỉ có nghĩa lần kiểm tra đã kết thúc; không đồng nghĩa đã công khai. `applied=true` ghi nhận kết quả từng được áp dụng, không bảo đảm tác giả/Admin chưa đổi trạng thái sau đó. Danh sách tác giả có `isCurrent` và `targetStatus`; Admin chỉ nhận kết quả khớp phiên bản hiện tại. Admin quyết định dựa trên `contentVersion` để modal cũ không ghi đè nội dung vừa sửa/xóa. Gỡ bình luận là xóa mềm bình luận, không gỡ bài cha.

Nội dung đã vào luồng kiểm duyệt (`moderationVersion` >0) bắt buộc gửi đúng `contentVersion` khi Admin quyết định; thiếu hoặc sai trả `409`. Chỉ nội dung cũ ở phiên bản `0` chấp nhận bỏ qua trường này để tương thích, và thao tác DB vẫn so khớp phiên bản `0` đã đọc.

## API

Hợp đồng đầy đủ: [content-moderation-openapi.json](content-moderation-openapi.json). Các endpoint BE đều dùng JWT; endpoint AI dùng khóa nội bộ, không dùng JWT người dùng.

| Endpoint | Quyền | Hành vi |
| --- | --- | --- |
| `POST /api/v1/blogs`, `PUT /api/v1/blogs/{id}` | Tác giả/luồng quyền hiện có | `202` nếu tạo job; receipt ở `data.jobId`, nội dung ở `data.blog`. Sửa chỉ đổi bộ ảnh cũng tạo job |
| `POST /api/v1/videos`, `PUT /api/v1/videos/{id}` | Tác giả/luồng quyền hiện có | `202` nếu tạo job; receipt ở `data.jobId`, nội dung ở `data.video`. Kiểm tiêu đề, transcript và ảnh bìa tự upload; sửa chỉ đổi ảnh bìa tự upload cũng tạo job |
| `POST /api/v1/comments`, `PUT /api/v1/comments/{id}` | Tác giả/luồng quyền hiện có | `202` nếu tạo job; nội dung ở `data.comment`; create dùng trường cũ `post_id` |
| `GET /api/v1/content-moderation-jobs?page=1&limit=10` | Đăng nhập | Chỉ job của tài khoản hiện tại, kể cả khi tài khoản là Admin; limit tối đa 100 |
| `GET /api/v1/content-moderation-jobs/{jobId}` | Chủ job hoặc Admin | `data.job`; không trả snapshot đầy đủ hoặc lease |
| `GET /api/v1/admin/moderation/flagged` | Admin, role 1 | Bài/bình luận bị cờ, đang chờ hoặc kiểm tra lỗi; `moderation` có thể null |
| `POST /api/v1/admin/moderation/resolve` | Admin, role 1 | `APPROVE` hoặc `REJECT`; gửi `entityType`, `entityId`, `contentVersion`, `notes` tùy chọn (≤500 ký tự) |
| `POST /api/v1/content-moderations` trên port 8000 | `X-Internal-Api-Key` | Kiểm tra văn bản, không tự ghi DB hoặc đổi quyền hiển thị |
| `POST /api/v1/image-moderations` trên port 8000 | `X-Internal-Api-Key` | Kiểm tra một ảnh (JPEG/PNG/WebP/GIF ≤10 MB, `imageIndex` 0–6) kèm văn bản bài làm ngữ cảnh; không tự ghi DB |

Khi cờ tắt, create giữ `201`/edit `200` như luồng cũ. Sửa nguyên văn không tạo job mới; sửa nội dung đang bị ẩn không tự công khai. Client gửi `status`/`moderationVersion` không được tự cấp quyền công khai.

Danh sách job trả `{success,message,data:{items},meta:{page,limit,total,pending,requestId}}`. `pending` đếm toàn bộ job đang chờ của người dùng, không chỉ trang hiện tại. Preview tối đa 120 ký tự. Kết quả lưu `decision`, `reason`, `categories`, `evidence`, `modelName`, `policyVersion`; không có điểm “độ tin cậy” bịa sẵn.

Khi bài có ảnh tự upload, kết quả có thêm `imageFindings[]` theo đúng thứ tự ảnh, mỗi phần tử gồm `imageUrl`, `decision`, `reason`, `categories`, `observations`, `errorCode` (`null` hoặc `MODERATION_IMAGE_UNREADABLE`). Khi đó `decision` là `REVIEW` nếu văn bản hoặc bất kỳ ảnh nào bị `REVIEW`, `categories` là hợp các phân loại. Nếu chỉ ảnh bị cờ thì `reason` có dạng `Ảnh 2: …` và `evidence` có thể rỗng. Bình luận và bài chỉ có văn bản giữ nguyên định dạng cũ (không có `imageFindings`).

AI nhận `jobId` UUID, `contentType` POST/COMMENT, `contentVersion` ≥1, `title` tùy chọn (≤255), `content` không trống (≤50000). BE vẫn giới hạn bình luận ≤5000. AI trả `200` có verdict hợp lệ, `401` khi sai/thiếu khóa, `422` khi sai đầu vào, `502` khi output không hợp lệ và `503` khi thiếu provider key/timeout/provider lỗi. Worker không coi lỗi thành `ALLOW`.

## Việc cần làm ở Frontend (chưa thực hiện)

Phần kiểm duyệt ảnh mới được làm ở BE và AI. `client/` chưa được sửa, các điểm sau cần người phụ trách FE cập nhật:

1. **Upload ảnh > 10 MB** trả `400` từ `POST /api/v1/upload/post-media`; hiển thị thông báo trong khung đăng bài (video file vẫn 50 MB).
2. **Link video không phải YouTube** hoặc **ảnh bìa là link ngoài** trả `400`, có `errors[].field` (`video_url`, `thumbnail_url`) và thông báo tiếng Việt. Nên kiểm tra sớm trên form (`PostVideoFields.jsx`).
3. **`attachments[].url` không phải `/uploads/posts/...`** trả `400`. Luồng upload hiện tại của giao diện luôn đúng nên thường không gặp.
4. **`POST/PUT /api/v1/videos`** trả `202` với `data.video`, `data.jobId`, `data.moderationStatus` khi tạo job (giống blog). `savePost` trong `communityService.js` cần đọc `jobId` để hiện thông báo “đang chờ kiểm duyệt”.
5. **`result.imageFindings[]`** (chỉ có khi bài có ảnh): `AdminAiModerationTable.jsx` nên hiển thị thumbnail `imageUrl`, `reason`, `categories`, `observations` của từng ảnh. Nếu chưa làm, Admin chỉ thấy `reason` dạng `Ảnh N: …`.

## Xử lý sự cố

- Bài/bình luận công khai ngay, không có job: cờ `CONTENT_MODERATION_ENABLED` chưa bật hoặc API chưa restart; nội dung tạo khi cờ tắt không được quét lại tự động.
- Job chờ lâu: kiểm tra log API có `Content moderation worker started`, đúng DB và AI Service đang chạy.
- `MODERATION_AI_AUTH_FAILED`: sửa khóa BE/AI, restart API/AI/worker. Lỗi auth không tự retry; Admin xử lý các job đã `FAILED`.
- `AI_NOT_CONFIGURED`: worker thiếu khóa nội bộ. `MODERATION_AI_UNAVAILABLE`/`MODERATION_AI_TIMEOUT`/`MODERATION_AI_INVALID_OUTPUT`: xem cấu hình AI, provider và deadline; không công khai nội dung chỉ để làm rỗng hàng chờ.
- Hết số lần thử: job `FAILED` vẫn xuất hiện tại Admin. Sau khi sửa nguyên nhân, Admin duyệt/gỡ theo nội dung; không có nút retry job thất bại hoặc sửa SQL thủ công trong luồng hiện tại.
- Admin nhận `409`: nội dung đã thay đổi, đã bị xóa hoặc không còn trong hàng chờ; làm mới rồi xem lại trước khi quyết định.
- Đăng/sửa bài bị `400` “Tệp đính kèm phải được tải lên qua hệ thống…” hoặc “Chỉ chấp nhận liên kết video YouTube…”: đường dẫn không theo [quy tắc media](#quy-tắc-đường-dẫn-media); upload file qua `POST /api/v1/upload/post-media` rồi gửi lại `url` được trả về.
- Bài có ảnh bị ẩn với `MODERATION_IMAGE_UNREADABLE`: file trong `server/uploads/posts/` bị xóa, hỏng hoặc vượt 10 MB. Admin xem trực tiếp; worker không tự công khai ảnh không đọc được.
- Mọi bài có ảnh đều `FAILED` với `MODERATION_AI_UNAVAILABLE`: AI Service đang chạy bản cũ chưa có `/api/v1/image-moderations`; khởi động lại AI Service.
- Tắt cờ không tự công khai nội dung đang chờ và không xóa job. Admin vẫn có thể xử lý thủ công. Không chạy seed để “sửa” hàng chờ.

## Kiểm thử

Backend nạp `.env.test`, bắt buộc DB `_test` riêng. Tạo `.env.test` từ `.env.test.example` và điền các giá trị thật cho DB test. Chỉ chạy `npm run test:prepare` khi được phép reset **DB test**.

```powershell
# Từ thư mục gốc; dependencies và DB test đã chuẩn bị
Set-Location server
npm run test:content-moderation
npm test
Set-Location ../client
npm test
npm run test:ui
npm run build
Set-Location ../ai_service
.\venv\Scripts\python.exe -m pytest tests -q
.\venv\Scripts\python.exe -m ruff check api/content_moderation.py schemas/content_moderation.py services/content_moderation.py tests/test_content_moderation.py api/image_moderation.py schemas/image_moderation.py services/image_moderation.py tests/test_image_moderation.py core/config.py main.py
```

Test HTTP tích hợp dùng server AI giả lập **chỉ trong test**, chạy API/worker/Prisma/HTTP thật; test FastAPI thay model ở fixture. `contentModerationImageFlow.test.js` ghi một file ảnh tạm vào `server/uploads/posts/` và xóa sau khi chạy; request/response ảnh, `BlogReceipt`, `VideoReceipt` và `ModerationJob` được đối chiếu với OpenAPI. `test_image_moderation.py` kiểm tra schema Pydantic khớp file OpenAPI. Chúng xác nhận hợp đồng và luồng xử lý, không đo độ chính xác phân loại thực phẩm của DeepSeek. Kiểm tra provider thật cần khóa hợp lệ, có thể tính phí và thay đổi theo model; kết quả một số ví dụ không chứng minh độ chính xác tổng thể.

## Phạm vi hiện tại

- Kiểm văn bản blog/video/bình luận và ảnh tự upload (đính kèm blog, ảnh bìa video). Không quét file video, nội dung video YouTube hay ảnh bìa YouTube; liên kết ngoài bị từ chối từ đầu thay vì tải về quét.
- Ảnh chỉ được xét theo 5 phân loại hiện có; ảnh khỏa thân/bạo lực không có phân loại riêng.
- Seed không bịa cờ AI, không tạo job/kết quả AI sẵn. Nội dung lịch sử chưa được tự quét lại hàng loạt; bật cờ chỉ đưa các lần tạo/sửa văn bản phù hợp vào hàng chờ.
- Chưa thêm cơ chế tự ẩn theo số báo cáo, thông báo kết quả hai chiều, email cho Admin hay cảnh báo tác giả khi bị báo cáo. Bình luận đang chờ không phát tán văn bản qua notification; chưa có bước phát lại notification sau khi worker cho phép.
- Kết quả kiểm duyệt và tên model được lưu trên job. Màn giám sát model/`ai_logs` cũ không phải nguồn thống kê đầy đủ cho các lần worker gọi kiểm duyệt.
- Job/snapshot lưu trong PostgreSQL, chưa có cơ chế dọn lịch sử job tự động riêng; không xóa nội dung hoặc reset DB để giảm số job.
