// ============================================================
//  가계부 앱 — Express + Supabase(Postgres)
//  실행:  npm install  →  npm start  →  http://localhost:3000
// ------------------------------------------------------------
//  데이터 흐름:
//    [사용자 입력 (날짜/금액/카테고리/메모/타입)]
//       → [Express Server]
//       → DB(Supabase) 저장
//       → 내역 조회 & 카테고리별 합계 계산
//       → JSON 응답
// ============================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Create a .env file with DATABASE_URL=postgresql://...');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(express.json());
app.use(express.static(__dirname));

// ------------------------------------------------------------
//  스키마 초기화
// ------------------------------------------------------------
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id           SERIAL PRIMARY KEY,
      type         TEXT        NOT NULL CHECK (type IN ('income', 'expense')),
      amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      category     TEXT        NOT NULL,
      memo         TEXT        NOT NULL DEFAULT '',
      occurred_on  DATE        NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS transactions_occurred_on_idx
      ON transactions (occurred_on DESC, id DESC);
  `);
}

// ------------------------------------------------------------
//  유효성 검사 유틸
// ------------------------------------------------------------
const ALLOWED_TYPES = new Set(['income', 'expense']);

// 합계 카테고리 표시에 자주 쓰는 기본 목록 (자유 입력도 허용)
const DEFAULT_CATEGORIES = ['식비', '교통', '주거', '구독료', '경조사', '의료', '쇼핑', '여가', '급여', '기타'];

function parseId(raw) {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isValidDate(value) {
  // YYYY-MM-DD 형식 + 실제 존재하는 날짜
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function validateTransaction(body) {
  const { type, amount, category, memo, occurred_on } = body || {};

  if (!ALLOWED_TYPES.has(type)) {
    return { error: "type 은 'income' 또는 'expense' 여야 합니다." };
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return { error: 'amount 는 0보다 큰 숫자여야 합니다.' };
  }
  if (typeof category !== 'string' || !category.trim()) {
    return { error: 'category 는 비어있을 수 없습니다.' };
  }
  if (category.length > 30) {
    return { error: 'category 는 최대 30자까지 입력 가능합니다.' };
  }
  if (!isValidDate(occurred_on)) {
    return { error: 'occurred_on 은 YYYY-MM-DD 형식이어야 합니다.' };
  }
  const safeMemo = typeof memo === 'string' ? memo : '';
  if (safeMemo.length > 200) {
    return { error: 'memo 는 최대 200자까지 입력 가능합니다.' };
  }

  return {
    value: {
      type,
      amount: amt,
      category: category.trim(),
      memo: safeMemo,
      occurred_on,
    },
  };
}

// ============================================================
//  API
// ============================================================

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/categories', (_req, res) => {
  res.json({ success: true, data: DEFAULT_CATEGORIES });
});

// ------------------------------------------------------------
//  내역 조회 (목록)
//    선택 쿼리: ?type=income|expense  &from=YYYY-MM-DD  &to=YYYY-MM-DD
// ------------------------------------------------------------
app.get('/api/transactions', async (req, res) => {
  const conditions = [];
  const params = [];

  if (req.query.type && ALLOWED_TYPES.has(req.query.type)) {
    params.push(req.query.type);
    conditions.push(`type = $${params.length}`);
  }
  if (req.query.from && isValidDate(req.query.from)) {
    params.push(req.query.from);
    conditions.push(`occurred_on >= $${params.length}`);
  }
  if (req.query.to && isValidDate(req.query.to)) {
    params.push(req.query.to);
    conditions.push(`occurred_on <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT id, type, amount, category, memo, occurred_on, created_at
         FROM transactions
         ${where}
         ORDER BY occurred_on DESC, id DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/transactions failed:', err);
    res.status(500).json({ success: false, message: '내역 조회에 실패했습니다.' });
  }
});

// ------------------------------------------------------------
//  카테고리별 합계
//    응답: { totalIncome, totalExpense, net, byCategory: [{type, category, total, count}] }
// ------------------------------------------------------------
app.get('/api/transactions/summary', async (req, res) => {
  const conditions = [];
  const params = [];

  if (req.query.from && isValidDate(req.query.from)) {
    params.push(req.query.from);
    conditions.push(`occurred_on >= $${params.length}`);
  }
  if (req.query.to && isValidDate(req.query.to)) {
    params.push(req.query.to);
    conditions.push(`occurred_on <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const byCategoryQ = pool.query(
      `SELECT type, category,
              SUM(amount)::numeric(14,2) AS total,
              COUNT(*)::int             AS count
         FROM transactions
         ${where}
         GROUP BY type, category
         ORDER BY type ASC, total DESC`,
      params
    );
    const totalsQ = pool.query(
      `SELECT
          COALESCE(SUM(amount) FILTER (WHERE type='income' ),0)::numeric(14,2) AS total_income,
          COALESCE(SUM(amount) FILTER (WHERE type='expense'),0)::numeric(14,2) AS total_expense
         FROM transactions
         ${where}`,
      params
    );

    const [{ rows: byCategory }, { rows: totals }] = await Promise.all([byCategoryQ, totalsQ]);

    const totalIncome = Number(totals[0].total_income);
    const totalExpense = Number(totals[0].total_expense);

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        net: Number((totalIncome - totalExpense).toFixed(2)),
        byCategory: byCategory.map((r) => ({
          type: r.type,
          category: r.category,
          total: Number(r.total),
          count: r.count,
        })),
      },
    });
  } catch (err) {
    console.error('GET /api/transactions/summary failed:', err);
    res.status(500).json({ success: false, message: '합계 계산에 실패했습니다.' });
  }
});

// ------------------------------------------------------------
//  내역 등록
// ------------------------------------------------------------
app.post('/api/transactions', async (req, res) => {
  const v = validateTransaction(req.body);
  if (v.error) return res.status(400).json({ success: false, message: v.error });

  try {
    const { rows } = await pool.query(
      `INSERT INTO transactions (type, amount, category, memo, occurred_on)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, type, amount, category, memo, occurred_on, created_at`,
      [v.value.type, v.value.amount, v.value.category, v.value.memo, v.value.occurred_on]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('POST /api/transactions failed:', err);
    res.status(500).json({ success: false, message: '내역 등록에 실패했습니다.' });
  }
});

// ------------------------------------------------------------
//  내역 삭제 (편의 기능)
// ------------------------------------------------------------
app.delete('/api/transactions/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ success: false, message: '잘못된 id 입니다.' });
  }
  try {
    const { rows } = await pool.query(
      `DELETE FROM transactions WHERE id = $1
       RETURNING id, type, amount, category, memo, occurred_on, created_at`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '내역을 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('DELETE /api/transactions/:id failed:', err);
    res.status(500).json({ success: false, message: '내역 삭제에 실패했습니다.' });
  }
});

// ------------------------------------------------------------
//  존재하지 않는 API
// ------------------------------------------------------------
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// ------------------------------------------------------------
//  SPA fallback
// ------------------------------------------------------------
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Budget app running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
