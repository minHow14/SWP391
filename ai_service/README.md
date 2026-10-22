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

- `POST /api/chat`, `/api/chat/stream`: đầu vào `message`, `history`, `dietaryType`, `menuContext`.
- `POST /api/meal-planner/generate`, `/api/meal-planner/generate/stream`: `heightCm`, `weightKg`, `age`, `gender`, `goal`, `activityLevel`, `dietaryType`, `allergies`, `availableIngredients`, `bmi`, `days`.
- `POST /api/admin/chatbot-cache/clear`: xóa cache nội bộ; quyền admin được BE kiểm tra.

JSON dùng camelCase; Python nội bộ dùng snake_case qua CamelModel. Response chuẩn `success`, `message`, `data` hoặc `errorCode`, `errors`, `meta.requestId`. SSE gồm `metadata` nội bộ để BE lưu prompt thực tế, `token`/`progress`, `done`/`error`. BE không chuyển metadata chứa prompt cho FE. Thực đơn retry ghi lại prompt từng lần.

Chỉ các endpoint streaming được BE gateway hiện tại sử dụng cho sinh kết quả và lưu lịch sử. Endpoint JSON nội bộ không tự ghi DB.

## Kiểm thử

```powershell
.\venv\Scripts\python.exe -m pytest tests -q
.\venv\Scripts\python.exe -m ruff check agents api core schemas main.py tests
```

Test thay mô hình trong fixture, không gọi provider thật và không dùng DB. Chi tiết lifecycle, API BE và migration: [AI_INTEGRATION.md](../docs/AI_INTEGRATION.md).
