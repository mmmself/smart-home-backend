from fastapi import APIRouter
from ..schemas import resp
from ..services.camera_service import get_jpeg_bytes, init_camera
import base64
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/camera")


@router.post("/capture")
def capture():
    jpeg_bytes = get_jpeg_bytes()
    if jpeg_bytes is None:
        init_camera()
        jpeg_bytes = get_jpeg_bytes()
    if jpeg_bytes is None:
        return resp(code=1, msg="无法从摄像头读取画面")
    b64 = base64.b64encode(jpeg_bytes).decode("ascii")
    data_url = f"data:image/jpeg;base64,{b64}"
    return resp({"image": data_url})
