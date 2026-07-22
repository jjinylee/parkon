#!/usr/bin/env bash
set -euo pipefail

# ==============================================================
# 주차ON (ParkON) 상용 환경 설치 스크립트
# 대상: Ubuntu 22.04+ / Node.js 18+
# 사용법:
#   ./install.sh                      # 대화형 모드
#   ./install.sh --non-interactive    # 무인 모드 (.env.install 필요)
#   ./install.sh --help               # 도움말
# ==============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_DIR="$PROJECT_DIR/server"
DIST_DIR="$PROJECT_DIR/dist"

# 색상
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

log()   { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()    { echo -e "  ${GREEN}✔${NC} $1"; }
warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "  ${RED}✘${NC} $1"; exit 1; }

ask() {
  local prompt="$1" default="$2" val
  read -r -p "$(echo -e "${YELLOW}${prompt}${NC} [$default]: ")" val
  echo "${val:-$default}"
}

confirm() {
  local prompt="$1"
  local ans
  read -r -p "$(echo -e "${YELLOW}${prompt} (y/N)${NC}: ")" ans
  [[ "$ans" =~ ^[Yy]$ ]]
}

# ==============================================================
# 설정 기본값
# ==============================================================
NON_INTERACTIVE=false
INSTALL_DIR="/home/parkon"
SERVER_DOMAIN=""
SMTP_HOST=""; SMTP_PORT=""; SMTP_USER=""; SMTP_PASS=""; SMTP_FROM=""
JWT_SECRET=""
INSTALL_NGINX=true
INSTALL_SSL=false
SETUP_FIREWALL=true
MODE="production"

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --non-interactive) NON_INTERACTIVE=true ;;
      --dir) INSTALL_DIR="$2"; shift ;;
      --domain) SERVER_DOMAIN="$2"; shift ;;
      --help) show_help; exit 0 ;;
      *) warn "알 수 없는 옵션: $1"; show_help; exit 1 ;;
    esac
    shift
  done
}

show_help() {
  cat <<EOF
사용법: ./install.sh [옵션]

옵션:
  --non-interactive    무인 설치 모드 (./server/.env.install 파일 필요)
  --dir <경로>         설치 디렉토리 (기본: /home/parkon)
  --domain <도메인>    서비스 도메인 (예: parkon.example.com)
  --help               이 도움말

무인 설치 시 필요한 .env.install:
  JWT_SECRET=...
  SERVER_DOMAIN=parkon.example.com
  SMTP_HOST=smtp.example.com
  SMTP_PORT=587
  SMTP_USER=...
  SMTP_PASS=...
  SMTP_FROM=parkon@example.com
EOF
}

load_env_install() {
  local env_file="$SERVER_DIR/.env.install"
  if [[ ! -f "$env_file" ]]; then
    fail ".env.install 파일을 찾을 수 없습니다: $env_file"
  fi
  log "설정 파일 로드: $env_file"
  set -a; source "$env_file"; set +a
  SERVER_DOMAIN="${SERVER_DOMAIN:-}"
  JWT_SECRET="${JWT_SECRET:-}"
  SMTP_HOST="${SMTP_HOST:-}"; SMTP_PORT="${SMTP_PORT:-}"
  SMTP_USER="${SMTP_USER:-}"; SMTP_PASS="${SMTP_PASS:-}"
  SMTP_FROM="${SMTP_FROM:-}"
}

