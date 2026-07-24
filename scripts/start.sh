#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER_DIR="$PROJECT_DIR/server"

MODE="${1:-dev}"  # dev or prod

case "$MODE" in
  dev|development)
    ENV_SRC="$SERVER_DIR/.env.development"
    FRONT_CMD="npm run dev"
    ;;
  prod|production)
    ENV_SRC="$SERVER_DIR/.env.production"
    echo "[$(date +%H:%M:%S)] 프론트엔드 빌드 중..."
    cd "$PROJECT_DIR"
    npm run build
    FRONT_CMD=""
    ;;
  *)
    echo "사용법: $0 [dev|prod]"
    exit 1
    ;;
esac

echo "[$(date +%H:%M:%S)] ParkON 서버 시작 (mode: $MODE)"

# .env 적용
cp "$ENV_SRC" "$SERVER_DIR/.env"
echo "[$(date +%H:%M:%S)] $ENV_SRC → .env 적용"

# 기존 프로세스 정리
pkill -f "node src/index.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# 백엔드
cd "$SERVER_DIR"
nohup node src/index.js > "$SERVER_DIR/server.log" 2>&1 &
echo "[$(date +%H:%M:%S)] 백엔드 시작 (PID $!, SMTP: $(grep ^SMTP_HOST "$SERVER_DIR/.env" | cut -d= -f2)) → http://localhost:4000"

if [ -n "$FRONT_CMD" ]; then
  cd "$PROJECT_DIR"
  nohup $FRONT_CMD > "$PROJECT_DIR/frontend.log" 2>&1 &
  echo "[$(date +%H:%M:%S)] 프론트엔드 시작 (PID $!) → http://localhost:5173"
else
  echo "[$(date +%H:%M:%S)] 프론트엔드 (Express 내장) → http://localhost:4000"
fi

echo "[$(date +%H:%M:%S)] 시작 완료"
echo ""
echo "  로그:"
echo "    tail -f $SERVER_DIR/server.log"
echo "    tail -f $PROJECT_DIR/frontend.log"
