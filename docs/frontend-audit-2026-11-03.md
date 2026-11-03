# Rà soát frontend và kết nối backend/AI — 03/11/2026

## Kết luận và phạm vi

Các luồng chính đã có kết nối trong mã nguồn. Vẫn còn lỗi hợp đồng API, đồng bộ dữ liệu, xử lý kết quả AI và một số thao tác giao diện chưa được triển khai.

Đã đối chiếu routes, pages, hooks, services của client với routes, validators, services, repositories của server và schemas/API của ai_service. Đây là rà soát mã nguồn và kiểm tra tự động hiện có, chưa phải kiểm thử đầu cuối bằng tài khoản và dữ liệu thật. Không thay đổi code ứng dụng hoặc dữ liệu DB trong lượt rà soát.

Quy ước làm việc theo yêu cầu mới nhất: dùng một nhánh `fix-frontend`; mỗi chức năng hoặc nhóm lỗi cùng nguyên nhân có commit riêng, mô tả cách sửa và kiểm chứng. Không gộp các bản sửa độc lập vào một commit.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| `cd client; npm test` | 94/94 test đạt |
| `cd client; npm run test:ui` | 79/79 test, 16/16 file đạt sau khi đặt TEMP/TMP vào thư mục cache trong workspace |
| `cd client; npm run lint` | 0 lỗi, 2 cảnh báo dependencies của effect trong RestaurantMap.jsx |
| `cd client; npm run build` | Thành công; cảnh báo chunk JS chính khoảng 523 kB trước gzip |
| Import và kiểm tra schema Zod admin | `LOCKED` và `DISMISSED` bị từ chối; `ACTIVE` được chấp nhận |
| Chạy helper chuyển chế độ ăn | ID5 → vegan; ID6 → lacto_ovo; ID7 không được ánh xạ, planner mặc định vegan |
| Chạy helper kiểm tra thành phần văn bản | ID6/7 trả unknown và findings rỗng ngay cả với từ khóa thịt |
| HTTP localhost tại thời điểm kiểm tra | Cổng 5000, 8000, 5173 đều ECONNREFUSED |

Lần chạy UI test đầu gặp ENOENT ở thư mục tạm của sandbox. Chạy lại với TEMP/TMP trỏ vào `client/node_modules/.cache/frontend-audit-temp` đạt toàn bộ. Không tính lỗi môi trường này là lỗi ứng dụng. Chưa gọi inference có phí, chưa chạy thao tác ghi vào DB hoặc khởi động worker xử lý job tồn đọng.

## Lỗi cần sửa

P1: ưu tiên cao vì bảo mật, sai dữ liệu đầu vào hoặc chặn chức năng quản trị. P2: lỗi chức năng/đồng bộ cần sửa tiếp. Mức độ dựa trên mã nguồn, không khẳng định đã khai thác hoặc đã xảy ra trên DB hiện tại.

### 01. P1 — Trang admin công khai thông tin đăng nhập seed

- Vị trí: [AdminPortal.jsx:76](D:/SWP391/SWP391/client/src/pages/admin/AdminPortal.jsx:76).
- Người chưa đăng nhập mở `/admin` thấy email và mật khẩu quản trị. Thông tin trùng tài khoản trong [seed.sql:169](D:/SWP391/SWP391/server/prisma/seed.sql:169), cũng được seed.js kiểm tra.
- Hướng sửa: bỏ thông tin đăng nhập khỏi UI và bundle; thay thông tin đăng nhập mặc định nếu DB còn sử dụng. Chưa xác minh mật khẩu hiện tại của DB và không thử đăng nhập.

### 02. P1 — Khóa thành viên bị validator backend từ chối

- [AdminMembersTab.jsx:49](D:/SWP391/SWP391/client/src/features/admin/components/AdminMembersTab.jsx:49) gửi `LOCKED` qua PATCH `/api/admin/users/:id/status`.
- [admin.validator.js:6](D:/SWP391/SWP391/server/src/validators/admin.validator.js:6) chỉ nhận ACTIVE/BANNED/DELETED/PENDING, trong khi hằng số nghiệp vụ backend dùng LOCKED.
- Hậu quả: nút khóa trả 400. Cần thống nhất validator với trạng thái nghiệp vụ; không chỉ đổi nhãn UI.

### 03. P2 — Bác bỏ báo cáo bị validator backend từ chối

