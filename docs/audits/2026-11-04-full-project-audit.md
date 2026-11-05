# Rà soát toàn dự án FE → BE → AI → PostgreSQL

Ngày: 04/11/2026. Workspace: `D:/SWP391/SWP391`. Commit được kiểm tra: `0de7db1`.

## Cập nhật sau sửa ngày 05/11/2026

Báo cáo bên dưới giữ nguyên bằng chứng tại thời điểm audit ban đầu. Đã sửa A10 (refresh hồ sơ), A11 (phân loại cửa hàng), phần FE mapping của A16 (ngày ghi cân), A19 (nhãn BMI) trong các commit `e3588e4`, `a918baf`, `48b60fb`, `8db9c97`. Tất cả author/committer là nguyenphu2108. A16 vẫn còn hạn chế BE kiểm tra ngày chỉ bằng string; A15 về thứ tự cân nặng quá khứ chưa sửa. Các phát hiện khác vẫn mở.

Phase 3: BE 501, UI 200, FE logic 133, AI 306 test đạt (1.140 tổng cộng); build đạt, lint 0 lỗi/2 cảnh báo cũ. Đã kiểm tra trình duyệt với Express riêng/DB `_test`: PATCH hồ sơ nhận 401 → refresh 200 → retry 200 và hiện thành công; cân nặng/chế độ ăn/dị ứng giữ lại khi tải lại. BMI 24/26 hiển thị Thừa cân/Béo phì. Cửa hàng tạo từ form được lưu true/null và lọc ra đúng nhãn shop. Đã đối chiếu DB và dọn fixture. Không có dữ liệu giả trong code ứng dụng; tên/email/ngày sinh nhập khi kiểm thử chỉ thuộc DB test theo chỉ dẫn người dùng. Chưa có live inference AI trong các kiểm tra này.

## Phạm vi và kết luận

Đã rà soát các trang/service FE, 116 khai báo route trong các module Express trước khi nhân alias, validator/controller/service/repository, Prisma schema, các API/agent FastAPI, streaming, quota, worker và đường lưu dữ liệu. Không thay đổi code ứng dụng, schema, migration hoặc dữ liệu phát triển. Các bài test ghi dữ liệu chỉ chạy trên database riêng có hậu tố `_test`.

Có 19 vấn đề cụ thể dưới đây: 3 mức P1 cần ưu tiên và 16 mức P2. Phân biệt rõ bằng chứng tái hiện trực tiếp với kết luận từ luồng mã; hai nguy cơ cạnh tranh ở A13/A18 chưa được stress test. Bộ test hiện có đều đạt nhưng chưa bao phủ những tình huống này.

Không có cơ sở kết luận mọi API không được FE gọi đều là API dư. Các alias `/api/...` và `/api/v1/...` dùng chung router có chủ đích; cần chuyển caller và kiểm tra sử dụng trước khi bỏ.

## Kết quả kiểm tra đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| `cd server; npm test` | 492/492 test đạt, 58 file |
| `cd client; npm test` | 129/129 test đạt |
| `cd client; npm run test:ui` | 175/175 test đạt, 36 file |
| `cd ai_service; ./venv/Scripts/python.exe -m pytest -q` | 306/306 test đạt; 5 cảnh báo deprecated từ slowapi |
| `cd client; npm run lint` | 0 lỗi; 2 cảnh báo dependency của effect ở RestaurantMap.jsx dòng 108/171 |
| `cd client; npm run build` | Thành công; cảnh báo chunk chính lớn hơn 500 kB |
| `cd ai_service; ./venv/Scripts/python.exe -m ruff check .` | Đạt |
| `cd server; npx --no-install prisma validate` | Schema hợp lệ; cảnh báo cấu hình Prisma trong package.json deprecated |
| `cd server; npm run test:database` | Đạt: auth/profile/community/vote/journal/nutrients/plan/review/ownership |
| `cd server; npm run test:ai-internal-auth` | Đạt qua HTTP BE → FastAPI: key lệch, hoàn quota, lưu FAILED, phục hồi key; không gọi provider |
| `cd server; npm run test:real-images` | 34 ảnh local khớp manifest/checksum và phản hồi HTTP |

