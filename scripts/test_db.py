import sys
sys.path.insert(0, '.')
from backend.database import engine
from sqlalchemy import text
try:
    with engine.connect() as conn:
        r = conn.execute(text('SELECT 1')).fetchone()
        print("✅ DB connected:", r)
except Exception as e:
    print("❌ Failed:", e)
