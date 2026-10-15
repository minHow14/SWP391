# QUY TẮC AI SERVICE (PYTHON + FASTAPI + PYDANTIC V2)

## 1. Công nghệ chốt cứng (`ai-service/`)
- **Ngôn ngữ & Framework:** Python (≥ 3.11) + **FastAPI** + Uvicorn.
- **Validation & Settings:** **Pydantic v2** và `pydantic-settings`. Bắt buộc dùng cú pháp Pydantic v2 (`model_config = ConfigDict(...)`, `@field_validator`, `model_dump()`), tuyệt đối không dùng cú pháp Pydantic v1 đã deprecated (`class Config:`, `@validator`, `.dict()`).
- **HTTP Client:** Dùng `httpx` (`AsyncClient`) khi cần gọi ngược lại Back-end API.
- **Chất lượng code:** Tuân thủ PEP 8, bắt buộc có **type hints đầy đủ** cho mọi hàm và docstring cho các hàm chính. Dùng **Ruff** để lint/format và **Pytest** để viết test. Ghim phiên bản cụ thể trong `requirements.txt`.

## 2. Cấu trúc thư mục & Phân tách trách nhiệm (SRP)

```text
ai-service/
├── app/
│   ├── api/                  # Khai báo APIRouter, gắn dependency kiểm tra X-Internal-Api-Key
│   ├── core/                 # config.py (BaseSettings), logging.py, security.py, exceptions.py
│   ├── schemas/              # Pydantic v2 models (Request/Response schemas)
│   ├── services/             # Logic điều phối, tiền xử lý / hậu xử lý dữ liệu
│   ├── models/               # Quản lý vòng đời, load và chạy inference mô hình AI/ML
│   └── main.py               # Khởi tạo FastAPI app, lifespan load model, exception handlers
├── tests/                    # Pytest unit & API tests
├── requirements.txt
└── .env.example
```

- **Nguyên tắc cô lập:** AI Service **tuyệt đối không kết nối trực tiếp vào PostgreSQL**. Mọi dữ liệu nghiệp vụ phải do Back-end truyền sang hoặc gọi qua API của Back-end. Không trộn code huấn luyện (training/notebooks) vào trong thư mục `app/`.

## 3. Quy ước JSON CamelCase & Chuẩn Response

- Nội bộ code Python dùng `snake_case` theo đúng chuẩn PEP 8, nhưng mọi JSON giao tiếp với Back-end phải ở dạng `camelCase`.
- Tạo một class `CamelModel` dùng chung trong `app/schemas/base.py`:

  ```python
  from pydantic import BaseModel, ConfigDict
  from pydantic.alias_generators import to_camel

  class CamelModel(BaseModel):
      model_config = ConfigDict(
          alias_generator=to_camel,
          populate_by_name=True,
          from_attributes=True,
      )
  ```

- Mọi Request/Response schema phải kế thừa từ `CamelModel` và trả về cấu trúc đồng nhất với toàn hệ thống: `{ "success": True, "message": "...", "data": ... }` hoặc `{ "success": False, "message": "...", "errorCode": "..." }`.

## 4. Vòng đời Model, Bảo mật & Hiệu năng

- **Xác thực nội bộ:** Mọi endpoint (trừ `GET /health`) bắt buộc gắn dependency kiểm tra header `X-Internal-Api-Key` khớp với `settings.internal_api_key`. Trả về `401`/`403` nếu thiếu hoặc sai key.
- **Load Model 1 lần:** Bắt buộc khởi tạo và nạp trọng số mô hình AI vào bộ nhớ một lần duy nhất khi khởi động server thông qua context manager `lifespan` của FastAPI; tuyệt đối không load lại model ở mỗi request.
- **Không bịa kết quả AI:** Nếu model chưa sẵn sàng, đầu vào không hợp lệ hoặc quá trình inference gặp lỗi, phải ném ngoại lệ rõ ràng (`503 Service Unavailable` hoặc `422 Unprocessable Entity`), cấm trả về dữ liệu giả/hard-code.
- **Bất đồng bộ:** Không làm nghẽn (block) event loop chính của FastAPI với các tác vụ tính toán CPU/GPU nặng (sử dụng `run_in_threadpool`, `BackgroundTasks`, hoặc streaming qua `StreamingResponse` / SSE khi sinh văn bản dài).