Tổng cộng 1.102 test trong bốn bộ test chính đạt, ngoài ba script integration bổ sung. Lượt Vitest đầu trong sandbox gặp lỗi file tạm/worker và một probe HTTP bị chặn socket; các bộ test đã được chạy lại ngoài sandbox thành công. Các lỗi môi trường ban đầu không được tính thành lỗi ứng dụng.

## Các phát hiện cần xử lý

### A01 — P1 — Đường dẫn attachment có thể khiến admin xóa file ngoài uploads

- Nguồn: [blog.validator.js:5](D:/SWP391/SWP391/server/src/validators/blog.validator.js:5), [admin.service.js:282](D:/SWP391/SWP391/server/src/services/admin.service.js:282).
- Người dùng có thể lưu attachment URL `/uploads/../.env`; validator chỉ kiểm tra chuỗi. Khi admin xóa vĩnh viễn bài, code chỉ kiểm tra tiền tố `/uploads/`, rồi `path.resolve` và `unlinkSync`. URL video/thumbnail cũng đi vào cùng nhánh dọn file.
- Đã chạy validator thật và phép resolve chỉ đọc: payload được chấp nhận, đường dẫn thành `D:/SWP391/SWP391/server/.env`. Không thực hiện xóa file để kiểm chứng.
- Hướng sửa: giới hạn đường dẫn sau resolve trong upload root; tốt hơn là xóa theo bản ghi upload đã xác thực quyền sở hữu, không lấy đường dẫn bất kỳ từ client.

### A02 — P1 — Video đã ẩn vẫn đọc được qua API công khai

- Nguồn: [video.route.js:10](D:/SWP391/SWP391/server/src/routes/video.route.js:10), [video.service.js:223](D:/SWP391/SWP391/server/src/services/video.service.js:223).
- `GET /api/videos/:id` không yêu cầu đăng nhập; service chỉ loại `DELETED`, nên `DRAFT`, `HIDDEN`, `HIDDEN_BY_AI` vẫn trả URL, transcript và thông tin bài. Danh sách công khai có lọc PUBLISHED nhưng endpoint chi tiết không có cùng chính sách.
- Đã gọi service thật với repository stub kiểm thử: video `HIDDEN_BY_AI` vẫn được trả. Chưa tạo video ẩn trong DB phát triển để thử.
- Hướng sửa: public chỉ nhận PUBLISHED; nếu hỗ trợ tác giả/admin xem trước, truyền identity tùy chọn và áp dụng chính sách như blog.

### A03 — P1 — Tạo/sửa video bỏ qua kiểm duyệt AI

- Nguồn: [video.service.js:50](D:/SWP391/SWP391/server/src/services/video.service.js:50), đối chiếu [blog.service.js:99](D:/SWP391/SWP391/server/src/services/blog.service.js:99).
- Blog/comment đưa văn bản vào job khi bật moderation; video tạo thẳng `PUBLISHED`, cập nhật title/transcript cũng không gọi queue. FE có luồng đăng VIDEO nên đây là đường người dùng thực sự truy cập được.
- Kết luận từ tracing: bật `CONTENT_MODERATION_ENABLED` không làm luồng video được quét. Không kiểm thử bằng nội dung vi phạm gửi đến provider.
- Hướng sửa: đưa title/transcript video qua cùng queue, version guard và quy trình áp dụng quyết định như blog.

### A04 — P2 — API danh sách công thức trả 500 vì sai tên quan hệ Prisma

- Nguồn: [workspace.repository.js:288](D:/SWP391/SWP391/server/src/repositories/workspace.repository.js:288), [schema.prisma:395](D:/SWP391/SWP391/server/prisma/schema.prisma:395).
- `findRecipes` include `category: true`, nhưng model Recipe có quan hệ `categories`. Cả `/api/workspace/recipes` và alias v1 đều đi vào truy vấn này.
- Đã tái hiện HTTP trên DB test: `GET /api/v1/workspace/recipes` → 500, `INTERNAL_SERVER_ERROR`; Prisma báo `Unknown field category`. Trang FE hiện lấy công thức bằng catalog nên chưa đi qua lỗi này.
- Hướng sửa: sửa include đúng quan hệ và thêm test endpoint thật, không chỉ kiểm thử catalog.

### A05 — P2 — Ngày trong thực đơn AI không hợp lệ vẫn được chấp nhận, có thể làm trống tuần

