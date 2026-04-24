// Before running: `npm install`
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

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function isValidTitle(title) {
  return typeof title === 'string' && title.trim().length > 0;
}

function parseId(raw) {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/notes - list newest first
app.get('/api/notes', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC, id DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/notes failed:', err);
    res.status(500).json({ success: false, message: 'Failed to read notes' });
  }
});

// GET /api/notes/:id - single note
app.get('/api/notes/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ success: false, message: 'Invalid id' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, title, content, created_at, updated_at FROM notes WHERE id = $1',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('GET /api/notes/:id failed:', err);
    res.status(500).json({ success: false, message: 'Failed to read note' });
  }
});

// POST /api/notes - create
app.post('/api/notes', async (req, res) => {
  const { title, content } = req.body || {};
  if (!isValidTitle(title)) {
    return res
      .status(400)
      .json({ success: false, message: 'Title is required and must be a non-empty string' });
  }
  const safeContent = typeof content === 'string' ? content : '';
  try {
    const { rows } = await pool.query(
      `INSERT INTO notes (title, content) VALUES ($1, $2)
       RETURNING id, title, content, created_at, updated_at`,
      [title.trim(), safeContent]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('POST /api/notes failed:', err);
    res.status(500).json({ success: false, message: 'Failed to create note' });
  }
});

// PUT /api/notes/:id - update title and/or content
app.put('/api/notes/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ success: false, message: 'Invalid id' });
  }
  const { title, content } = req.body || {};
  if (title !== undefined && !isValidTitle(title)) {
    return res
      .status(400)
      .json({ success: false, message: 'Title must be a non-empty string when provided' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE notes
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, title, content, created_at, updated_at`,
      [
        title !== undefined ? title.trim() : null,
        content !== undefined ? (typeof content === 'string' ? content : '') : null,
        id,
      ]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('PUT /api/notes/:id failed:', err);
    res.status(500).json({ success: false, message: 'Failed to update note' });
  }
});

// DELETE /api/notes/:id
app.delete('/api/notes/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ success: false, message: 'Invalid id' });
  }
  try {
    const { rows } = await pool.query(
      'DELETE FROM notes WHERE id = $1 RETURNING id, title, content, created_at, updated_at',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('DELETE /api/notes/:id failed:', err);
    res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
