from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from ..database import get_db
from ..models import OpLog
from ..schemas import resp
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api")

TZ = timezone(timedelta(hours=8))


@router.get("/logs")
def list_logs(
    action: str = Query(default=""),
    start: str = Query(default=""),
    end: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(OpLog)
    if action:
        q = q.filter(OpLog.action == action)
    if start:
        try:
            start_dt = datetime.fromisoformat(start)
            q = q.filter(OpLog.ts >= start_dt)
        except ValueError:
            pass
    if end:
        try:
            end_dt = datetime.fromisoformat(end)
            q = q.filter(OpLog.ts <= end_dt)
        except ValueError:
            pass

    total = q.count()
    items = q.order_by(desc(OpLog.ts)).offset((page - 1) * size).limit(size).all()

    return resp({
        "total": total,
        "items": [{
            "id": log.id,
            "action": log.action,
            "target": log.target,
            "operator": log.operator,
            "detail": log.detail,
            "ts": log.ts.isoformat() if log.ts else None,
        } for log in items],
    })
