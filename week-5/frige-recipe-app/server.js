// =====================================================================
// 냉장고 레시피 앱 — 서버
// Express + pg(Postgres) — Supabase 연결
// =====================================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ---------- DB Pool (lazy connect) ----------
const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false },
});

let dbReady = false;
async function ensureDB() {
  if (dbReady) return;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 환경변수가 설정되어 있지 않습니다. .env 파일을 확인하세요.');
  }
  await pool.query('SELECT 1');
  dbReady = true;
}

// API 라우트 진입 전 DB 연결 검증
app.use('/api', async (_req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    console.error('[DB connection failed]', err.message);
    res.status(500).json({ success: false, message: 'Database connection failed: ' + err.message });
  }
});

// =====================================================================
// API: Categories
// =====================================================================
app.get('/api/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, label, color_class AS color, sort_order
         FROM categories
         ORDER BY sort_order ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =====================================================================
// API: Recipes
// =====================================================================
app.get('/api/recipes', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, emoji, cook_time AS time, difficulty, tip, ingredients, steps
         FROM recipe_full
         ORDER BY name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/recipes/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, emoji, cook_time AS time, difficulty, tip, ingredients, steps
         FROM recipe_full
         WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/recipes', async (req, res) => {
  const { name, emoji, time, difficulty, tip, ingredients, steps } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: '레시피 이름을 입력해 주세요.' });
  }
  const cookTime = Number(time);
  if (!Number.isInteger(cookTime) || cookTime <= 0) {
    return res.status(400).json({ success: false, message: '조리 시간은 1 이상의 정수여야 합니다.' });
  }
  if (!['쉬움', '보통', '어려움'].includes(difficulty)) {
    return res.status(400).json({ success: false, message: '난이도는 쉬움/보통/어려움 중 하나여야 합니다.' });
  }

  const cleanIngs = Array.isArray(ingredients)
    ? Array.from(new Set(
        ingredients
          .map(s => (s == null ? '' : String(s).trim()))
          .filter(Boolean)
      ))
    : [];
  const cleanSteps = Array.isArray(steps)
    ? steps.map(s => (s == null ? '' : String(s).trim())).filter(Boolean)
    : [];

  if (cleanIngs.length === 0) {
    return res.status(400).json({ success: false, message: '재료를 1개 이상 입력해 주세요.' });
  }
  if (cleanSteps.length === 0) {
    return res.status(400).json({ success: false, message: '조리 단계를 1개 이상 입력해 주세요.' });
  }

  const id = `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const trimmedTip = tip ? String(tip).trim() : null;
  const safeEmoji = (emoji && String(emoji).trim()) || '🍽️';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO recipes (id, name, emoji, cook_time, difficulty, tip)
         VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name.trim(), safeEmoji, cookTime, difficulty, trimmedTip || null]
    );

    for (let i = 0; i < cleanIngs.length; i++) {
      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient, sort_order)
           VALUES ($1, $2, $3)`,
        [id, cleanIngs[i], i + 1]
      );
    }

    for (let i = 0; i < cleanSteps.length; i++) {
      await client.query(
        `INSERT INTO recipe_steps (recipe_id, step_no, instruction)
           VALUES ($1, $2, $3)`,
        [id, i + 1, cleanSteps[i]]
      );
    }

    await client.query('COMMIT');

    const { rows } = await pool.query(
      `SELECT id, name, emoji, cook_time AS time, difficulty, tip, ingredients, steps
         FROM recipe_full
         WHERE id = $1`,
      [id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// =====================================================================
// API: Fridge (사용자 보유 재료)
// =====================================================================
app.get('/api/fridge', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, category_id AS category, added_at
         FROM fridge_ingredients
         ORDER BY added_at DESC, id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/fridge', async (req, res) => {
  try {
    const { name, category } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: '재료 이름이 필요합니다.' });
    }
    const cat = (category || 'etc').toString();
    const { rows } = await pool.query(
      `INSERT INTO fridge_ingredients (name, category_id)
         VALUES ($1, $2)
         RETURNING id, name, category_id AS category, added_at`,
      [name.trim(), cat]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: '이미 등록된 재료입니다.' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ success: false, message: '존재하지 않는 카테고리입니다.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/fridge/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM fridge_ingredients WHERE id = $1',
      [req.params.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/fridge', async (_req, res) => {
  try {
    await pool.query('DELETE FROM fridge_ingredients');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =====================================================================
// Health check
// =====================================================================
app.get('/api/health', async (_req, res) => {
  try {
    await ensureDB();
    res.json({ success: true, data: { status: 'ok', db: 'connected' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =====================================================================
// SPA fallback (Express 5 syntax)
// =====================================================================
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// =====================================================================
// Local + Serverless dual-mode
// =====================================================================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🧊 Fridge Recipe Server  →  http://localhost:${PORT}`);
  });
}
module.exports = app;
