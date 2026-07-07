import logging
from ..config import SERVERCHAN_KEY
import requests

logger = logging.getLogger(__name__)


def push_stranger(snapshot_url: str = "", score: float = 0.0) -> bool:
    if not SERVERCHAN_KEY:
        logger.info(f"陌生人告警(未配置Server酱): score={score}, url={snapshot_url}")
        return False
    try:
        resp = requests.post(
            f"https://sctapi.ftqq.com/{SERVERCHAN_KEY}.send",
            data={
                "title": "⚠️陌生人告警",
                "desp": f"检测到陌生人尝试进入\n匹配分数: {score:.4f}\n截图: {snapshot_url}",
            },
            timeout=10,
        )
        logger.info(f"通知推送结果: {resp.text}")
        return resp.status_code == 200
    except Exception as e:
        logger.warning(f"推送通知失败: {e}")
        return False