- Nguồn: [meal_planner_agent.py:48](D:/SWP391/SWP391/ai_service/agents/meal_planner_agent.py:48), [meal_planner_agent.py:115](D:/SWP391/SWP391/ai_service/agents/meal_planner_agent.py:115), [mealPlanJournalService.js:41](D:/SWP391/SWP391/server/src/services/mealPlanJournalService.js:41).
- AI kiểm số phần tử nhưng không kiểm `dayNumber` nằm trong giới hạn, duy nhất và liên tiếp. BE bỏ các ngày ngoài 1–7; quy trình apply xóa món cũ trước khi ghi các dòng còn lại ở dòng 78.
- Đã dùng fixture test sẵn có, deserialize lại bằng Pydantic: bảy ngày đánh số 8–14 cho `hardErrors=[]`. Hàm BE thật chuyển ngày 8 thành 0 dòng. Vì thế generation có thể COMPLETED nhưng apply lưu tuần trống; chưa chạy thao tác xóa tuần thật.
- Hướng sửa: hậu kiểm đúng tập ngày `1..days` ở AI và BE, kiểm tra món hợp lệ trước khi thay tuần; không im lặng bỏ ngày lỗi.

### A06 — P2 — Chất xơ từ thực đơn AI bị mất khi chuyển sang kế hoạch và nhật ký

- Nguồn: [mealPlanJournalService.js:24](D:/SWP391/SWP391/server/src/services/mealPlanJournalService.js:24), [schema.prisma:433](D:/SWP391/SWP391/server/prisma/schema.prisma:433), [workspace.repository.js:166](D:/SWP391/SWP391/server/src/repositories/workspace.repository.js:166).
- AI có `fiberG`, đặc biệt bắt buộc với Keto. `detailRow` chỉ giữ calories/protein/carbs/fat; MealPlanDetail cũng không có fiber. Khi record kế hoạch vào diary, fiber không được truyền và repository mặc định 0.
- Đã gọi `buildPlanDetails` thật: bữa có `fiberG=5` tạo dòng không có fiber. JSON generation gốc vẫn giữ fiber; dữ liệu bị mất ở bản kế hoạch/nhật ký.
- Hướng sửa: giữ fiber xuyên schema, migration, mapping và thao tác copy sang diary; phân biệt thiếu dữ liệu với 0 nếu nghiệp vụ cần.

### A07 — P2 — Tổng dinh dưỡng do LLM tự điền chưa được tính lại

- Nguồn: [meal_planner_agent.py:126](D:/SWP391/SWP391/ai_service/agents/meal_planner_agent.py:126), [meal_planner_agent.py:232](D:/SWP391/SWP391/ai_service/agents/meal_planner_agent.py:232), [PlanResult.jsx:37](D:/SWP391/SWP391/client/src/features/mealPlan/components/PlanResult.jsx:37).
- Hậu kiểm cộng dinh dưỡng từng bữa để đánh giá, nhưng không ghi lại daily totals. FE hiển thị nguyên `dailyCalories`, `dailyProteinG`, `dailyCarbsG`, `dailyFatG` do LLM điền.
- Đã tái hiện với fixture: các bữa cộng 1.781 kcal nhưng dailyCalories=1 vẫn không có lỗi nghiêm trọng; `_finalize` giữ nguyên 1.
- Hướng sửa: tính lại tổng từ các bữa trước khi response/persist; thêm giới hạn không âm và hữu hạn cho các trường dưỡng chất còn thiếu ràng buộc.

### A08 — P2 — Người dùng dùng chung rate limit AI theo IP backend

- Nguồn: [ratelimit.py:8](D:/SWP391/SWP391/ai_service/core/ratelimit.py:8), [aiTransportService.js:18](D:/SWP391/SWP391/server/src/services/aiTransportService.js:18).
- FastAPI lấy địa chỉ remote; gateway chuyển user/guest identity nhưng không chuyển IP. Các request từ Express local vì thế chung địa chỉ backend; với mặc định 30/phút, người này có thể làm người khác bị 429 trong cùng bucket endpoint. Đây khác với quota ngày trong DB.
- Kết luận từ đường header và key function; chưa chạy tải 30+ request vào hệ thống thực. Test rate limit hiện tự truyền X-Forwarded-For nên không mô phỏng đúng gateway hiện tại.
- Hướng sửa: rate limit bằng identity đã được gateway xác thực, hoặc chuyển IP đã chuẩn hóa qua proxy tin cậy. Giữ giới hạn tổng hệ thống như một giới hạn riêng nếu cần.