- [AdminReportsTab.jsx:69](D:/SWP391/SWP391/client/src/features/admin/components/AdminReportsTab.jsx:69) gửi DISMISSED.
- [admin.validator.js:42](D:/SWP391/SWP391/server/src/validators/admin.validator.js:42) chỉ nhận PENDING/RESOLVED/REJECTED. Hằng số, service và bộ lọc hiện dùng DISMISSED.
- Hậu quả: nút Bác bỏ trả 400. Sửa contract tại nguồn và kiểm tra cả thao tác lẫn bộ lọc.

### 04. P2 — Chưa nối refresh token

- [apiClient.js:36](D:/SWP391/SWP391/client/src/services/apiClient.js:36) xóa session khi nhận 401, không thử refresh/retry.
- Backend có POST `/auth/refresh` tại [auth.route.js:13](D:/SWP391/SWP391/server/src/routes/auth.route.js:13), nhưng không có caller trong client.
- Hậu quả: access token hết hạn buộc người dùng đăng nhập lại dù refresh cookie còn hiệu lực. Luồng refresh cần gom các request đồng thời và bảo vệ phiên đăng nhập mới khỏi response cũ.

### 05. P2 — Đăng xuất chỉ xóa session frontend

- [Header.jsx:57](D:/SWP391/SWP391/client/src/components/layout/Header.jsx:57) chỉ gọi setSession(null).
- POST `/auth/logout` và clearCookie đã có ở [auth.controller.js:47](D:/SWP391/SWP391/server/src/controllers/auth.controller.js:47), chưa được frontend gọi.
- Hậu quả: refresh cookie của tài khoản vừa đăng xuất vẫn còn và có thể dùng để xin access token.

### 06. P2 — Mở tài khoản đã xóa đi sai luồng khôi phục

- [AdminMembersTab.jsx:48](D:/SWP391/SWP391/client/src/features/admin/components/AdminMembersTab.jsx:48) coi DELETED như LOCKED và PATCH trạng thái ACTIVE.
- [admin.service.js:124](D:/SWP391/SWP391/server/src/services/admin.service.js:124) xóa deleted_at của user nhưng không khôi phục posts/comments bị xóa cùng tài khoản.
- Backend đã có POST `/admin/users/:id/restore`, với logic phục hồi theo timestamp tại [admin.service.js:158](D:/SWP391/SWP391/server/src/services/admin.service.js:158), nhưng adminService frontend chưa nối.
- Hậu quả: tài khoản hoạt động lại, nội dung vẫn DELETED và dấu thời gian khôi phục gốc bị mất. Cần nút khôi phục gọi đúng endpoint.

### 07. P2 — Media của bài viết riêng chưa công khai bị ghi đè sai định dạng

- [workspace.repository.js:90](D:/SWP391/SWP391/server/src/repositories/workspace.repository.js:90) trả `post` raw và attachments đã chuẩn hóa ở root.
- [useCommunity.js:14](D:/SWP391/SWP391/client/src/features/community/hooks/useCommunity.js:14) spread blog.post sau blog, ghi đè attachments chuẩn hóa bằng `{attachment_id,file_url,file_type,file_name}`.
- [PostMedia.jsx:12](D:/SWP391/SWP391/client/src/features/community/components/PostMedia.jsx:12) và editor cần `{id,url,type,name}`. Bài PUBLISHED thường được thay bằng catalog nên lỗi dễ bị che.
- Tái hiện: mở Bài viết của tôi với bài PENDING_MODERATION/HIDDEN_BY_AI/DRAFT có attachment. Media không hiện; giữ attachment rồi lưu sửa tạo URL undefined và bị validator từ chối. Gỡ một attachment raw có thể gỡ tất cả vì id đều undefined. Tên tác giả bình luận cũng bị mất trường chuẩn hóa.
- Cần sửa thứ tự merge hoặc chuẩn hóa một lần và kiểm tra cả hiển thị, sửa, gỡ media.

### 08. P2 — Các bảng quản trị không nối phân trang

- Members, Posts, Comments, Reports cố định limit 50, không truyền page, bỏ metadata và không có nút chuyển trang. Ví dụ [AdminMembersTab.jsx:22](D:/SWP391/SWP391/client/src/features/admin/components/AdminMembersTab.jsx:22), [AdminReportsTab.jsx:18](D:/SWP391/SWP391/client/src/features/admin/components/AdminReportsTab.jsx:18).
- [AdminAiMonitorTab.jsx:26](D:/SWP391/SWP391/client/src/features/admin/components/AdminAiMonitorTab.jsx:26) tương tự với limit 30.
- Backend có phân trang thật. Khi vượt giới hạn, các bản ghi cũ cùng bộ lọc không thể được duyệt từ UI. Không áp kết luận này cho trang `/admin/ai` riêng vốn có phân trang.

