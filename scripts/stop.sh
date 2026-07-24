#!/usr/bin/env bash
set -euo pipefail

echo "[$(date +%H:%M:%S)] ParkON 서버 중지..."

pkill -f "node src/index.js" 2>/dev/null && echo "  백엔드 중지됨" || echo "  백엔드 실행 중 아님"
pkill -f "vite" 2>/dev/null && echo "  프론트엔드 중지됨" || echo "  프론트엔드 실행 중 아님"

echo "[$(date +%H:%M:%S)] 중지 완료"
