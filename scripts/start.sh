#!/bin/bash
# 一键启动前后端: MySQL + FastAPI(后端) + Vite(前端)
# 用法: bash scripts/start.sh
# 退出: Ctrl+C 会自动清理后端和前端进程

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 激活虚拟环境(如果存在)
if [ -f ".venv/bin/activate" ]; then
    # shellcheck disable=SC1091
    source .venv/bin/activate
fi

echo "=== Smart Home 前后端一键启动 ==="
echo ""

# ---------- 1. Docker / MySQL ----------
if ! docker ps > /dev/null 2>&1; then
    echo "[ERROR] 请先启动 Docker Desktop"
    exit 1
fi

echo "[1/3] 启动 MySQL..."
docker compose up -d
echo "等待 MySQL 就绪..."
sleep 15

# ---------- 2. 后端 ----------
echo "[2/3] 启动 FastAPI 后端 (单worker)..."
echo "  服务地址: http://localhost:8000"
echo "  API 文档: http://localhost:8000/docs"
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 1 &
BACKEND_PID=$!
echo "  后端 PID: $BACKEND_PID"

# ---------- 3. 前端 ----------
echo "[3/3] 启动 Vite 前端..."
echo "  前端地址: http://localhost:3000"
if [ ! -d "frontend/node_modules" ]; then
    echo "  首次运行,安装前端依赖..."
    (cd frontend && npm install)
fi
(cd frontend && npm run dev) &
FRONTEND_PID=$!
echo "  前端 PID: $FRONTEND_PID"

echo ""
echo "=== 启动完成 ==="
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:8000  (文档 /docs)"
echo "  首次运行请先: python scripts/seed.py --force"
echo "  按 Ctrl+C 退出并清理进程"
echo ""

# ---------- 清理函数 ----------
cleanup() {
    echo ""
    echo "收到退出信号,正在清理子进程..."
    kill "$FRONTEND_PID" 2>/dev/null
    kill "$BACKEND_PID" 2>/dev/null
    wait "$FRONTEND_PID" 2>/dev/null
    wait "$BACKEND_PID" 2>/dev/null
    echo "已退出。"
    exit 0
}

# 捕获 Ctrl+C / 终止信号
trap cleanup INT TERM

# 等待子进程退出(任一退出则全部停止)
wait -n "$BACKEND_PID" "$FRONTEND_PID"
echo "检测到子进程退出,清理剩余进程..."
cleanup