### 09. P2 — Chọn nhóm danh mục không được lưu

- [AdminCategoriesTab.jsx:100](D:/SWP391/SWP391/client/src/features/admin/components/AdminCategoriesTab.jsx:100) chỉ gửi name khi tạo/sửa, bỏ targetType mà người dùng đã chọn.
- Nhóm được suy ra từ quan hệ hoặc regex tên tại dòng 15. Ví dụ chọn BLOG nhưng tên chứa “chay” có thể xuất hiện thành nhóm công thức.
- Cần thống nhất nghiệp vụ lưu loại danh mục với backend hoặc bỏ control không có tác dụng; không tự bổ sung field nghiệp vụ khi chưa thống nhất.

### 10. P2 — Sửa số đo trong Nhật ký chưa đồng bộ sang hồ sơ AI và lịch sử cân nặng

- [Journal.jsx:181](D:/SWP391/SWP391/client/src/pages/Journal.jsx:181) cập nhật profile rồi chỉ refresh nhật ký; không cập nhật session, refreshUser hoặc phát USER_CHANGED.
- [useChatBox.js:70](D:/SWP391/SWP391/client/src/features/chat/hooks/useChatBox.js:70) chỉ refresh khi hồ sơ thiếu số đo. Hồ sơ đã có số đo vì vậy tiếp tục điền cân nặng cũ vào thực đơn AI.
- Endpoint workspace tại [workspace.service.js:355](D:/SWP391/SWP391/server/src/services/workspace.service.js:355) cũng bỏ qua đồng bộ lịch sử cân nặng vốn có trong auth service.
- Tái hiện: người đã có số đo sửa cân nặng trong Nhật ký rồi mở thực đơn AI mà không tải lại trang. Kiểm tra thêm lịch sử WeightTracker sau sửa.

### 11. P2 — Sắp xếp quán theo giá đang so độ dài chuỗi

- [Restaurants.jsx:51](D:/SWP391/SWP391/client/src/pages/Restaurants.jsx:51) so a.price.length với b.price.length.
- Backend gán price từ price_range dạng văn bản tại [workspace.service.js:133](D:/SWP391/SWP391/server/src/services/workspace.service.js:133).
- Hậu quả: khoảng giá có cùng độ dài được coi ngang nhau dù số tiền khác, giá thiếu lên đầu. Cần tiêu chí giá dạng số hoặc bỏ tùy chọn sắp xếp cho đến khi có contract thích hợp.

### 12. P1 — Chat/thực đơn làm mất chế độ Phật giáo, Keto, Eat Clean

- [aiHelpers.js:15](D:/SWP391/SWP391/client/src/utils/aiHelpers.js:15) ánh xạ ID5 thành vegan, ID6 thành lacto_ovo, bỏ ID7; planner mặc định ID7 thành vegan tại dòng 75.
- Đây là các chế độ có thật trong seed. [aiRequestValidator.js:11](D:/SWP391/SWP391/server/src/validators/aiRequestValidator.js:11) chỉ chấp nhận bốn loại chay.
- Hậu quả: yêu cầu kiêng ngũ vị tân, Keto và Eat Clean không được truyền đầy đủ sang AI. Cần thống nhất contract xuyên FE/BE/AI, không ép về một chế độ khác.

### 13. P1 — Quét ảnh không sử dụng dị ứng cá nhân

- [useFoodScanner.js:49](D:/SWP391/SWP391/client/src/features/foodScanner/hooks/useFoodScanner.js:49) luôn gửi allergies: []; hook chỉ nhận dietId, màn hình không có đầu vào dị ứng.
- [aiFoodScanService.js:51](D:/SWP391/SWP391/server/src/services/aiFoodScanService.js:51) chuyển nguyên payload sang AI, không bổ sung hồ sơ.
- AI hỗ trợ allergies và giao diện có nhãn Dị ứng cá nhân, nhưng dữ liệu đã lưu của thành viên không tham gia phân tích. Cần nối đúng dữ liệu hồ sơ và kiểm chứng payload.

### 14. P2 — Đổi chế độ ăn vẫn giữ kết quả quét cũ

- [FoodScanner.jsx:13](D:/SWP391/SWP391/client/src/pages/FoodScanner.jsx:13) đổi dietId nhưng [useFoodScanner.js:14](D:/SWP391/SWP391/client/src/features/foodScanner/hooks/useFoodScanner.js:14) không xóa result/textResult hoặc hủy request do chế độ thay đổi.
- Tái hiện: quét có sữa theo lacto, đổi sang vegan; kết quả phù hợp và nút lưu của lần trước vẫn còn. Request đang chạy cũng có thể trả kết quả của chế độ cũ.
- Cần gắn kết quả với chế độ đã phân tích, vô hiệu hóa kết quả cũ hoặc yêu cầu quét lại.

