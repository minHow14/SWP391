# Chay Xanh AI Service

FastAPI/Pydantic v2 cung cấp chatbot và thực đơn chay qua HTTP nội bộ. AI không kết nối PostgreSQL/SQLite, không kiểm tra JWT người dùng, không sở hữu quota hay bảng nhật ký. BE xác thực người dùng, quản lý quota, lưu prompt/kết quả và quyền admin.

## Chạy local

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Điền INTERNAL_API_KEY giống BE (≥32 ký tự), DEEPSEEK_API_KEY và model cần dùng.
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Python ≥3.11. Dependencies ghim phiên bản đã kiểm thử trong requirements.txt. Không cần PostgreSQL driver, SQLAlchemy, SQLite hoặc PyJWT. File SQLite cũ nếu còn trên máy không được dịch vụ sử dụng.

## API và bảo mật

`GET /health` công khai. Mọi endpoint nghiệp vụ yêu cầu `X-Internal-Api-Key`; chỉ BE giữ key. `X-User-Id`/`X-Guest-Id` là danh tính BE đã xác thực, không phải dữ liệu tin cậy từ FE trực tiếp. Swagger: `/docs`, OpenAPI: `/openapi.json`.

AI không nhận role để phân quyền: đã bỏ `X-User-Role` và `user_role`. JWT, trạng thái tài khoản, quyền admin và quyền đọc lịch sử đều do BE kiểm tra trước khi gọi AI. Header JWT/role tự gửi không thay thế được khóa nội bộ; AI không giải mã hay chuyển tiếp JWT.

- `POST /api/chat`, `/api/chat/stream`: đầu vào `message`, `history`, `dietaryType`, `menuContext`.
- `POST /api/meal-planner/generate`, `/api/meal-planner/generate/stream`: `heightCm`, `weightKg`, `age`, `gender`, `goal`, `activityLevel`, `dietaryType`, `allergies`, `availableIngredients`, `bmi`, `days`.
- `POST /api/admin/chatbot-cache/clear`: xóa cache nội bộ; quyền admin được BE kiểm tra.
- `POST /api/food-scanner/analyze`: JPEG/PNG/WebP base64, ảnh sau giải mã tối đa 10 MiB. Kiểm tra base64, signature/MIME trước khi gọi model. Model trả JSON đúng schema; thiếu key/model không hỗ trợ ảnh/provider lỗi trả `503 FOOD_SCAN_UNAVAILABLE`, kết quả JSON sai trả `502 FOOD_SCAN_INVALID_OUTPUT`. Không có fallback thành phần hay dinh dưỡng giả; `nutritionEstimate` không biết là `null`.
- `POST /api/video-recipe-transcriptions/stream`, `/api/video-recipe-summaries`: BE worker gọi nội bộ để tải/chuyển lời nói tiếng Việt bằng Groq rồi sinh công thức từ transcript. `GROQ_API_KEY` chỉ đặt ở AI Service. yt-dlp và imageio-ffmpeg đã có trong requirements; `VIDEO_FFMPEG_PATH` chỉ cần khi muốn dùng FFmpeg riêng. Không ghi job, transcript hoặc công thức vào DB từ Python.
- `POST /api/v1/content-moderations`: kiểm duyệt văn bản blog/bình luận, nhận snapshot từ worker và trả verdict `ALLOW`/`REVIEW`, lý do, bằng chứng và tên model. Không ghi DB; lỗi provider không tạo kết quả cho phép giả. `CONTENT_MODERATION_TIMEOUT_SECONDS=20` mặc định, cần nhỏ hơn timeout HTTP worker BE (mặc định 30 giây).

JSON dùng camelCase; Python nội bộ dùng snake_case qua CamelModel. Response chuẩn `success`, `message`, `data` hoặc `errorCode`, `errors`, `meta.requestId`. SSE gồm `metadata` nội bộ để BE lưu prompt thực tế, `token`/`progress`, `done`/`error`. BE không chuyển metadata chứa prompt cho FE. Thực đơn retry ghi lại prompt từng lần.

Chatbot/thực đơn qua gateway dùng streaming để sinh kết quả và lưu lịch sử. Kiểm duyệt dùng JSON từ worker local; worker lưu verdict vào `content_moderation_jobs`. Endpoint JSON nội bộ không tự ghi DB. Chính sách cho phép món chay có trứng/sữa và tên như “sườn chay”; chỉ nhắc tên món không đủ để gắn cờ. Xem [hướng dẫn kiểm duyệt](../docs/CONTENT_MODERATION.md) và [OpenAPI](../docs/content-moderation-openapi.json).

## Kiểm thử

```powershell
.\venv\Scripts\python.exe -m pytest tests -q
.\venv\Scripts\python.exe -m ruff check agents api core schemas main.py tests
```

Test thay mô hình trong fixture, không gọi provider thật và không dùng DB. Chi tiết lifecycle, API BE và migration: [AI_INTEGRATION.md](../docs/AI_INTEGRATION.md).

Worker video tự khởi chạy cùng API Express; không cần mở worker Python hoặc một dịch vụ hàng đợi riêng. Food Scanner dùng model được cấu hình trong `core/llm.py`, deadline 35 giây mỗi lần gọi model; tổng thời gian có thể gồm retry/fallback. BE có deadline `AI_TIMEOUT_MS` riêng. Dinh dưỡng `null` cần được client trình bày đúng giới hạn của ảnh, không đổi thành số 0; giới hạn của ảnh được nêu trong `summary`.
