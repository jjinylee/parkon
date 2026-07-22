# 주차ON 상용(시범) 환경 구축 절차서

> 버전: v1.0 | 작성일: 2026-07-01  
> 대상: 리눅스 서버 (Ubuntu 24.04 LTS 기준)

---

## 목차

1. [시스템 구성](#1-시스템-구성)
2. [사전 요구사항](#2-사전-요구사항)
3. [Node.js 설치](#3-nodejs-설치)
4. [프로젝트 배포](#4-프로젝트-배포)
5. [프론트엔드 빌드](#5-프론트엔드-빌드)
6. [환경 변수 설정](#6-환경-변수-설정)
7. [데이터베이스 초기화](#7-데이터베이스-초기화)
8. [Nginx 설치 및 설정](#8-nginx-설치-및-설정)
9. [PM2로 백엔드 서비스 등록](#9-pm2로-백엔드-서비스-등록)
10. [보안 설정](#10-보안-설정)
11. [시스템 서비스 등록 (systemd)](#11-시스템-서비스-등록-systemd)
12. [운영](#12-운영)
13. [장애 대응](#13-장애-대응)
14. [부록](#14-부록)

---

## 1. 시스템 구성

### 아키텍처

```
User ──HTTPS──> Nginx (443)
                  ├── Serves /           → /home/parkon/dist/   (React 정적 파일)
                  ├── /api/*             → proxy_pass localhost:4000
                  ├── /uploads/*         → proxy_pass localhost:4000
                  └── Let's Encrypt (SSL 인증서)

Node.js (PM2) ─── localhost:4000
                  ├── SQLite DB          → /home/parkon/server/data/parkon.db
                  ├── 업로드 파일        → /home/parkon/server/uploads/templates/
                  └── 로그              → /home/parkon/server/logs/
```

### 포트 구성

| 포트 | 용도 | 바인딩 |
|:----:|:-----|:-------|
| 443 | HTTPS (Nginx) | 0.0.0.0 |
| 80 | HTTP → HTTPS 리디렉트 (Nginx) | 0.0.0.0 |
| 4000 | Node.js API 서버 (내부) | 127.0.0.1 |

---

## 2. 사전 요구사항

### 하드웨어 최소 사양

| 항목 | 최소 | 권장 |
|:-----|:----:|:----:|
| CPU | 1 core | 2 core |
| RAM | 1 GB | 2 GB |
| 디스크 | 10 GB | 20 GB |
| OS | Ubuntu 22.04+ | Ubuntu 24.04 LTS |

### 필요한 소프트웨어

- Node.js 18.x 이상
- npm 9.x 이상
- Nginx 1.24 이상
- systemd (서비스 관리)
- 방화벽 (ufw 또는 iptables)
- (선택) Let's Encrypt certbot (SSL)

---

## 3. Node.js 설치

```bash
# Node.js 18.x LTS 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 버전 확인
node --version   # v18.19.1+
npm --version    # 9.x+

# PM2 전역 설치 (프로세스 관리)
sudo npm install -g pm2
pm2 --version
```

---

## 4. 프로젝트 배포

```bash
# 배포 디렉토리 생성
sudo mkdir -p /home/parkon
sudo chown $USER:$USER /home/parkon

# 프로젝트 복사 (Git을 통한 배포 권장)
# 옵션 A: Git clone
git clone <repository-url> /home/parkon

# 옵션 B: 직접 복사 (개발 서버에서 rsync)
rsync -avz --exclude 'node_modules' --exclude 'data/parkon.db*' \
  /home/jjiny/work/parkon/ user@server:/home/parkon/

# 백엔드 의존성 설치
cd /home/parkon/server
npm install --production

# 프론트엔드 의존성 설치
cd /home/parkon
npm install
```

---

## 5. 프론트엔드 빌드

```bash
cd /home/parkon
npm run build
```

빌드 결과물은 `/home/parkon/dist/`에 생성됩니다:
```
dist/
├── index.html
└── assets/
    ├── index-{hash}.css
    └── index-{hash}.js
```

---

## 6. 환경 변수 설정

### `.env` 파일 생성

```bash
cd /home/parkon/server
cp .env.example .env
chmod 600 .env    # 권한 제한
```

### `.env` 상용 설정 예시

```env
# 서버
PORT=4000
NODE_ENV=production

# JWT (반드시 변경!)
JWT_SECRET=your-strong-random-secret-at-least-32-chars
JWT_EXPIRES_IN=24h

# 데이터베이스 경로
DB_PATH=./data/parkon.db

# CORS (Nginx 동일 출처면 http://localhost:4000 사용)
CORS_ORIGIN=https://parkon.example.com

# SMTP (메일 발송)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=parkon@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM=parkon@example.com
```

> **주의**: `JWT_SECRET`은 반드시 변경하세요.  
> 생성 예: `openssl rand -base64 32`

---

## 7. 데이터베이스 초기화

```bash
cd /home/parkon/server

# 마이그레이션 실행
npm run migrate

# 시드 데이터 입력 (최초 1회)
npm run seed

# (선택) 테스트 데이터 30명 추가
node src/db/seed_test_data.js

# DB 파일 확인
ls -la data/
# parkon.db, parkon.db-shm, parkon.db-wal
```

---

## 8. Nginx 설치 및 설정

### Nginx 설치

```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Nginx 설정 파일 생성

```bash
sudo nano /etc/nginx/sites-available/parkon
```

```
server {
    listen 80;
    server_name parkon.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name parkon.example.com;

    # SSL 인증서 경로 (Let's Encrypt 권장)
    ssl_certificate     /etc/letsencrypt/live/parkon.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/parkon.example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 정적 파일 (React 빌드 결과물)
    root /home/parkon/dist;
    index index.html;

    # SPA 라우팅: 존재하지 않는 경로 → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 요청 → Node.js 백엔드
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

        # 요청 크기 제한 (파일 업로드 대비)
        client_max_body_size 200M;
    }

    # 업로드 파일 접근
    location /uploads/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # gzip 압축
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
    gzip_vary on;
}
```

### Nginx 설정 활성화

```bash
sudo ln -sf /etc/nginx/sites-available/parkon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL 인증서 발급 (Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d parkon.example.com
```

---

## 9. PM2로 백엔드 서비스 등록

### PM2 설정 파일 생성

```bash
cd /home/parkon/server
```

`ecosystem.config.js`:
```js
module.exports = {
  apps: [{
    name: 'parkon-server',
    script: 'src/index.js',
    cwd: '/home/parkon/server',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true,
    max_restarts: 10,
    restart_delay: 2000,
    watch: false,
  }]
};
```

### 로그 디렉토리 생성

```bash
mkdir -p /home/parkon/server/logs
```

### PM2로 서비스 시작

```bash
cd /home/parkon/server
pm2 start ecosystem.config.js
pm2 save
```

### PM2 부팅 시 자동 실행

```bash
pm2 startup systemd -u $USER --hp /home/$USER
# → 출력된 명령어를 sudo로 실행
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u <user> --hp /home/<user>
```

### PM2 주요 명령어

```bash
pm2 status                  # 상태 확인
pm2 logs parkon-server      # 실시간 로그
pm2 logs parkon-server --lines 100  # 최근 100줄
pm2 restart parkon-server   # 재시작
pm2 stop parkon-server      # 정지
pm2 delete parkon-server    # 삭제
```

---

## 10. 보안 설정

### 10.1 방화벽 (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

### 10.2 Node.js 프로세스 권한 분리

선택사항. 전용 사용자 생성으로 보안 강화:

```bash
sudo useradd -r -s /bin/false -m -d /home/parkon parkon
sudo chown -R parkon:parkon /home/parkon
# PM2를 parkon 사용자로 실행
sudo -u parkon pm2 start ecosystem.config.js
```

### 10.3 JWT 시크릿 강도 확인

```bash
# 최소 32바이트 랜덤 시크릿 생성
openssl rand -base64 32
# → 출력값을 .env의 JWT_SECRET에 설정
```

### 10.4 정기 보안 점검 항목

| 항목 | 주기 | 확인 |
|:-----|:----:|:-----|
| JWT_SECRET 변경 | 최초 1회 | `.env` 파일 확인 |
| Node.js 버전 | 분기 | `node --version` |
| npm 보안 취약점 | 월 | `npm audit` |
| SSL 인증서 만료 | 월 | `certbot renew --dry-run` |
| 서버 로그 이상 | 주 | `pm2 logs --lines 50` |
| DB 백업 | 일 | 백업 파일 존재 확인 |

---

## 11. 시스템 서비스 등록 (systemd)

PM2를 사용하지 않는 경우, systemd로 직접 관리할 수 있습니다.

```bash
sudo nano /etc/systemd/system/parkon.service
```

```
[Unit]
Description=ParkON Parking Application Server
After=network.target

[Service]
Type=simple
User=parkon
Group=parkon
WorkingDirectory=/home/parkon/server
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production
StandardOutput=append:/home/parkon/server/logs/out.log
StandardError=append:/home/parkon/server/logs/error.log

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable parkon
sudo systemctl start parkon
sudo systemctl status parkon
```

---

## 12. 운영

### 12.1 서비스 상태 확인

```bash
# 전체 상태
pm2 status
curl http://localhost:4000/api/v1/health
# → {"success":true,"data":{"status":"ok"},"message":"서버 정상"}

# Nginx 상태
sudo systemctl status nginx
curl -I https://parkon.example.com
```

### 12.2 로그 확인

```bash
# PM2 로그
pm2 logs parkon-server --lines 50

# Nginx 로그
sudo tail -f /var/log/nginx/parkon.access.log
sudo tail -f /var/log/nginx/parkon.error.log

# 애플리케이션 로그
tail -f /home/parkon/server/logs/out.log
tail -f /home/parkon/server/logs/error.log
```

### 12.3 데이터베이스 백업

```bash
#!/bin/bash
# /home/parkon/server/scripts/backup.sh

BACKUP_DIR=/home/parkon/backups
DB_DIR=/home/parkon/server/data
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# SQLite는 WAL 모드이므로 checkpoint 후 백업
node -e "
const Database = require('better-sqlite3');
const db = new Database('$DB_DIR/parkon.db');
db.pragma('wal_checkpoint(TRUNCATE)');
db.close();
"

# DB 파일 복사
cp $DB_DIR/parkon.db $BACKUP_DIR/parkon_$DATE.db

# 30일 이상된 백업 삭제
find $BACKUP_DIR -name 'parkon_*.db' -mtime +30 -delete

echo "Backup completed: parkon_$DATE.db"
```

```bash
# 크론탭 등록 (매일 새벽 4시)
crontab -e
0 4 * * * /bin/bash /home/parkon/server/scripts/backup.sh
```

### 12.4 데이터베이스 복원

```bash
# 서비스 정지
pm2 stop parkon-server

# 백업 파일 복원
cp /home/parkon/backups/parkon_20260701_040000.db /home/parkon/server/data/parkon.db
rm -f /home/parkon/server/data/parkon.db-shm /home/parkon/server/data/parkon.db-wal

# 서비스 재시작
pm2 start parkon-server
```

### 12.5 업데이트 절차

```bash
# 1. 새 버전 배포
cd /home/parkon
git pull

# 2. 의존성 업데이트
cd server && npm install --production
cd .. && npm install && npm run build

# 3. 마이그레이션 (변경사항이 있을 경우)
cd server && npm run migrate

# 4. 서비스 재시작
pm2 restart parkon-server

# 5. 상태 확인
curl http://localhost:4000/api/v1/health
```

---

## 13. 장애 대응

### 13.1 서버 다운

```
증상: HTTP 502 / 연결 거부
```

```bash
# 1. 프로세스 확인
pm2 status
ps aux | grep "node src/index.js"

# 2. 재시작
pm2 restart parkon-server

# 3. 로그 확인
pm2 logs parkon-server --lines 30

# 4. 디스크 확인
df -h
# → 디스크 부족 시 WAL 파일이 원인일 수 있음
ls -lh /home/parkon/server/data/
```

### 13.2 DB 락 / 성능 저하

```
증상: API 응답 지연, 500 에러
```

```bash
# SQLite WAL 체크포인트 실행
node -e "
const Database = require('better-sqlite3');
const db = new Database('/home/parkon/server/data/parkon.db');
db.pragma('wal_checkpoint(TRUNCATE)');
console.log('WAL checkpoint completed');
db.close();
"
```

### 13.3 업로드 파일 디스크 부족

```bash
# 업로드 디렉토리 용량 확인
du -sh /home/parkon/server/uploads/

# 오래된 업로드 파일 정리
find /home/parkon/server/uploads/ -type f -mtime +90 -delete
```

### 13.4 메일 발송 장애

```
증상: 메일 발송 실패 (mail-send.service.js)
```

```bash
# SMTP 설정 확인
grep -E "^SMTP" /home/parkon/server/.env

# 메일 로그 확인
sqlite3 /home/parkon/server/data/parkon.db \
  "SELECT * FROM mail_logs ORDER BY id DESC LIMIT 10;"
```

---

## 14. 부록

### 14.1 디렉토리 구조

```
/home/parkon/
├── dist/                        # React 빌드 결과물 (Nginx가 서빙)
│   ├── index.html
│   └── assets/
├── server/
│   ├── .env                     # 환경 변수 (DB 비밀번호 등)
│   ├── ecosystem.config.js      # PM2 설정
│   ├── data/
│   │   ├── parkon.db            # SQLite DB (★ 백업 필수)
│   │   ├── parkon.db-shm
│   │   └── parkon.db-wal
│   ├── uploads/
│   │   └── templates/           # 파일 업로드
│   ├── logs/                    # PM2 로그
│   │   ├── out.log
│   │   └── error.log
│   └── src/                     # 백엔드 소스
├── src/                         # 프론트엔드 소스
├── package.json
├── vite.config.js
└── ui-test.cjs                  # UI 테스트
```

### 14.2 배포 전 체크리스트

| # | 항목 | 확인 |
|:-:|:-----|:----:|
| 1 | `JWT_SECRET` 변경 | □ |
| 2 | `CORS_ORIGIN` 도메인 일치 | □ |
| 3 | SMTP 정보 정확 | □ |
| 4 | SSL 인증서 발급 | □ |
| 5 | 방화벽 80/443 포트 오픈 | □ |
| 6 | Nginx 설정 문법 검사 통과 | □ |
| 7 | DB 마이그레이션 정상 | □ |
| 8 | PM2 서비스 정상 기동 | □ |
| 9 | Health Check 통과 (`/api/v1/health`) | □ |
| 10 | HTTPS 접속 확인 | □ |
| 11 | 로그인/회원가입 기능 정상 | □ |
| 12 | DB 백업 크론 등록 | □ |
| 13 | 업로드 디렉토리 권한 확인 | □ |

### 14.3 참고 문서

| 문서 | 위치 |
|:-----|:------|
| API 명세 | `server/API_SPEC.md` |
| DB 스키마 | `server/DB_SCHEMA.md` |
| 요구사항 | `PR.md` |
| 테스트 시나리오 | `test-scenario.md` |
| 테스트 결과 | `server/TEST_RESULTS.md` |
| 설계 문서 | `표준레이아웃설계서.md`, `SERVER_ARCHITECTURE.md` |
