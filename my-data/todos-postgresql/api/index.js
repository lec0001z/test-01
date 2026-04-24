const express = require('express');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const app = express();

app.use(express.json());

app.get('/api/todos', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/todos', async (req, res) => {
  try {
    const { title, content } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const result = await pool.query(
      'INSERT INTO todos (title, content) VALUES ($1, $2) RETURNING *',
      [title, content ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, completed } = req.body || {};

    const fields = [];
    const values = [];
    let i = 1;

    if (title !== undefined) {
      fields.push(`title = $${i++}`);
      values.push(title);
    }
    if (content !== undefined) {
      fields.push(`content = $${i++}`);
      values.push(content);
    }
    if (completed !== undefined) {
      fields.push(`completed = $${i++}`);
      values.push(completed);
    }

    if (fields.length === 0) {
      const existing = await pool.query('SELECT * FROM todos WHERE id = $1', [id]);
      if (existing.rowCount === 0) return res.status(404).json({ error: 'not found' });
      return res.json(existing.rows[0]);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE todos SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM todos WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
