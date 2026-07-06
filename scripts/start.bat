@echo off
echo === Smart Home Backend 一键启动 ===
echo.

docker ps >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo 请先启动 Docker Desktop
    exit /b 1
)

echo [1/3] 启动 MySQL...
docker compose up -d
echo 等待 MySQL 就绪...
timeout /t 15 /nobreak >nul

echo [2/3] 初始化数据库 + 种子数据...
python scripts/seed.py

echo [3/3] 启动 FastAPI 服务...
echo.
echo 服务地址: http://localhost:8000
echo API 文档: http://localhost:8000/docs
echo.
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