### A09 — P2 — Monitoring chưa nhận kết quả kiểm duyệt tự động

- Nguồn: [contentModerationService.js:47](D:/SWP391/SWP391/server/src/services/contentModerationService.js:47), [admin.service.js:663](D:/SWP391/SWP391/server/src/services/admin.service.js:663).
- Complete/fail chỉ ghi moderation job và trạng thái nội dung. Model card đọc ai_logs với prefix SPAM_DETECTION/MODERATION_MANUAL_OVERRIDE, nên job tự động chạy hoặc lỗi không đóng góp vào trạng thái/tổng lượt của card moderation. Manual override lại được ghi log.
- Job vẫn có trong DB; phần thiếu là kết nối monitoring. Job video/ingredient lookup cũng chưa được đưa vào cùng phép tổng hợp ai_logs.
- Hướng sửa: tổng hợp trực tiếp từ job hoặc ghi một log kết thúc có định danh job; tránh ghi trùng khi worker retry.

### A10 — P2 — Lưu hồ sơ sau refresh token thành công nhưng FE bỏ kết quả

- Nguồn: [useProfileForm.js:69](D:/SWP391/SWP391/client/src/features/profile/hooks/useProfileForm.js:69), [apiClient.js:32](D:/SWP391/SWP391/client/src/services/apiClient.js:32).
- Access token hết hạn → Axios refresh và retry PATCH thành công → guard thấy token khác token ban đầu và return. DB đã lưu nhưng form/session user không cập nhật, không hiện thành công, không phát USER_CHANGED; scanner có thể tiếp tục dùng dữ liệu dị ứng cũ.
- Harness thực thi source hook với ranh giới service kiểm thử cho kết quả `sessionUpdated:false`, `syncEmitted:false` sau response thành công có refresh cùng tài khoản.
- Hướng sửa: kiểm tra identityRevision/userId; khi nhận user mới thì giữ access token hiện tại, không so sánh token như định danh tài khoản.

### A11 — P2 — Phân loại cửa hàng nguyên liệu không được lưu đúng

- Nguồn: [RestaurantProposalForm.jsx:37](D:/SWP391/SWP391/client/src/features/restaurants/components/RestaurantProposalForm.jsx:37), [workspace.service.js:130](D:/SWP391/SWP391/server/src/services/workspace.service.js:130).
- FE cho chọn shop nhưng serialize thành diet_type_id=1. BE dựng loại địa điểm chỉ bằng diet ID, nên shop đọc lại thành vegan; bộ lọc shop không khớp dữ liệu đó.
- Kết luận từ mapping đầu vào/đầu ra; DB hiện không có field loại địa điểm độc lập phục vụ lựa chọn này.
- Hướng sửa: thống nhất loại địa điểm riêng xuyên FE/API/DB, tách khỏi chế độ ăn. Cần chốt tập giá trị nghiệp vụ trước migration.

### A12 — P2 — Cache quán từ nguồn ngoài ghi các thông tin chưa có thật

- Nguồn: [place.repository.js:88](D:/SWP391/SWP391/server/src/repositories/place.repository.js:88), [places.service.js:257](D:/SWP391/SWP391/server/src/services/places.service.js:257).
- Provider mapping trả diet_type_id=null, có thể rating=null. Repository thay bằng vegan ID 1, rating 4.5, separate_kitchen=true và thành phố Hồ Chí Minh cho mọi địa chỉ không chứa Hà Nội. Các giá trị này được lưu như sự thật và lần đọc sau qua bộ lọc vegan.
- Đã gọi hàm thật với DB stub kiểm thử: đầu vào địa chỉ Đà Nẵng, chưa biết rating/diet → ghi rating 4.5, diet 1, city Hồ Chí Minh, bếp riêng true. Không ghi những giá trị probe vào DB.
- Hướng sửa: giữ null/unknown, chỉ ghi khi có nguồn thực hoặc người quản trị xác nhận; điều chỉnh cột bắt buộc nếu cần. Đây là vi phạm No Mock Data trong đường code hiện tại.

### A13 — P2 — Lưu thực đơn đồng thời có thể tạo trùng tuần hoặc trùng bữa

