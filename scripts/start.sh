#!/bin/bash
echo "=== Smart Home Backend 启动 ==="
echo ""

if ! docker ps > /dev/null 2>&1; then
    echo "请先启动 Docker Desktop"
    exit 1
fi

echo "[1/2] 启动 MySQL..."
docker compose up -d
echo "等待 MySQL 就绪..."
sleep 15

echo "[2/2] 启动 FastAPI 服务 (单worker)..."
echo ""
echo "服务地址: http://localhost:8000"
echo "API 文档: http://localhost:8000/docs"
echo ""
echo "首次运行请先: python scripts/seed.py --force"
echo ""
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 1
