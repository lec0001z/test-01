// Before running: npm init -y && npm install express
const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Helpers
const TODO_DIR = __dirname;
const EXCLUDED = new Set(['server.js', 'index.html', 'package.json', 'package-lock.json']);

function isValidTitle(title) {
  if (!title || typeof title !== 'string') return false;
  if (title.includes('/') || title.includes('\\') || title.includes('..')) return false;
  if (title.trim().length === 0) return false;
  // Disallow NUL and other control chars
  if (/[\x00-\x1f]/.test(title)) return false;
  return true;
}

function titleToPath(title) {
  return path.join(TODO_DIR, `${title}.txt`);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// API: list all todos
app.get('/api/todos', async (_req, res) => {
  try {
    const entries = await fs.readdir(TODO_DIR, { withFileTypes: true });
    const todos = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (EXCLUDED.has(entry.name)) continue;
      if (!entry.name.toLowerCase().endsWith('.txt')) continue;
      const title = entry.name.slice(0, -4);
      const content = await fs.readFile(path.join(TODO_DIR, entry.name), 'utf8');
      todos.push({ title, content });
    }
    res.json({ success: true, data: todos });
  } catch (err) {
    res.status(500).json({ success: false, message: `Failed to list todos: ${err.message}` });
  }
});

// API: get single todo
app.get('/api/todos/:title', async (req, res) => {
  try {
    const title = decodeURIComponent(req.params.title);
    if (!isValidTitle(title)) {
      return res.status(400).json({ success: false, message: 'Invalid title' });
    }
    const filePath = titleToPath(title);
    if (!(await fileExists(filePath))) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }
    const content = await fs.readFile(filePath, 'utf8');
    res.json({ success: true, data: { title, content } });
  } catch (err) {
    res.status(500).json({ success: false, message: `Failed to read todo: ${err.message}` });
  }
});

// API: create todo
app.post('/api/todos', async (req, res) => {
  try {
    const { title, content } = req.body || {};
    if (!isValidTitle(title)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing title' });
    }
    const filePath = titleToPath(title);
    if (await fileExists(filePath)) {
      return res.status(400).json({ success: false, message: 'Todo with this title already exists' });
    }
    await fs.writeFile(filePath, content ?? '', 'utf8');
    res.status(201).json({ success: true, data: { title, content: content ?? '' } });
  } catch (err) {
    res.status(500).json({ success: false, message: `Failed to create todo: ${err.message}` });
  }
});

// API: update todo
app.put('/api/todos/:title', async (req, res) => {
  try {
    const title = decodeURIComponent(req.params.title);
    if (!isValidTitle(title)) {
      return res.status(400).json({ success: false, message: 'Invalid title' });
    }
    const { content } = req.body || {};
    const filePath = titleToPath(title);
    if (!(await fileExists(filePath))) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }
    await fs.writeFile(filePath, content ?? '', 'utf8');
    res.json({ success: true, data: { title, content: content ?? '' } });
  } catch (err) {
    res.status(500).json({ success: false, message: `Failed to update todo: ${err.message}` });
  }
});

// API: delete todo
app.delete('/api/todos/:title', async (req, res) => {
  try {
    const title = decodeURIComponent(req.params.title);
    if (!isValidTitle(title)) {
      return res.status(400).json({ success: false, message: 'Invalid title' });
    }
    const filePath = titleToPath(title);
    if (!(await fileExists(filePath))) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }
    await fs.unlink(filePath);
    res.json({ success: true, message: 'Todo deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: `Failed to delete todo: ${err.message}` });
  }
});

// API 404 catch-all (must come before SPA fallback so /api/* isn't swallowed)
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// SPA fallback (Express 5 syntax)
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handler
app.use((err, _req, res, _next) => {
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