- Nguồn: [workspace.service.js:428](D:/SWP391/SWP391/server/src/services/workspace.service.js:428), [schema.prisma:419](D:/SWP391/SWP391/server/prisma/schema.prisma:419).
- Manual save dùng find-then-create, không lấy advisory lock như apply AI. Schema chỉ có index, không có unique theo user/week hay plan/day/meal. Hai request vào tuần trống có thể tạo hai plan; hai cập nhật bữa có thể cùng delete rồi insert.
- Kết luận từ ràng buộc và thứ tự query, chưa stress test DB. Journal và record diary có cách chọn/ghi đè dữ liệu khác nhau nên có thể hiện món không nhất quán.
- Hướng sửa: các writer dùng cùng lock user/week; rà trùng dữ liệu trước khi bổ sung unique và dùng upsert cho slot.

### A14 — P2 — Khôi phục bài đã xóa không khôi phục bình luận bị xóa theo bài

- Nguồn: [admin.service.js:328](D:/SWP391/SWP391/server/src/services/admin.service.js:328), [blog.service.js:463](D:/SWP391/SWP391/server/src/services/blog.service.js:463).
- Xóa bài của tác giả đánh dấu bình luận DELETED. Restore chấp nhận bài DELETED nhưng chỉ khôi phục comment HIDDEN cùng timestamp. Bài trở lại, bình luận không trở lại và vẫn có thể bị purge.
- Kết luận từ nhánh delete/restore; không thử purge dữ liệu thật.
- Hướng sửa: lưu quan hệ/lý do và trạng thái trước lần xóa cha, chỉ khôi phục các comment bị tác động bởi lần xóa đó; không phục hồi comment bị xóa riêng từ trước.

### A15 — P2 — Thêm cân nặng quá khứ ghi đè cân nặng hiện tại

- Nguồn: [auth.service.js:378](D:/SWP391/SWP391/server/src/services/auth.service.js:378).
- API cho gửi recordedDate/recorded_date, lưu vào history rồi luôn cập nhật profile.weight, không xét bản ghi mới có thực sự mới nhất theo thời gian. Nhập số đo cũ sau số đo hiện tại làm profile/BMI và đầu vào AI lùi về số đo cũ.
- Kết luận từ đường ghi, chưa chèn history quá khứ vào DB phát triển.
- Hướng sửa: cập nhật current weight theo bản ghi mới nhất; validate timestamp ở boundary và xác định chính sách cho ngày tương lai.

### A16 — P2 — Ngày ghi cân nặng không thống nhất giữa FE và BE

- Nguồn: [authService.js:74](D:/SWP391/SWP391/client/src/services/authService.js:74), [auth.validator.js:46](D:/SWP391/SWP391/server/src/validators/auth.validator.js:46).
- FE service gửi recordedAt, BE chỉ nhận recordedDate/recorded_date; Zod bỏ field không nhận và service mặc định ngày hiện tại. Các field ngày BE nhận cũng chỉ là z.string(), nên ngày lỗi đi qua validation.
- Đã chạy validator thật: `{weight:60, recordedAt:...}` thành `{weight:60}`; recordedDate='invalid' vẫn hợp lệ. WeightTracker hiện chỉ gửi weight, nên chưa gặp mất ngày từ giao diện hiện tại. Test FE hiện còn khẳng định recordedAt là đúng, không đối chiếu contract BE.
- Hướng sửa: chọn một tên camelCase thống nhất và kiểm thử request FE qua validator BE; validate ISO timestamp.

### A17 — P2 — Xử lý nội dung và cập nhật trạng thái report không nguyên tử

- Nguồn: [admin.service.js:834](D:/SWP391/SWP391/server/src/services/admin.service.js:834), [admin.service.js:873](D:/SWP391/SWP391/server/src/services/admin.service.js:873).
- HIDE_CONTENT ghi xóa comment hoặc commit transaction xóa post trước; report.status cập nhật riêng ở cuối. Nếu bước cuối lỗi, nội dung đã gỡ nhưng report vẫn PENDING; notification cũng có thể đã được gửi.
- Kết luận từ transaction boundary; chưa chèn lỗi DB có chủ đích để kiểm chứng.
- Hướng sửa: cập nhật nội dung, report và notification DB trong một transaction. `resolutionAction` hiện chỉ là lệnh, không được lưu lịch sử; resolver/time/action là khoảng trống audit trail cần chốt yêu cầu trước khi thêm cột.

