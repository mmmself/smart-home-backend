@echo off
chcp 65001 >nul
REM 一键启动前后端: MySQL + FastAPI(后端) + Vite(前端)
REM 用法: scripts\start.bat
REM 退出: 关闭本窗口或按 Ctrl+C

setlocal
set "ROOT_DIR=%~dp0.."
cd /d "%ROOT_DIR%"

echo === Smart Home 前后端一键启动 ===
echo.

REM ---------- 1. Docker / MySQL ----------
docker ps >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] 请先启动 Docker Desktop
    pause
    exit /b 1
)

echo [1/3] 启动 MySQL...
docker compose up -d
echo 等待 MySQL 就绪...
timeout /t 15 /nobreak >nul

REM ---------- 2. 后端 ----------
echo [2/3] 启动 FastAPI 后端 (单worker)...
echo   服务地址: http://localhost:8000
echo   API 文档: http://localhost:8000/docs
start "SmartHome-Backend" cmd /k "cd /d %ROOT_DIR% && uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 1"

REM ---------- 3. 前端 ----------
echo [3/3] 启动 Vite 前端...
echo   前端地址: http://localhost:3000
if not exist "frontend\node_modules" (
    echo   首次运行,安装前端依赖...
    cd frontend && npm install && cd ..
)
start "SmartHome-Frontend" cmd /k "cd /d %ROOT_DIR%\frontend && npm run dev"

echo.
echo === 启动完成 ===
echo   前端: http://localhost:3000
echo   后端: http://localhost:8000  (文档 /docs)
echo   首次运行请先: python scripts\seed.py --force
echo   关闭两个子窗口即可停止服务
echo.
pause
