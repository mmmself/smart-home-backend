from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc, text
from ..database import get_db
from ..models import SensorData
from ..schemas import resp
from datetime import datetime
import logging

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


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
    try:
        if interval.endswith("m"):
            bucket_seconds = int(interval[:-1]) * 60
        elif interval.endswith("h"):
            bucket_seconds = int(interval[:-1]) * 3600
        elif interval.isdigit():
            bucket_seconds = int(interval)
    except (ValueError, IndexError):
        bucket_seconds = 300

    # Build SQL conditions for time filtering
    sql_conditions = "metric = :metric"
    params = {"metric": metric}
    if start:
        try:
            start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
            sql_conditions += " AND ts >= :start_ts"
            params["start_ts"] = start_dt
        except ValueError:
            pass
    if end:
        try:
            end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
            sql_conditions += " AND ts <= :end_ts"
            params["end_ts"] = end_dt
        except ValueError:
            pass

    # Use f-string for bucket (SQLAlchemy text() can't parameterize expressions)
    # Use raw SQL for time bucketing (MySQL specific)
    raw_sql = text(f"""
        SELECT
            FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(ts)/{bucket_seconds})*{bucket_seconds}) as bucket,
            AVG(value) as avg_val,
            MAX(value) as max_val,
            MIN(value) as min_val
        FROM sensor_data
        WHERE {sql_conditions}
        GROUP BY bucket
        ORDER BY bucket
    """)
    
    try:
        rows = db.execute(raw_sql, params).fetchall()
        
        result = [{
            "ts": r.bucket.isoformat() if hasattr(r.bucket, 'isoformat') else str(r.bucket),
            "avg": round(float(r.avg_val), 2) if r.avg_val is not None else None,
            "max": round(float(r.max_val), 2) if r.max_val is not None else None,
            "min": round(float(r.min_val), 2) if r.min_val is not None else None
        } for r in rows]
    except Exception as e:
        logger.error(f"Sensor history query failed: {e}", exc_info=True)
        result = []
    
    return resp(result)
