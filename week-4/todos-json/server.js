// Before running: `npm init -y && npm install express`
const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;
const TODOS_FILE = path.join(__dirname, 'todos.json');

app.use(express.json());
app.use(express.static(__dirname));

// Read todos from disk. Returns [] if the file doesn't exist.
// Throws a tagged error if the file exists but can't be parsed.
async function readTodos() {
  let raw;
  try {
    raw = await fs.readFile(TODOS_FILE, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const e = new Error('todos.json is not an array');
      e.code = 'EBADFORMAT';
      throw e;
    }
    return parsed;
  } catch (err) {
    if (err.code === 'EBADFORMAT') throw err;
    const e = new Error('todos.json could not be parsed as JSON');
    e.code = 'EBADFORMAT';
    throw e;
  }
}

async function writeTodos(arr) {
  await fs.writeFile(TODOS_FILE, JSON.stringify(arr, null, 2) + '\n', 'utf8');
}

function sendReadError(res, err) {
  if (err && err.code === 'EBADFORMAT') {
    return res.status(500).json({ success: false, message: err.message });
  }
  return res.status(500).json({ success: false, message: 'Failed to read todos' });
}

function isValidTitle(title) {
  return typeof title === 'string' && title.trim().length > 0;
}

// GET /api/todos - full array
app.get('/api/todos', async (_req, res) => {
  try {
    const todos = await readTodos();
    res.json({ success: true, data: todos });
  } catch (err) {
    sendReadError(res, err);
  }
});

// GET /api/todos/:title - single todo
app.get('/api/todos/:title', async (req, res) => {
  try {
    const title = decodeURIComponent(req.params.title);
    const todos = await readTodos();
    const todo = todos.find((t) => t.title === title);
    if (!todo) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }
    res.json({ success: true, data: todo });
  } catch (err) {
    sendReadError(res, err);
  }
});

// POST /api/todos - append a new todo
app.post('/api/todos', async (req, res) => {
  try {
    const { title, content } = req.body || {};
    if (!isValidTitle(title)) {
      return res
        .status(400)
        .json({ success: false, message: 'Title is required and must be a non-empty string' });
    }
    const todos = await readTodos();
    if (todos.some((t) => t.title === title)) {
      return res
        .status(400)
        .json({ success: false, message: 'A todo with this title already exists' });
    }
    const newTodo = { title, content: typeof content === 'string' ? content : '' };
    todos.push(newTodo);
    await writeTodos(todos);
    res.status(201).json({ success: true, data: newTodo });
  } catch (err) {
    if (err && err.code === 'EBADFORMAT') {
      return sendReadError(res, err);
    }
    res.status(500).json({ success: false, message: 'Failed to create todo' });
  }
});

// PUT /api/todos/:title - update content
app.put('/api/todos/:title', async (req, res) => {
  try {
    const title = decodeURIComponent(req.params.title);
    const { content } = req.body || {};
    const todos = await readTodos();
    const idx = todos.findIndex((t) => t.title === title);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }
    todos[idx].content = typeof content === 'string' ? content : '';
    await writeTodos(todos);
    res.json({ success: true, data: todos[idx] });
  } catch (err) {
    if (err && err.code === 'EBADFORMAT') {
      return sendReadError(res, err);
    }
    res.status(500).json({ success: false, message: 'Failed to update todo' });
  }
});

// DELETE /api/todos/:title - remove a todo
app.delete('/api/todos/:title', async (req, res) => {
  try {
    const title = decodeURIComponent(req.params.title);
    const todos = await readTodos();
    const idx = todos.findIndex((t) => t.title === title);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }
    const [removed] = todos.splice(idx, 1);
    await writeTodos(todos);
    res.json({ success: true, data: removed });
  } catch (err) {
    if (err && err.code === 'EBADFORMAT') {
      return sendReadError(res, err);
    }
    res.status(500).json({ success: false, message: 'Failed to delete todo' });
  }
});

// /api 404 - must come before the SPA fallback so unknown API routes
// don't return index.html
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// SPA fallback (Express 5 splat syntax)
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
