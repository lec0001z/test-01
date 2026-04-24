// Todo app backed by SQLite via Node's built-in `node:sqlite` module (Node 22.5+).
// Before first launch, run:
//   npm init -y && npm install express
//
// Then start with: node server.js

const express = require('express');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Database setup ----------
const db = new DatabaseSync(path.join(__dirname, 'todos.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ---------- Prepared statements ----------
const stmtListAll = db.prepare('SELECT id, title, content, created_at FROM todos ORDER BY id ASC');
const stmtGetByTitle = db.prepare('SELECT id, title, content, created_at FROM todos WHERE title = ?');
const stmtInsert = db.prepare('INSERT INTO todos (title, content) VALUES (?, ?)');
const stmtGetById = db.prepare('SELECT id, title, content, created_at FROM todos WHERE id = ?');
const stmtUpdateContent = db.prepare('UPDATE todos SET content = ? WHERE title = ?');
const stmtDeleteByTitle = db.prepare('DELETE FROM todos WHERE title = ?');

// ---------- Middleware ----------
app.use(express.json());
app.use(express.static(__dirname));

// ---------- API routes ----------

// GET /api/todos -> list all
app.get('/api/todos', (_req, res, next) => {
  try {
    const rows = stmtListAll.all();
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/todos/:title -> single row
app.get('/api/todos/:title', (req, res, next) => {
  try {
    const title = decodeURIComponent(req.params.title);
    const row = stmtGetByTitle.get(title);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
});

// POST /api/todos -> create
app.post('/api/todos', (req, res, next) => {
  try {
    const { title, content } = req.body || {};

    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Title is required and must be a non-empty string',
      });
    }

    const finalTitle = title.trim();
    const finalContent = typeof content === 'string' ? content : '';

    let info;
    try {
      info = stmtInsert.run(finalTitle, finalContent);
    } catch (err) {
      const msg = err && err.message ? err.message : '';
      if (
        (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') ||
        (err && err.errcode === 2067) ||
        /UNIQUE constraint failed/i.test(msg)
      ) {
        return res.status(409).json({
          success: false,
          message: 'A todo with this title already exists',
        });
      }
      throw err;
    }

    const inserted = stmtGetById.get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: inserted });
  } catch (err) {
    next(err);
  }
});

// PUT /api/todos/:title -> update content by title
app.put('/api/todos/:title', (req, res, next) => {
  try {
    const title = decodeURIComponent(req.params.title);
    const { content } = req.body || {};
    const finalContent = typeof content === 'string' ? content : '';

    const existing = stmtGetByTitle.get(title);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    stmtUpdateContent.run(finalContent, title);
    const updated = stmtGetByTitle.get(title);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/todos/:title -> delete by title
app.delete('/api/todos/:title', (req, res, next) => {
  try {
    const title = decodeURIComponent(req.params.title);
    const info = stmtDeleteByTitle.run(title);
    if (info.changes === 0) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }
    res.json({ success: true, message: 'Todo deleted' });
  } catch (err) {
    next(err);
  }
});

// ---------- /api 404 (must be before SPA fallback) ----------
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// ---------- SPA fallback (Express 5 syntax) ----------
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------- Error handling middleware ----------
app.use((err, _req, res, _next) => {
  console.error('[server error]', err);
  res.status(500).json({
    success: false,
    message: err && err.message ? err.message : 'Internal server error',
  });
});

// ---------- Startup ----------
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