# ==============================================================
# 시스템 사전 확인
# ==============================================================
check_prerequisites() {
  log "시스템 사전 요구사항 확인..."

  # OS 확인
  if [[ ! -f /etc/os-release ]]; then
    fail "지원되지 않는 OS입니다. Ubuntu 22.04+가 필요합니다."
  fi
  source /etc/os-release
  if [[ "$ID" != "ubuntu" ]]; then
    fail "지원되지 않는 OS: $ID. Ubuntu가 필요합니다."
  fi
  ok "OS: Ubuntu $VERSION_ID"

  # 아키텍처
  local arch
  arch=$(uname -m)
  if [[ "$arch" != "x86_64" && "$arch" != "aarch64" ]]; then
    fail "지원되지 않는 아키텍처: $arch"
  fi
  ok "아키텍처: $arch"

  # sudo 권한 확인
  if ! sudo -n true 2>/dev/null; then
    warn "sudo 권한이 필요합니다. 암호를 입력해야 할 수 있습니다."
  fi

  # 디스크 용량 확인
  local avail
  avail=$(df /home --output=avail 2>/dev/null | tail -1 || echo "0")
  if [[ "$avail" -lt 5000000 ]]; then
    fail "디스크 여유 공간 부족 (최소 5GB 필요)"
  fi
  ok "디스크 여유 공간 확인 완료"
}

# ==============================================================
# 시스템 패키지 설치
# ==============================================================
install_system_packages() {
  log "시스템 패키지 설치..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq curl git build-essential python3 nginx ufw
  ok "시스템 패키지 설치 완료"
}

# ==============================================================
# Node.js 설치
# ==============================================================
install_nodejs() {
  log "Node.js 설치 확인..."

  if command -v node &>/dev/null; then
    local ver
    ver=$(node --version | sed 's/v//' | cut -d. -f1)
    if [[ "$ver" -ge 18 ]]; then
      ok "Node.js $(node --version) 이미 설치됨"
      return
    fi
    warn "Node.js 버전 ${ver} < 18, 업데이트 필요"
  fi

  log "Node.js 18.x 설치 중..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
  ok "Node.js $(node --version) 설치 완료"
}

# ==============================================================
# PM2 설치
# ==============================================================
install_pm2() {
  log "PM2 설치 확인..."
  if command -v pm2 &>/dev/null; then
    ok "PM2 $(pm2 --version) 이미 설치됨"
    return
  fi
  sudo npm install -g pm2
  ok "PM2 $(pm2 --version) 설치 완료"
}