### 15. P2 — Kiểm tra văn bản Keto/Eat Clean hiển thị như không phát hiện lỗi

- [foodScanner.js:19](D:/SWP391/SWP391/client/src/utils/foodScanner.js:19) trả unknown và findings rỗng cho ID6/7.
- [FoodScannerResults.jsx:48](D:/SWP391/SWP391/client/src/features/foodScanner/components/FoodScannerResults.jsx:48) chỉ xét findings, bỏ status rồi hiện Chưa phát hiện từ khóa không phù hợp.
- Đã tái hiện helper với từ khóa thịt. Cần hiện rõ chế độ chưa được kiểm tra hoặc nối bộ kiểm tra hỗ trợ chế độ tương ứng.

### 16. P2 — Bộ lọc giám sát AI không khớp action log hiện tại

- [AdminAiMonitorTab.jsx:106](D:/SWP391/SWP391/client/src/features/admin/components/AdminAiMonitorTab.jsx:106) gửi CHATBOT_GUEST_QUERY hoặc NUTRIENT_ANALYSIS.
- Gateway ghi CHAT_STREAM_USER_<id>/CHAT_STREAM_GUEST và FOOD_SCAN_*; [aiLogRepository.js:25](D:/SWP391/SWP391/server/src/repositories/aiLogRepository.js:25) lọc bằng so sánh action chính xác.
- Hậu quả: chọn lọc chatbot/dinh dưỡng làm mất log của luồng đang chạy. Cần dùng bộ lọc feature hoặc ánh xạ action hiện hành.

### 17. P2 — Reset hạn mức theo mã frontend hướng dẫn không khớp danh tính backend

- [AdminAi.jsx:198](D:/SWP391/SWP391/client/src/pages/admin/AdminAi.jsx:198) hướng dẫn nhập X-Guest-Id hoặc mã dạng IP.
- Backend lấy danh tính từ cookie ký tại [aiIdentityMiddleware.js:15](D:/SWP391/SWP391/server/src/middlewares/aiIdentityMiddleware.js:15), dùng `guest:<UUID cookie>`, bỏ qua UUID header do FE tạo.
- Hậu quả: nhập đúng mã theo hướng dẫn UI vẫn có thể reset khóa quota khác, báo thành công nhưng khách thực tế tiếp tục hết lượt. Usage API có guestId thật; cần hiển thị và dùng đúng danh tính đó.

### 18. P2 — Kết quả gợi ý thay thế của AI không được hiển thị

- Backend xác thực và trả swapSuggestions tại [aiFoodScanValidator.js:31](D:/SWP391/SWP391/server/src/validators/aiFoodScanValidator.js:31).
- [FoodScannerResults.jsx:14](D:/SWP391/SWP391/client/src/features/foodScanner/components/FoodScannerResults.jsx:14) không render trường này; nút thay thế chỉ mở `/doi-mon-chay`, không chuyển ngữ cảnh món/thành phần.
- Trang FoodSwap dùng catalog swaps từ DB, có kết nối backend thật nhưng chưa sử dụng kết quả thay thế cụ thể do AI vừa sinh.

### 19. P2 — Nút BMI trong chat không truyền số đo hồ sơ

- [ChatBox.jsx:21](D:/SWP391/SWP391/client/src/features/chat/components/ChatBox.jsx:21) yêu cầu hồ sơ có số đo, nhưng chỉ gửi câu Tôi muốn tính chỉ số BMI.
- [useChatRequest.js:32](D:/SWP391/SWP391/client/src/features/chat/hooks/useChatRequest.js:32) truyền message/history/diet/menuContext, không gửi chiều cao hoặc cân nặng; gateway không bổ sung hồ sơ.
- Hậu quả: nút không thể tự tính từ số đo đã lưu nếu lịch sử chat chưa có số đo. Không khẳng định AI luôn trả sai; dữ liệu cần thiết chưa được nối vào thao tác này.

## Chức năng giao diện còn thiếu kết nối

