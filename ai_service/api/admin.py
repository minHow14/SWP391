import math
from datetime import date, datetime, time, timedelta
from typing import Any, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import Select, case, func, select
from starlette.concurrency import run_in_threadpool

from core.database import ai_log, run_with_fallback
from core.security import RequestIdentity, require_admin
from core.timezone import VN_TZ

router = APIRouter(prefix="/admin/ai-logs", tags=["Admin - AI Logs"])

# Nhóm chức năng suy ra từ tiền tố cột action: CHAT_GUEST, CHAT_STREAM_USER_5, CHAT_ERROR, MEAL_PLANNER_...
FEATURE = case(
    (ai_log.c.action.like("CHAT%"), "chatbot"),
    (ai_log.c.action.like("MEAL_PLANNER%"), "meal_planner"),
    else_="other",
)


class AILogItem(BaseModel):
    log_id: int
    model_name: Optional[str] = None
    action: Optional[str] = None
    status: str
    error_feedback: Optional[str] = None
    created_at: Optional[datetime] = None


class AILogPage(BaseModel):
    items: List[AILogItem]
    page: int
    page_size: int
    total: int
    total_pages: int


class Counts(BaseModel):
    total: int
    success: int
    error: int
    success_rate: Optional[float] = None  # phần trăm; None khi chưa có log


class FeatureStats(Counts):
    feature: str


class ModelStats(Counts):
    model_name: Optional[str] = None


class DayStats(Counts):
    date: str


class AILogStats(Counts):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    by_feature: List[FeatureStats]
    by_model: List[ModelStats]
    by_day: List[DayStats]


class AILogPageResponse(BaseModel):
    success: bool = True
    data: AILogPage
    meta: dict[str, Any]


class AILogStatsResponse(BaseModel):
    success: bool = True
    data: AILogStats
    meta: dict[str, Any]


def _check_range(date_from: Optional[date], date_to: Optional[date]) -> None:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_INPUT", "message": "date_from không được sau date_to."},
        )


def _filters(
    stmt: Select,
    date_from: Optional[date],
    date_to: Optional[date],
    status_filter: Optional[str] = None,
    feature: Optional[str] = None,
    model_name: Optional[str] = None,
    search: Optional[str] = None,
) -> Select:
    if date_from:
        stmt = stmt.where(ai_log.c.created_at >= datetime.combine(date_from, time.min, tzinfo=VN_TZ))
    if date_to:  # tính trọn ngày date_to
        stmt = stmt.where(
            ai_log.c.created_at < datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=VN_TZ)
        )
    if status_filter:
        stmt = stmt.where(ai_log.c.status == status_filter)
    if feature:
        stmt = stmt.where(FEATURE == feature)
    if model_name:
        stmt = stmt.where(ai_log.c.model_name == model_name)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(ai_log.c.action.ilike(like) | ai_log.c.error_feedback.ilike(like))
    return stmt


def _counts(row) -> dict:
    total, success = int(row.total or 0), int(row.success or 0)
    return {
        "total": total,
        "success": success,
        "error": total - success,
        "success_rate": round(success * 100 / total, 1) if total else None,
    }


_COUNT_COLUMNS = (
    func.count().label("total"),
    func.sum(case((ai_log.c.status == "SUCCESS", 1), else_=0)).label("success"),
)


@router.get("", response_model=AILogPageResponse)
async def list_ai_logs(
    request: Request,
    _admin: RequestIdentity = Depends(require_admin),
    date_from: Optional[date] = Query(None, description="Từ ngày (YYYY-MM-DD), tính cả ngày này"),
    date_to: Optional[date] = Query(None, description="Đến ngày (YYYY-MM-DD), tính cả ngày này"),
    log_status: Optional[Literal["SUCCESS", "ERROR"]] = Query(None, alias="status"),
    feature: Optional[Literal["chatbot", "meal_planner", "other"]] = Query(None, description="Nhóm chức năng"),
    model_name: Optional[str] = Query(None, max_length=255),
    search: Optional[str] = Query(None, max_length=100, description="Tìm trong action hoặc nội dung lỗi"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Danh sách log AI, mới nhất trước, lọc theo ngày, trạng thái, chức năng, model; có phân trang."""
    _check_range(date_from, date_to)

    def query(conn):
        def where(stmt):
            return _filters(stmt, date_from, date_to, log_status, feature, model_name, search)

        total = conn.execute(where(select(func.count()).select_from(ai_log))).scalar() or 0
        rows = conn.execute(
            where(select(ai_log))
            .order_by(ai_log.c.created_at.desc(), ai_log.c.log_id.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
        ).mappings().all()
        return total, rows

    total, rows = await run_in_threadpool(run_with_fallback, query)
    return AILogPageResponse(
        data=AILogPage(
            items=[AILogItem(**row) for row in rows],
            page=page,
            page_size=page_size,
            total=total,
            total_pages=math.ceil(total / page_size) if total else 0,
        ),
        meta={"requestId": request.state.request_id},
    )


@router.get("/stats", response_model=AILogStatsResponse)
async def ai_log_stats(
    request: Request,
    _admin: RequestIdentity = Depends(require_admin),
    date_from: Optional[date] = Query(None, description="Từ ngày (YYYY-MM-DD), tính cả ngày này"),
    date_to: Optional[date] = Query(None, description="Đến ngày (YYYY-MM-DD), tính cả ngày này"),
):
    """Tỷ lệ thành công/lỗi tổng, theo chức năng, theo model và theo ngày (để vẽ biểu đồ)."""
    _check_range(date_from, date_to)

    def query(conn):
        # Ngày theo giờ Việt Nam: PostgreSQL lưu timestamptz nên phải đổi múi giờ trước khi lấy ngày;
        # SQLite dự phòng đã lưu sẵn giờ Việt Nam.
        created_at = ai_log.c.created_at
        if conn.dialect.name == "postgresql":
            created_at = func.timezone("Asia/Ho_Chi_Minh", created_at)
        day = func.date(created_at)

        def grouped(group_column):
            stmt = select(group_column, *_COUNT_COLUMNS).group_by(group_column).order_by(group_column)
            return conn.execute(_filters(stmt, date_from, date_to)).all()

        overall = conn.execute(_filters(select(*_COUNT_COLUMNS), date_from, date_to)).one()
        return overall, grouped(FEATURE.label("feature")), grouped(ai_log.c.model_name), grouped(day.label("day"))

    overall, by_feature, by_model, by_day = await run_in_threadpool(run_with_fallback, query)
    return AILogStatsResponse(
        data=AILogStats(
            **_counts(overall),
            date_from=date_from,
            date_to=date_to,
            by_feature=[FeatureStats(feature=r.feature, **_counts(r)) for r in by_feature],
            by_model=[ModelStats(model_name=r.model_name, **_counts(r)) for r in by_model],
            by_day=[DayStats(date=str(r.day), **_counts(r)) for r in by_day],
        ),
        meta={"requestId": request.state.request_id},
    )
