# AI Microservice - Chay Xanh Nutrition & Meal Planner (SWP391)

Phân hệ dịch vụ trí tuệ nhân tạo (AI Microservice) cho dự án **SWP391 - Vegetarian & Healthy Platform (Chay Xanh)**, xây dựng bằng **FastAPI**, **LangChain**, và mô hình ngôn ngữ lớn **DeepSeek** (hỗ trợ cơ chế dự phòng tự động - Fallback).

---

## 🌟 Tính năng chính

- **Chatbot tư vấn dinh dưỡng chay (`/api/chat`):**
  - Trả lời thắc mắc về thực dưỡng chay, nguồn đạm thực vật, cách kết hợp nguyên liệu tránh thiếu chất (B12, Sắt, Kẽm, Canxi, Omega-3).
  - Tích hợp bộ nhớ đệm (LRU Cache) giúp phản hồi tức thì với các câu hỏi lặp lại.
- **Tạo thực đơn chay theo tuần (`/api/meal-planner`):**
  - Lên kế hoạch ăn uống 7 ngày cá nhân hóa theo mục tiêu calo, loại hình ăn chay (Thuần chay, Chay có sữa, Chay có trứng/sữa) và tiền sử dị ứng thực phẩm.
  - Hỗ trợ phản hồi dạng cấu trúc JSON hoặc luồng dữ liệu thời gian thực (Server-Sent Events - SSE).
- **Cơ chế mô hình dự phòng (LLM Fallback):**
  - Tự động chuyển đổi từ model chính (`deepseek-chat`) sang model dự phòng (`deepseek-v4-pro`) khi gặp sự cố mạng hoặc giới hạn tải.
- **Kiểm soát hạn mức & Chống spam (Quota & Rate Limiting):**
  - Quản lý hạn mức dùng thử cho khách vãng lai (Guest Quota: tối đa 3 lượt/ngày).
  - Giới hạn tần suất gọi API theo IP bằng SlowAPI (`30/minute`).
- **Phân hệ quản trị AI (Admin Actions):**
  - Kiểm tra và reset hạn mức cho khách bị chặn.
  - Làm mới (clear) cache câu trả lời của chatbot sau khi cập nhật prompt.
  - Ghi nhật ký kiểm toán (Audit Log) cho mọi hành động quản trị.

---

## 📁 Cấu trúc thư mục

```text
ai_service/
├── .env                       # File cấu hình biến môi trường (API Key, DB, Port...)
├── main.py                    # Entry point FastAPI app, global middlewares, route mounting
├── requirements.txt           # Danh sách thư viện Python
├── agents/                    # Tầng xử lý tác nhân AI (LangChain / LLM)
│   ├── chatbot_agent.py       # Tác nhân chatbot hỏi đáp dinh dưỡng & cache
│   └── meal_planner_agent.py  # Tác nhân tạo thực đơn tuần & tính toán calo
├── api/                       # Tầng định tuyến API endpoints (FastAPI APIRouter)
│   ├── chat.py                # Endpoint /api/chat
│   ├── meal_planner.py        # Endpoint /api/meal-planner
│   ├── admin.py               # Endpoint thống kê & nhật ký AI
│   └── admin_actions.py       # Endpoint quản trị hạn mức & xóa cache
├── core/                      # Cấu hình & tiện ích nền tảng
│   ├── config.py              # Đọc cấu hình từ .env bằng Pydantic BaseSettings
│   ├── database.py            # Kết nối PostgreSQL (kèm tự động fallback sang SQLite)
│   ├── llm.py                 # Khởi tạo mô hình DeepSeek kèm cơ chế fallback
│   ├── nutrition.py           # Thuật toán tính toán năng lượng & dinh dưỡng cơ bản
│   ├── quota.py               # Quản lý số lượt sử dụng của khách theo ngày
│   ├── ratelimit.py           # Cấu hình giới hạn tần suất SlowAPI
│   └── security.py            # Xác thực JWT & phân quyền Admin
├── prompts/                   # Hệ thống câu lệnh chỉ dẫn (System Prompts)
│   ├── chatbot.md             # Prompt định hình chuyên gia dinh dưỡng chay
│   └── meal_planner.md        # Prompt cấu trúc hóa thực đơn dạng JSON
└── tests/                     # Bộ kiểm thử tự động (Pytest)
    ├── test_admin_actions.py  # Test các chức năng can thiệp của Admin
    ├── test_chat.py           # Test luồng hỏi đáp chatbot
    ├── test_llm.py            # Test gọi LLM và cơ chế fallback
    ├── test_meal_planner.py   # Test tạo thực đơn tuần
    └── ...
```

---

## 📡 Danh sách API Endpoints

### 1. Chatbot Dinh dưỡng (`/api/chat`)
| Phương thức | Endpoint | Yêu cầu | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/chat` | Header / Guest | Gửi câu hỏi dinh dưỡng, nhận câu trả lời tư vấn |

### 2. Lập thực đơn tuần (`/api/meal-planner`)
| Phương thức | Endpoint | Yêu cầu | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/meal-planner/generate` | Header / Guest | Tạo thực đơn 7 ngày dạng JSON theo hồ sơ sức khỏe |
| `POST` | `/api/meal-planner/stream` | Header / Guest | Stream thực đơn thời gian thực (SSE) |

### 3. Quản trị AI (`/api/admin`)
| Phương thức | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/guest-quota/{guest_id}` | Admin | Tra cứu số lượt đã dùng và hạn mức còn lại |
| `POST` | `/api/admin/guest-quota/reset` | Admin | Khôi phục lượt sử dụng của khách về 0 |
| `POST` | `/api/admin/chatbot-cache/clear` | Admin | Xóa toàn bộ bộ nhớ cache câu trả lời chatbot |
| `GET` | `/api/admin/logs` | Admin | Xem lịch sử nhật ký tương tác AI |

### 4. Giám sát (`/`)
| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/health` | Kiểm tra trạng thái hoạt động của dịch vụ AI |
| `GET` | `/docs` | Giao diện tài liệu tương tác Swagger UI |
| `GET` | `/redoc` | Giao diện tài liệu ReDoc |

---

## 🚀 Hướng dẫn khởi chạy

### 1. Chuẩn bị môi trường Python:
Khuyến nghị sử dụng Python 3.11 trở lên:
```bash
# Tạo môi trường ảo
python -m venv venv

# Kích hoạt môi trường ảo (Windows PowerShell):
.\venv\Scripts\Activate.ps1

# (Linux / macOS):
source venv/bin/activate
```

### 2. Cài đặt các thư viện:
```bash
pip install -r requirements.txt
```

### 3. Cấu hình biến môi trường `.env`:
Tạo file `.env` trong thư mục `ai_service/`:
```env
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_FALLBACK_MODEL=deepseek-v4-pro

DB_NAME=vegetarian_db
DB_USER=postgres
DB_PASSWORD=12345
DB_HOST=localhost
DB_PORT=5432

JWT_SECRET=replace-with-same-secret-as-server
RATE_LIMIT=30/minute
GUEST_DAILY_LIMIT=3
```

### 4. Chạy dịch vụ AI:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Dịch vụ sẽ khả dụng tại:
- API Base: `http://localhost:8000`
- Swagger Docs: `http://localhost:8000/docs`

### 5. Chạy kiểm thử tự động:
```bash
pytest
```