| Chức năng | Bằng chứng và trạng thái |
| --- | --- |
| Quét ảnh trong chat | [useChatBox.js:173](D:/SWP391/SWP391/client/src/features/chat/hooks/useChatBox.js:173) chỉ tạo object URL và tin nhắn; không gọi API. Đây là preview ảnh local, khác với trang quét ảnh đã nối AI. |
| Quên mật khẩu | [AuthForm.jsx:130](D:/SWP391/SWP391/client/src/features/auth/components/AuthForm.jsx:130) chỉ hiện thông báo Chưa kết nối. Backend auth cũng chưa có endpoint khôi phục tương ứng. |
| Ghi nhớ đăng nhập | [AuthForm.jsx:182](D:/SWP391/SWP391/client/src/features/auth/components/AuthForm.jsx:182) có checkbox remember nhưng handleSubmit không đọc giá trị; session vẫn lưu theo cơ chế hiện tại. |
| Điều khoản và chính sách bảo mật | [AuthForm.jsx:200](D:/SWP391/SWP391/client/src/features/auth/components/AuthForm.jsx:200) chỉ hiện thông báo sẽ bổ sung sau; chưa có nội dung/route thực tế. |

## Luồng đã tìm thấy đường nối trong mã nguồn

| Nhóm | Kết nối đã đối chiếu |
| --- | --- |
| Auth/hồ sơ | Đăng ký, đăng nhập, lấy/sửa hồ sơ, đổi mật khẩu, ghi cân nặng, lấy lịch sử |
| Nhật ký | Lấy nhật ký, thêm/xóa bữa ăn, lập/ghi kế hoạch, áp thực đơn AI |
| Công thức và từ điển | Catalog thật từ backend; tìm/lọc phía client; chi tiết món/nguyên liệu |
| Quán chay | Catalog, đề xuất, đánh giá, tìm gần qua gateway provider, bản đồ/chỉ đường |
| Cộng đồng | Blog/video, upload multipart, comment, vote, report, bài của tôi |
| Chat | FE `/ai/chat/stream` → backend gateway → AI `/api/chat/stream` |
| Thực đơn AI | SSE frontend → gateway → AI; có lịch sử và áp vào nhật ký |
| Quét ảnh món ăn | Frontend → backend → AI vision; lưu generation/history |
| Ảnh nguyên liệu/tra cứu | Nhận diện ảnh → đối chiếu DB; lookup jobs → AI → lưu nguyên liệu |
| Video YouTube | Chat nhận URL → jobs → worker → transcription/summary → polling/history |
| Kiểm duyệt | Tạo/sửa nội dung → job AI → polling trạng thái → admin xử lý |
| Quản trị AI | Models, logs, stats, cache, quota, history có endpoint tương ứng; các lỗi riêng ở trên vẫn cần sửa |

Worker video/moderation/ingredient lookup được khởi động trong server.js. Không kết luận chúng chưa nối chỉ vì frontend không gọi AI trực tiếp; kiến trúc hiện hành là FE → BE → AI.

## Mã chưa dùng và giới hạn rà soát

- notificationService có deleteNotification nhưng server không có DELETE tương ứng; chưa có caller UI nên chưa tính là lỗi đang tác động người dùng.
- authService.recordWeight có tham số recordedAt lệch recordedDate/recorded_date phía backend, nhưng caller hiện chỉ truyền weight; cần chú ý nếu thêm chọn ngày.
- api.js fetch wrapper chưa có caller; không coi chỉ sự tồn tại của wrapper là một luồng hỏng.
- Các đường dẫn legacy `/api/auth`, `/api/workspace`, `/api/blogs`, `/api/admin` có alias backend, không phải lỗi 404 chỉ vì chưa dùng `/v1`.
- Chưa xác minh giao diện ở browser với dữ liệu thật, HTTP xác thực, DB/migrations hiện tại, cấu hình khóa AI/provider, quota thực tế, kết quả mô hình hay tải catalog lớn. Build/test qua không chứng minh các mục này hoạt động đầu cuối.
- Cảnh báo effect của bản đồ và kích thước bundle được ghi nhận để xử lý sau các lỗi chức năng; không coi chúng là bằng chứng map đang hỏng.

## Thứ tự xử lý đề xuất

1. Thông tin đăng nhập công khai và các thao tác quản trị sai contract/khôi phục.
2. Dị ứng, chế độ ăn và trạng thái kết quả scanner.
3. Refresh/logout, chuẩn hóa media, đồng bộ hồ sơ/nhật ký.
4. Phân trang, bộ lọc/log/quota, nhóm danh mục và sắp xếp giá.
5. Các chức năng còn thiếu cần thống nhất nghiệp vụ trước khi triển khai.

Mỗi mục hoặc nhóm có chung nguyên nhân sẽ có commit riêng, kèm kiểm tra tái hiện có ý nghĩa. Bản báo cáo này không xác nhận rằng toàn bộ lỗi có thể tồn tại đã được phát hiện.
