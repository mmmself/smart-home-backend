@echo off
echo === Smart Home Backend 启动 ===
echo.

docker ps >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo 请先启动 Docker Desktop
    exit /b 1
)

echo [1/2] 启动 MySQL...
docker compose up -d
echo 等待 MySQL 就绪...
timeout /t 15 /nobreak >nul

echo [2/2] 启动 FastAPI 服务 (单worker)...
echo.
echo 服务地址: http://localhost:8000
echo API 文档: http://localhost:8000/docs
echo.
echo 首次运行请先: python scripts/seed.py --force
echo.
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 1
pause
