import numpy as np
import cv2

from ..config import INSIGHTFACE_ROOT, INSIGHTFACE_NAME

_app = None
_embedding_cache = {}


def _load_embedding_cache():
    global _embedding_cache
    try:
        from ..database import SessionLocal
        from ..models import Face
        db = SessionLocal()
        rows = db.query(Face).all()
        _embedding_cache = {r.id: np.frombuffer(r.embedding, dtype=np.float32) for r in rows}
        db.close()
    except Exception:
        pass


def _rebuild_matrix():
    if not _embedding_cache:
        return None, []
    face_ids = list(_embedding_cache.keys())
    embs = np.vstack([_embedding_cache[fid] for fid in face_ids])
    return embs, face_ids


def add_embedding_cache(face_id: int, emb: np.ndarray):
    _embedding_cache[face_id] = emb.copy()


def remove_embedding_cache(face_id: int):
    _embedding_cache.pop(face_id, None)


def _get_app():
    global _app
    if _app is None:
        from insightface.app import FaceAnalysis
        import os
        root = INSIGHTFACE_ROOT if os.path.isdir(INSIGHTFACE_ROOT) else None
        _app = FaceAnalysis(name=INSIGHTFACE_NAME, root=root, providers=["CPUExecutionProvider"])
        _app.prepare(ctx_id=-1, det_size=(640, 640))
    return _app


def get_embedding(img_path):
    app = _get_app()
    img = cv2.imread(img_path)
    if img is None:
        return None
    faces = app.get(img)
    if not faces:
        return None
    return faces[0].normed_embedding.astype(np.float32)


def cosine(a, b):
    return float(np.dot(a, b))
