# 주차ON 개발 환경 설정

> 버전: v1.0 | 작성일: 2026-06-24

---

## 1. Vite 개발서버 프록시 설정

프론트(`localhost:5173`)에서 백엔드(`localhost:4000`)로 API 요청 시 CORS를 피하기 위해 Vite proxy를 설정합니다.

`vite.config.js`:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
```

이렇게 하면 프론트에서 `fetch('/api/v1/auth/login')`으로 호출 시 자동으로 `http://localhost:4000/api/v1/auth/login`으로 프록시됩니다.

---

## 2. 서버 CORS 설정 (선택)

Vite proxy를 사용하면 CORS가 필요 없지만, 별도 클라이언트(Postman 등)에서 접근하려면 CORS를 활성화합니다.

```js
const cors = require('cors');
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
```

---

## 3. 실행 명령어

```bash
# 프로젝트 루트 (/home/jjiny/work/parkon)

# 프론트 실행 (Vite)
npm run dev

# 서버 실행 (nodemon)
cd server
npm run dev

# 서버 실행 (프로덕션)
cd server
npm start
```

---

## 4. 서버 폴더 초기화

```bash
mkdir -p server/src/{config,db/migrations,db/seeds,middleware,routes,controllers,services,utils}
mkdir -p server/data
cd server
npm init -y
```

### package.json (server/)
```json
{
  "name": "parkon-server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "migrate": "node src/db/migrate.js",
    "seed": "node src/db/seed.js",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.18",
    "better-sqlite3": "^11",
    "jsonwebtoken": "^9",
    "bcrypt": "^5",
    "joi": "^17",
    "cors": "^2",
    "morgan": "^1",
    "winston": "^3",
    "dotenv": "^16",
    "multer": "^1"
  },
  "devDependencies": {
    "vitest": "^2",
    "supertest": "^7",
    "nodemon": "^3"
  }
}
```

---

## 5. 데이터베이스 마이그레이션/시드 스크립트

### db/migrate.js
```js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/parkon.db');
const db = new Database(dbPath);

const sql = fs.readFileSync(path.join(__dirname, 'migrations/001_init.sql'), 'utf8');
db.exec(sql);
console.log('Migration completed.');
db.close();
```

### db/seed.js
```js
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/parkon.db');
const db = new Database(dbPath);

// 비밀번호 해싱 후 INSERT
const hash = bcrypt.hashSync('admin123!', 10);
db.prepare(`INSERT OR IGNORE INTO users ...`).run();
// ... SEED_DATA.md 내용 실행

console.log('Seed completed.');
db.close();
```

---

## 6. .env 파일

```
PORT=4000
NODE_ENV=development
JWT_SECRET=parkon-dev-secret-key-2026
JWT_EXPIRES_IN=24h
DB_PATH=./data/parkon.db
CORS_ORIGIN=http://localhost:5173
```
