#!/bin/bash
echo "=== Smart Home Backend 一键启动 ==="
echo ""

if ! docker ps > /dev/null 2>&1; then
    echo "请先启动 Docker Desktop"
    exit 1
fi

echo "[1/3] 启动 MySQL..."
docker compose up -d
echo "等待 MySQL 就绪..."
sleep 15

echo "[2/3] 初始化数据库 + 种子数据..."
python scripts/seed.py

echo "[3/3] 启动 FastAPI 服务..."
echo ""
echo "服务地址: http://localhost:8000"
echo "API 文档: http://localhost:8000/docs"
echo ""
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