# ==============================================================
# 프로젝트 디렉토리 설정
# ==============================================================
setup_project_dir() {
  log "프로젝트 디렉토리 설정..."

  if [[ "$PROJECT_DIR" == "$INSTALL_DIR" ]]; then
    ok "현재 위치가 설치 대상 디렉토리와 동일합니다: $INSTALL_DIR"
    return
  fi

  if [[ -d "$INSTALL_DIR/dist" ]]; then
    if confirm "대상 디렉토리($INSTALL_DIR)에 이미 프로젝트가 있습니다. 덮어쓸까요?"; then
      rm -rf "$INSTALL_DIR"
    else
      fail "설치를 중단합니다."
    fi
  fi

  sudo mkdir -p "$INSTALL_DIR"
  sudo chown "$USER:$USER" "$INSTALL_DIR"

  log "프로젝트 파일 복사 중..."
  rsync -avz \
    --exclude 'node_modules' \
    --exclude 'data/parkon.db*' \
    --exclude '.env' \
    --exclude 'logs' \
    "$PROJECT_DIR/" "$INSTALL_DIR/" 2>/dev/null || {
    cp -r "$PROJECT_DIR"/* "$INSTALL_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_DIR"/.[!.]* "$INSTALL_DIR/" 2>/dev/null || true
  }
  ok "프로젝트 파일 복사 완료: $INSTALL_DIR"
}

# ==============================================================
# npm 의존성 설치
# ==============================================================
install_dependencies() {
  local dir="$1" # 설치할 디렉토리

  log "백엔드 의존성 설치..."
  (cd "$dir/server" && npm install --production --loglevel=error)
  ok "백엔드 의존성 설치 완료"

  log "프론트엔드 의존성 설치..."
  (cd "$dir" && npm install --loglevel=error)
  ok "프론트엔드 의존성 설치 완료"
}

# ==============================================================
# 프론트엔드 빌드
# ==============================================================
build_frontend() {
  log "프론트엔드 빌드..."
  (cd "$INSTALL_DIR" && npm run build)
  if [[ ! -d "$INSTALL_DIR/dist" ]]; then
    fail "빌드 실패: dist 디렉토리가 생성되지 않았습니다."
  fi
  ok "프론트엔드 빌드 완료 (dist/)"
}

# ==============================================================
# 환경 변수 설정
# ==============================================================
setup_env() {
  log "환경 변수 설정..."

  local env_file="$SERVER_DIR/.env"

  if $NON_INTERACTIVE; then
    JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 32)}"
  else
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}  환경 변수 입력${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"

    SERVER_DOMAIN=$(ask "서비스 도메인 (예: parkon.example.com)" "${SERVER_DOMAIN:-}")
    JWT_SECRET=$(ask "JWT 시크릿 (엔터=&nbsp;랜덤생성)" "$(openssl rand -base64 32)")
    echo ""
    echo "SMTP 설정 (메일 발송 기능 사용 시)"
    SMTP_HOST=$(ask "SMTP 호스트" "${SMTP_HOST:-smtp.example.com}")
    SMTP_PORT=$(ask "SMTP 포트" "${SMTP_PORT:-587}")
    SMTP_USER=$(ask "SMTP 사용자" "${SMTP_USER:-}")
    SMTP_PASS=$(ask "SMTP 비밀번호" "${SMTP_PASS:-}")
    SMTP_FROM=$(ask "발신 이메일" "${SMTP_FROM:-parkon@example.com}")
  fi

  cat > "$env_file" <<EOF
# ParkON Server Configuration
PORT=4000
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
DB_PATH=./data/parkon.db
CORS_ORIGIN=https://${SERVER_DOMAIN:-localhost}

# SMTP
SMTP_HOST=${SMTP_HOST:-localhost}
SMTP_PORT=${SMTP_PORT:-1025}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
SMTP_FROM=${SMTP_FROM:-parkon@example.com}
EOF

  chmod 600 "$env_file"
  ok "환경 변수 설정 완료: $env_file"
}

# ==============================================================
# 데이터베이스 초기화
# ==============================================================
init_database() {
  log "데이터베이스 초기화..."

  local data_dir="$SERVER_DIR/data"
  mkdir -p "$data_dir"

  # 기존 DB 정리
  rm -f "$data_dir/parkon.db" "$data_dir/parkon.db-shm" "$data_dir/parkon.db-wal"

  # 마이그레이션
  (cd "$SERVER_DIR" && node src/db/migrate.js)
  ok "마이그레이션 완료"

  # 시드 데이터
  (cd "$SERVER_DIR" && node src/db/seed.js)
  ok "시드 데이터 입력 완료"

  # 업로드 디렉토리
  mkdir -p "$SERVER_DIR/uploads/templates"
  ok "업로드 디렉토리 생성 완료"

  # 로그 디렉토리
  mkdir -p "$SERVER_DIR/logs"
  ok "로그 디렉토리 생성 완료"
}

# ==============================================================
# Nginx 설정
# ==============================================================
setup_nginx() {
  log "Nginx 설정..."

  local domain="${SERVER_DOMAIN:-localhost}"
  local nginx_conf="/etc/nginx/sites-available/parkon"

  # Nginx 설정 파일 생성
  sudo tee "$nginx_conf" > /dev/null <<'NGINX_EOF'
server {
    listen 80;
    server_name _DOMAIN_;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _DOMAIN_;

    ssl_certificate     /etc/letsencrypt/live/_DOMAIN_/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/_DOMAIN_/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root _ROOT_;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 200M;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
    gzip_vary on;
}
NGINX_EOF

  # _DOMAIN_, _ROOT_ 치환
  sudo sed -i "s|_DOMAIN_|${domain}|g" "$nginx_conf"
  sudo sed -i "s|_ROOT_|${INSTALL_DIR}/dist|g" "$nginx_conf"

  # HTTP-only 설정 (SSL 없을 때)
  if ! $INSTALL_SSL; then
    sudo tee "$nginx_conf" > /dev/null <<'NGINX_HTTP_EOF'
server {
    listen 80;
    server_name _DOMAIN_;

    root _ROOT_;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 200M;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
    gzip_vary on;
}
NGINX_HTTP_EOF
    sudo sed -i "s|_DOMAIN_|${domain}|g" "$nginx_conf"
    sudo sed -i "s|_ROOT_|${INSTALL_DIR}/dist|g" "$nginx_conf"
  fi

  # 설정 활성화
  if [[ -f /etc/nginx/sites-enabled/default ]]; then
    sudo rm /etc/nginx/sites-enabled/default
  fi
  sudo ln -sf "$nginx_conf" /etc/nginx/sites-enabled/

  sudo nginx -t || fail "Nginx 설정 문법 오류"
  sudo systemctl reload nginx
  ok "Nginx 설정 완료"
}

# ==============================================================
# SSL 인증서 발급 (Let's Encrypt)
# ==============================================================
setup_ssl() {
  if ! $INSTALL_SSL; then
    warn "SSL 인증서 발급을 건너뜁니다. --domain 옵션으로 도메인을 설정하세요."
    return
  fi

  local domain="${SERVER_DOMAIN:-}"
  if [[ -z "$domain" || "$domain" == "localhost" ]]; then
    warn "유효한 도메인이 없어 SSL 발급을 건너뜁니다."
    return
  fi

  log "Let's Encrypt SSL 인증서 발급..."

  if ! command -v certbot &>/dev/null; then
    sudo apt-get install -y -qq certbot python3-certbot-nginx
  fi

  sudo certbot --nginx -d "$domain" --non-interactive --agree-tos \
    --email "admin@${domain}" || {
    warn "SSL 인증서 발급 실패. 나중에 수동으로 실행하세요:"
    echo "  sudo certbot --nginx -d $domain"
    return
  }

  # Nginx 재시작 (certbot이 자동으로 설정 변경)
  sudo systemctl reload nginx
  ok "SSL 인증서 발급 완료: $domain"
}

# ==============================================================
# PM2 서비스 등록
# ==============================================================
setup_pm2() {
  log "PM2 서비스 등록..."

  # ecosystem.config.js 생성
  cat > "$SERVER_DIR/ecosystem.config.js" <<'EOF'
module.exports = {
  apps: [{
    name: 'parkon-server',
    script: 'src/index.js',
    cwd: '_SERVER_DIR_',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production' },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true,
    max_restarts: 10,
    restart_delay: 2000,
    watch: false,
  }]
};
EOF
  sed -i "s|_SERVER_DIR_|${SERVER_DIR}|g" "$SERVER_DIR/ecosystem.config.js"

  # PM2 시작
  (cd "$SERVER_DIR" && pm2 start ecosystem.config.js)
  pm2 save

  # 부팅 시 자동 실행
  sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$USER" --hp "$HOME" 2>/dev/null || true
  ok "PM2 서비스 등록 완료"
}

# ==============================================================
# 방화벽 설정
# ==============================================================
setup_firewall() {
  log "방화벽 설정..."
  sudo ufw default deny incoming 2>/dev/null || true
  sudo ufw default allow outgoing 2>/dev/null || true
  sudo ufw allow ssh 2>/dev/null || true
  sudo ufw allow 80/tcp 2>/dev/null || true
  sudo ufw allow 443/tcp 2>/dev/null || true
  sudo ufw --force enable 2>/dev/null || true
  ok "방화벽 설정 완료 (SSH, 80, 443 허용)"
}

# ==============================================================
# 헬스 체크
# ==============================================================
health_check() {
  log "서비스 헬스 체크..."

  sleep 2

  # PM2 프로세스 확인
  if ! pm2 show parkon-server &>/dev/null; then
    warn "PM2 프로세스 'parkon-server'를 찾을 수 없습니다."
    return 1
  fi
  ok "PM2 프로세스 정상"

  # API 헬스 체크
  local health
  health=$(curl -s http://localhost:4000/api/v1/health 2>/dev/null || echo "")
  if echo "$health" | grep -q '"status":"ok"'; then
    ok "API 서버 정상 (http://localhost:4000/api/v1/health)"
  else
    warn "API 서버 응답 없음. 로그를 확인하세요: pm2 logs parkon-server"
    return 1
  fi

  # Nginx 확인
  if curl -s -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200\|301\|302"; then
    ok "Nginx 정상 (HTTP 200)"
  else
    warn "Nginx 응답 확인 실패"
  fi

  return 0
}

# ==============================================================
# 설치 완료 메시지
# ==============================================================
print_summary() {
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════${NC}"
  echo -e "${GREEN}  주차ON 설치 완료!${NC}"
  echo -e "${CYAN}═══════════════════════════════════════${NC}"
  echo ""
  echo -e "  설치 경로:   ${YELLOW}$INSTALL_DIR${NC}"
  echo -e "  API 서버:    ${YELLOW}http://localhost:4000${NC}"
  echo -e "  서비스 URL:  ${YELLOW}http://${SERVER_DOMAIN:-localhost}${NC}"
  echo ""
  echo -e "  ${CYAN}주요 명령어:${NC}"
  echo -e "    pm2 status                  # 프로세스 상태"
  echo -e "    pm2 logs parkon-server      # 실시간 로그"
  echo -e "    pm2 restart parkon-server   # 재시작"
  echo -e "    pm2 stop parkon-server      # 정지"
  echo ""
  if ! $INSTALL_SSL && [[ -n "$SERVER_DOMAIN" && "$SERVER_DOMAIN" != "localhost" ]]; then
    echo -e "  ${YELLOW}⚠ SSL 인증서 미설치${NC}"
    echo -e "    sudo certbot --nginx -d ${SERVER_DOMAIN}"
    echo ""
  fi
  echo -e "  ${CYAN}참고 문서:${NC} server/PRODUCTION_SETUP.md"
  echo ""
}

# ==============================================================
# 메인
# ==============================================================
main() {
  parse_args "$@"

  echo ""
  echo -e "${CYAN}═══════════════════════════════════════${NC}"
  echo -e "${CYAN}  주차ON (ParkON) 설치 스크립트${NC}"
  echo -e "${CYAN}  v1.0 / $(date +%Y-%m-%d\ %H:%M)${NC}"
  echo -e "${CYAN}═══════════════════════════════════════${NC}"
  echo ""

  if $NON_INTERACTIVE; then
    load_env_install
  fi

  # 1. 사전 확인
  log "STEP 1/11: 시스템 사전 요구사항 확인"
  check_prerequisites

  # 2. 시스템 패키지
  log "STEP 2/11: 시스템 패키지 설치"
  install_system_packages

  # 3. Node.js
  log "STEP 3/11: Node.js 설치"
  install_nodejs

  # 4. 프로젝트 디렉토리
  log "STEP 4/11: 프로젝트 디렉토리 설정"
  setup_project_dir

  # 5. npm 의존성
  log "STEP 5/11: npm 의존성 설치"
  install_dependencies "$INSTALL_DIR"

  # 6. 프론트 빌드
  log "STEP 6/11: 프론트엔드 빌드"
  build_frontend

  # 7. 환경 변수
  log "STEP 7/11: 환경 변수 설정"
  setup_env

  # 8. DB 초기화
  log "STEP 8/11: 데이터베이스 초기화"
  init_database

  # 9. Nginx
  log "STEP 9/11: Nginx 설치 및 설정"
  if $INSTALL_NGINX; then
    setup_nginx
  else
    warn "Nginx 설치 건너뜀"
  fi

  # 10. SSL
  if $INSTALL_SSL; then
    setup_ssl
  fi

  # 11. PM2
  log "STEP 10/11: PM2 서비스 등록"
  install_pm2
  setup_pm2

  # 방화벽
  if $SETUP_FIREWALL; then
    log "STEP 11/11: 방화벽 설정"
    setup_firewall
  fi

  # 헬스 체크
  echo ""
  health_check || true

  # 완료
  print_summary
}

main "$@"
