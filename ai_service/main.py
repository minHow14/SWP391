# ai_service/main.py
import logging
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from core.config import settings
from core.database import init_db
from core.ratelimit import limiter
from api.admin_actions import router as admin_actions_router
from api.chat import router as chat_router
from api.meal_planner import router as meal_planner_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dịch vụ AI chạy ở chế độ Stateless (không kết nối PostgreSQL)
    init_db()
    logger.info("AI Service started successfully.")
    yield
    logger.info("AI Service shutdown.")


app = FastAPI(
    title="Chay Xanh - AI Microservice",
    description="FastAPI AI Microservice cung cấp Chatbot tư vấn dinh dưỡng chay và Lập thực đơn cá nhân hóa.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or f"req_{uuid4().hex[:12]}"
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response


# Nhận diện IP từ proxy Backend Express
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=settings.TRUSTED_PROXIES)


def error_response(request: Request, status_code: int, code: str, message: str, details=None):
    """Chuẩn hóa response lỗi theo API Contract thống nhất toàn dự án."""
    request_id = getattr(request.state, "request_id", None) or f"req_{uuid4().hex[:12]}"
    errors_list = details if isinstance(details, list) else ([details] if details else [])
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "errorCode": code,
            "errors": errors_list,
            "meta": {"requestId": request_id},
        },
        headers={"X-Request-Id": request_id},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return error_response(
        request, 422, "INVALID_INPUT", "Dữ liệu đầu vào không hợp lệ.", jsonable_encoder(exc.errors())
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_error_handler(request: Request, exc: RateLimitExceeded):
    return error_response(
        request,
        429,
        "RATE_LIMIT_EXCEEDED",
        "Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau ít phút.",
        {"limit": str(exc.limit.limit)},
    )


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(request: Request, exc: StarletteHTTPException):
    if isinstance(exc.detail, dict):
        return error_response(
            request,
            exc.status_code,
            exc.detail.get("code", "HTTP_ERROR"),
            exc.detail.get("message", "Đã xảy ra lỗi khi xử lý yêu cầu."),
            exc.detail.get("details"),
        )
    return error_response(request, exc.status_code, "HTTP_ERROR", str(exc.detail))


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error in AI service: {exc}", exc_info=True)
    return error_response(request, 500, "INTERNAL_ERROR", "Đã xảy ra lỗi máy chủ trong dịch vụ AI.")


# Root Endpoint
@app.get("/", tags=["Root"])
async def root():
    return {
        "success": True,
        "message": "Chay Xanh AI Microservice",
        "data": {
            "status": "online",
            "version": "1.0.0",
            "docs": "/docs",
        },
    }


# Health Check Endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "success": True,
        "message": "Dịch vụ AI hoạt động bình thường",
        "data": {"status": "ok"},
    }


# Include Routers under /api
app.include_router(chat_router, prefix="/api")
app.include_router(meal_planner_router, prefix="/api")
app.include_router(admin_actions_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