### A18 — P2 — Rating cache có thể lệch so với reviews khi có ghi đồng thời

- Nguồn: [workspace.service.js:543](D:/SWP391/SWP391/server/src/services/workspace.service.js:543).
- Hai transaction cùng insert review, tính AVG trước khi thấy commit của nhau rồi update restaurants.rating; lượt ghi sau có thể dùng trung bình thiếu review của lượt trước. Transaction mặc định không tự tuần tự hóa phép tính này.
- Đây là nguy cơ cạnh tranh xác định từ luồng query, chưa stress test thực tế.
- Hướng sửa: khóa restaurant trước insert/aggregate, hoặc lấy AVG từ reviews khi đọc thay cho cache không được đồng bộ.

### A19 — P2 — Cùng BMI nhưng hồ sơ và chatbot dùng phân loại khác nhau

- Nguồn: [WeightTracker.jsx:15](D:/SWP391/SWP391/client/src/features/profile/components/WeightTracker.jsx:15), [aiHelpers.js:42](D:/SWP391/SWP391/client/src/utils/aiHelpers.js:42), [nutrition.py:54](D:/SWP391/SWP391/ai_service/core/nutrition.py:54).
- BMI 24 được WeightTracker gán Bình thường, trong khi helper FE/AI gán Thừa cân. BMI 26 cũng cho nhãn khác nhau. Đây là mâu thuẫn quy tắc nội bộ; audit không chọn thay người dùng tiêu chuẩn phân loại nào.
- Hướng sửa: chốt một quy tắc nghiệp vụ rồi áp dụng thống nhất, kiểm thử ở cả FE và AI.

## API/chức năng chưa nối và code có thể dư

| Mục | Hiện trạng | Kết luận |
| --- | --- | --- |
| `/api/...` và `/api/v1/...` | Cùng router trong routes/index.js | Alias tương thích, không tự xóa |
| `/ai/usage` và `/ai/chat/usage` | Cùng getUsage | Có thể chuẩn hóa caller rồi deprecate alias |
| `/admin/ai/logs`, `/admin/ai-logs`, `/v1/ai-logs` | Adapter legacy/camelCase dùng chung service; FE còn gọi legacy | Dư bề mặt API, chưa phải dư logic nghiệp vụ |
| Admin guest-quota/cache aliases | Có đường `/admin/...` và `/admin/ai/...` | Kiểm tra caller trước khi gộp |
| FastAPI JSON `/api/chat`, `/api/meal-planner/generate` | Không thấy caller BE/FE hiện tại; sản phẩm dùng SSE | Candidate deprecate; chưa đủ căn cứ xóa API phục vụ bên ngoài |
| Cache chatbot | Được ghi bởi answer() JSON, luồng SSE không dùng cache đó | Nút xóa cache không tác động chat SSE hiện tại |
| Sửa/xóa comment của mình | BE có PUT/DELETE; PostComments/communityService chưa nối thao tác đó | Gap FE, không coi BE là dư chỉ vì thiếu UI |
| Xóa notification | notificationService có DELETE `/v1/notifications/:id`; router không có DELETE; không thấy caller UI | Contract chết/tiềm ẩn, không phải thao tác UI đang lỗi |
| Lịch sử notification | Bell chỉ lấy 10, không có tải tiếp/trang lịch sử | Thông báo cũ chưa có đường truy cập FE |
| Lịch sử video summary | discoverVideoHistory chỉ khôi phục 10 terminal job mới nhất | Có dữ liệu DB nhưng chưa có UI tải trang cũ |
| `client/src/services/api.js` | Không tìm thấy import/caller | Candidate xóa sau kiểm tra toàn bộ repo/test |
| AdminCommentTable/AdminCommentDeleteModal | Không tìm thấy nơi import/render | Candidate code thừa, không phải API dư |
| personalPosts/createPostAttachment/releasePostAttachment ở SiteLayout | Có khai báo/Outlet context, không thấy consumer | Candidate context thừa |
| Modal can thiệp AI | defaultLog chỉ đi vào useState lần mount; model/action/feedback có thể giữ từ lần mở trước | Cần reset theo lần mở/log; tác động thấp hơn vì BE dùng logId |

