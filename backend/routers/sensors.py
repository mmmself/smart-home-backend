from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc, text
from ..database import get_db
from ..models import SensorData
from ..schemas import resp
from datetime import datetime

router = APIRouter(prefix="/api")


@router.get("/sensors/latest")
def sensors_latest(db: Session = Depends(get_db)):
    metrics = ["temperature", "humidity"]
    result = {}
    latest_ts = None
    for metric in metrics:
        sd = db.query(SensorData).filter(SensorData.metric == metric).order_by(SensorData.ts.desc()).first()
        if sd:
            result[metric] = sd.value
            if latest_ts is None or (sd.ts and sd.ts > latest_ts):
                latest_ts = sd.ts
    result["ts"] = latest_ts.isoformat() if latest_ts else None
    return resp(result)


@router.get("/sensors/history")
def sensors_history(
    metric: str = Query(default="temperature"),
    start: str = Query(default=""),
    end: str = Query(default=""),
    interval: str = Query(default="5m"),
    db: Session = Depends(get_db),
):
    bucket_seconds = 300
    if interval.endswith("m"):
        bucket_seconds = int(interval[:-1]) * 60
    elif interval.endswith("h"):
        bucket_seconds = int(interval[:-1]) * 3600

    group_expr = f"FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(ts)/{bucket_seconds})*{bucket_seconds})"
    cols = f"{group_expr} as bucket, AVG(value) as avg, MAX(value) as max, MIN(value) as min"

    q = db.query(
        text(group_expr).label("bucket"),
        sqlfunc.avg(SensorData.value).label("avg"),
        sqlfunc.max(SensorData.value).label("max"),
        sqlfunc.min(SensorData.value).label("min"),
    ).filter(SensorData.metric == metric)

    if start:
        try:
            q = q.filter(SensorData.ts >= datetime.fromisoformat(start))
        except ValueError:
            pass
    if end:
        try:
            q = q.filter(SensorData.ts <= datetime.fromisoformat(end))
        except ValueError:
            pass

    q = q.group_by(text("bucket")).order_by(text("bucket"))
    rows = q.all()

    result = [{"ts": r.bucket.isoformat() if hasattr(r.bucket, 'isoformat') else str(r.bucket),
               "avg": round(float(r.avg), 2) if r.avg else None,
               "max": round(float(r.max), 2) if r.max else None,
               "min": round(float(r.min), 2) if r.min else None}
              for r in rows]
    return resp(result)
