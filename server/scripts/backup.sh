#!/usr/bin/env bash
set -euo pipefail

# ParkON 데이터베이스 백업 스크립트
# 사용법: ./backup.sh [백업디렉토리]
# 기본 백업 경로: /home/parkon/backups

BACKUP_DIR="${1:-/home/parkon/backups}"
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DB_DIR="$PROJECT_DIR/server/data"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "[$(date +%H:%M:%S)] ParkON DB 백업 시작..."

# WAL checkpoint
cd "$PROJECT_DIR/server"
node -e "
const Database = require('better-sqlite3');
const db = new Database('$DB_DIR/parkon.db');
db.pragma('wal_checkpoint(TRUNCATE)');
db.close();
" 2>/dev/null || true

cp "$DB_DIR/parkon.db" "$BACKUP_DIR/parkon_$DATE.db"

# 오래된 백업 삭제 (30일)
find "$BACKUP_DIR" -name 'parkon_*.db' -mtime +30 -delete

echo "[$(date +%H:%M:%S)] 백업 완료: parkon_$DATE.db ($(du -h "$BACKUP_DIR/parkon_$DATE.db" | cut -f1))"
