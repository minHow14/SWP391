from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import init_db
from api.chat import router as chat_router


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

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint returning service status.
    """
    return {"status": "ok"}


# Include API Routers under /api
app.include_router(chat_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
