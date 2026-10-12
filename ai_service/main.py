import logging
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from core.config import settings
from core.database import init_db
from core.ratelimit import limiter
from api.admin import router as admin_router
from api.admin_actions import router as admin_actions_router
from api.chat import router as chat_router
from api.meal_planner import router as meal_planner_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database connection on startup
    init_db()
    yield


app = FastAPI(
    title="Vegetarian Support System - AI Service",
    description=(
        "FastAPI AI Service providing vegetarian nutrition chatbot "
        "and guest question rate limiting."
    ),
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


# Lớp ngoài cùng: lấy IP thật từ X-Forwarded-For chỉ khi request đến từ proxy tin cậy
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=settings.TRUSTED_PROXIES)


def error_response(request: Request, status_code: int, code: str, message: str, details=None):
    error = {"code": code, "message": message}
    if details is not None:
        error["details"] = details
    # Lỗi chưa xử lý được trả từ lớp ngoài cùng, nằm ngoài request_id_middleware
    request_id = getattr(request.state, "request_id", None) or f"req_{uuid4().hex[:12]}"
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": error,
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
    # Routers raise HTTPException(detail={"code", "message", "details"})
    if isinstance(exc.detail, dict):
        return error_response(
            request, exc.status_code, exc.detail["code"], exc.detail["message"], exc.detail.get("details")
        )
    return error_response(request, exc.status_code, "HTTP_ERROR", str(exc.detail))


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error: {exc}", exc_info=True)
    return error_response(
        request, 503, "SERVICE_UNAVAILABLE", "Hệ thống tạm thời không khả dụng. Vui lòng thử lại sau."
    )


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception):
    # Không trả chi tiết lỗi nội bộ cho client; chi tiết nằm trong log
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return error_response(request, 500, "INTERNAL_ERROR", "Đã xảy ra lỗi khi xử lý yêu cầu.")


# Root Endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint returning service info and documentation links.
    """
    return {
        "service": "Vegetarian Support System - AI Service",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


# Health Check Endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint returning service status.
    """
    return {"status": "ok"}


# Include API Routers under /api
app.include_router(chat_router, prefix="/api")
app.include_router(meal_planner_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(admin_actions_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