Các điểm FE nói trên được đối chiếu ở [comment.route.js:14](D:/SWP391/SWP391/server/src/routes/comment.route.js:14), [notificationService.js:18](D:/SWP391/SWP391/client/src/services/notificationService.js:18), [notification.route.js:17](D:/SWP391/SWP391/server/src/routes/notification.route.js:17), [NotificationBell.jsx:33](D:/SWP391/SWP391/client/src/components/layout/NotificationBell.jsx:33), [videoRecipeHistory.js:38](D:/SWP391/SWP391/client/src/features/videoRecipeSummary/utils/videoRecipeHistory.js:38), [AdminAiInterveneModal.jsx:8](D:/SWP391/SWP391/client/src/features/admin/components/AdminAiInterveneModal.jsx:8).

## Dữ liệu và kiến trúc cần phân biệt với lỗi chức năng

- Profile/allergies, diary nutrients nhập trực tiếp, blog attachments/category và video metadata đã có đường ghi. Không thấy bằng chứng toàn bộ dự án bị thiếu một tầng persistence; các chỗ mất/sai dữ liệu cụ thể nằm ở A05/A06/A11/A12/A15/A16/A17.
- Guest AI generation không vào lịch sử tài khoản là chủ đích hiện tại; quota guest vẫn lưu PostgreSQL. Không coi đó là lỗi mất dữ liệu khi chưa có yêu cầu lưu lịch sử khách.
- Python log hoạt động là log vận hành local, không phải lần ghi trùng bảng ai_logs. AI không kết nối PostgreSQL trực tiếp trong các luồng đã rà soát.
- Video worker có heartbeat/lease/recovery; moderation có lease/version guard/retry. Chưa thấy bằng chứng cần kết luận những cơ chế này hỏng. Generation streaming/scanner PROCESSING chưa có cơ chế phục hồi trạng thái sau tiến trình crash; cần đưa vào backlog lifecycle.
- Catalog vẫn lấy toàn bộ posts/comments/votes/recipes/restaurants; blog/video/comment có nhánh bỏ phân trang nếu không gửi page/limit. Đây là khoảng trống hiệu năng/tuân thủ quy tắc phân trang, cần thiết kế chuyển FE trước khi hạn chế kết quả.
- Code cũ dùng snake_case trong JSON/Prisma field, ID Int, thiếu updatedAt/enum ở nhiều model, Prisma được gọi trực tiếp ở service; chưa phù hợp đầy đủ AGENTS.md hiện tại. Đây là nợ kiến trúc, không nên đổi hàng loạt tên/ID khi đang sửa lỗi chức năng vì ảnh hưởng migration và contract.
- Package hiện dùng React 19/Router 8, khác mô tả chốt React 18 ở phần vai trò; chưa có script lint/backend ESLint trong server/package.json. Không tự downgrade/đổi dependency trong audit.
- Chưa có bằng chứng nghiệp vụ yêu cầu bookmark/favorite nên không coi việc không có bảng đó là chức năng còn thiếu.

## Thứ tự sửa đề nghị

1. Sửa A01/A02/A03: ranh giới file, quyền xem và kiểm duyệt video.
2. Sửa hợp đồng/lưu dữ liệu BE: A04/A05/A06/A13/A14/A15/A16/A17/A18; kiểm tra dữ liệu hiện hữu trước migration.
3. Đồng bộ AI/FE: A07/A08/A09/A10/A11/A12/A19; chốt loại địa điểm, cách biểu diễn unknown và quy tắc BMI trước khi thay đổi nghiệp vụ.
4. Bổ sung test tái hiện các lỗi này; hoàn thiện các UI chưa nối, thống nhất alias rồi mới xóa code/API thừa.

Nếu triển khai sửa nhiều tầng, thực hiện phase theo AGENTS.md: phase 1 DB/BE; phase 2 AI/FE; phase 3 kiểm thử/tài liệu, xác nhận giữa các phase. Audit này chỉ giao báo cáo, chưa bắt đầu phase sửa.

## Giới hạn

Không gọi inference provider hoặc ZIOMAP thật, không thao tác browser end-to-end, không đọc/ghi dữ liệu phát triển để chứng minh lỗi. Các bài test đơn vị có stub/provider fixture nên kết quả đạt không chứng minh khả năng inference thực tế, dữ liệu thực tế hoặc mọi tình huống cạnh tranh. Không chạy reset DB, migrate thay đổi schema, seed dữ liệu hay thay đổi DevOps.
