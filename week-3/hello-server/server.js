// ========================================
// 📦 Imports & App Initialization
// ========================================
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// 🗄️  In-Memory Data Stores
// ========================================
let items = [
  { id: 1, name: '첫 번째 아이템', done: false, createdAt: new Date().toISOString() },
  { id: 2, name: '두 번째 아이템', done: true, createdAt: new Date().toISOString() },
];
let nextId = 3;

const startedAt = new Date();
let requestCount = 0;

// ========================================
// 🔧 Middleware
// ========================================
app.use(express.json());

// CORS (간단한 허용) — 로컬 개발 편의
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// 요청 카운터
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) requestCount++;
  next();
});

// 정적 파일 (index.html 서빙)
app.use(express.static(path.join(__dirname)));

// ========================================
// 📡 API Routes — GET
// ========================================

// 헬스체크
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: Math.round((Date.now() - startedAt.getTime()) / 1000),
      startedAt: startedAt.toISOString(),
      requestCount,
    },
  });
});

// 기본 hello — ?name=xxx 지원
app.get('/api/hello', (req, res) => {
  const name = (req.query.name || 'world').toString();
  res.json({
    success: true,
    data: {
      message: `Hello, ${name}!`,
      time: new Date().toISOString(),
    },
  });
});

// 서버 시간
app.get('/api/time', (_req, res) => {
  const now = new Date();
  res.json({
    success: true,
    data: {
      iso: now.toISOString(),
      unix: Math.floor(now.getTime() / 1000),
      locale: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    },
  });
});

// 요청 에코 (헤더/쿼리/메서드 그대로 반환)
app.all('/api/echo', (req, res) => {
  res.json({
    success: true,
    data: {
      method: req.method,
      path: req.path,
      query: req.query,
      headers: req.headers,
      body: req.body,
    },
  });
});

// 상태 코드 테스트 — /api/status/404
app.get('/api/status/:code', (req, res) => {
  const code = parseInt(req.params.code, 10);
  if (Number.isNaN(code) || code < 100 || code > 599) {
    return res.status(400).json({ success: false, message: '유효한 HTTP 상태 코드가 아닙니다.' });
  }
  res.status(code).json({
    success: code >= 200 && code < 400,
    data: { status: code },
    message: `Returned status ${code}`,
  });
});

// ========================================
// 📡 API Routes — Items CRUD
// ========================================

// 목록
app.get('/api/items', (_req, res) => {
  res.json({ success: true, data: items });
});

// 단건
app.get('/api/items/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const item = items.find((it) => it.id === id);
  if (!item) {
    return res.status(404).json({ success: false, message: `id=${id} 아이템을 찾을 수 없습니다.` });
  }
  res.json({ success: true, data: item });
});

// 생성
app.post('/api/items', (req, res) => {
  try {
    const { name, done = false } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, message: 'name(문자열)은 필수입니다.' });
    }
    const newItem = {
      id: nextId++,
      name: name.trim(),
      done: Boolean(done),
      createdAt: new Date().toISOString(),
    };
    items.push(newItem);
    res.status(201).json({ success: true, data: newItem, message: '아이템이 생성되었습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: '아이템 생성 실패' });
  }
});

// 전체 업데이트(PUT) / 부분 업데이트(PATCH)
function updateHandler(req, res) {
  const id = parseInt(req.params.id, 10);
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: `id=${id} 아이템을 찾을 수 없습니다.` });
  }
  const { name, done } = req.body || {};
  if (req.method === 'PUT') {
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, message: 'PUT은 name(문자열) 필수입니다.' });
    }
    items[idx] = { ...items[idx], name: name.trim(), done: Boolean(done) };
  } else {
    if (name !== undefined) items[idx].name = String(name).trim();
    if (done !== undefined) items[idx].done = Boolean(done);
  }
  res.json({ success: true, data: items[idx], message: '아이템이 업데이트되었습니다.' });
}
app.put('/api/items/:id', updateHandler);
app.patch('/api/items/:id', updateHandler);

// 삭제
app.delete('/api/items/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: `id=${id} 아이템을 찾을 수 없습니다.` });
  }
  const [removed] = items.splice(idx, 1);
  res.json({ success: true, data: removed, message: '아이템이 삭제되었습니다.' });
});

// 전체 삭제 (초기화)
app.delete('/api/items', (_req, res) => {
  const count = items.length;
  items = [];
  nextId = 1;
  res.json({ success: true, data: { removed: count }, message: '모든 아이템이 삭제되었습니다.' });
});

// ========================================
// 🚫 404 & Error Handling
// ========================================
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API 엔드포인트를 찾을 수 없습니다.' });
});

// SPA fallback — index.html (Express 5 문법)
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 전역 에러 핸들러
app.use((err, _req, res, _next) => {
  console.error('[server error]', err);
  res.status(500).json({ success: false, message: '서버 내부 오류가 발생했습니다.' });
});

// ========================================
// 🚀 Startup (Local + Vercel Dual-Mode)
// ========================================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Hello Server running on http://localhost:${PORT}`);
    console.log('   Try:');
    console.log(`   - GET    http://localhost:${PORT}/api/hello?name=claude`);
    console.log(`   - GET    http://localhost:${PORT}/api/items`);
    console.log(`   - POST   http://localhost:${PORT}/api/items   {"name":"todo"}`);
    console.log(`   - GET    http://localhost:${PORT}/api/health`);
  });
}
module.exports = app;
