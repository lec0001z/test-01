// 실행 전 준비:
//   1) npm install
//   2) .env.example 복사해서 .env 만들고 SUPABASE_SERVICE_ROLE_KEY 채우기
//   3) Supabase SQL Editor 에서 schema.sql 실행
//   4) npm start → http://localhost:3000

require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[.env] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 비어있어요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.json());
app.use(express.static(__dirname));

const CATEGORIES = ['고민', '칭찬', '응원'];

// ─────────────────────────────────────────────
// GET /api/posts?sort=latest|likes
// ─────────────────────────────────────────────
app.get('/api/posts', async (req, res) => {
  const sortColumn = req.query.sort === 'likes' ? 'likes' : 'created_at';

  const { data, error } = await supabase
    .from('posts')
    .select('id, category, content, likes, created_at')
    .order(sortColumn, { ascending: false })
    .order('created_at', { ascending: false }); // 보조 정렬 (공감수 동점일 때)

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// ─────────────────────────────────────────────
// POST /api/posts { category, content }
// ─────────────────────────────────────────────
app.post('/api/posts', async (req, res) => {
  const { category, content } = req.body || {};

  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ success: false, message: '카테고리는 고민/칭찬/응원 중 하나여야 해요.' });
  }
  if (typeof content !== 'string' || content.trim().length === 0 || content.length > 500) {
    return res.status(400).json({ success: false, message: '내용은 1~500자 사이여야 해요.' });
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({ category, content: content.trim() })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
});

// ─────────────────────────────────────────────
// POST /api/posts/:id/like { clientId }
//   1) post_likes 에 (post_id, client_id) INSERT  ← 중복이면 DB가 거부
//   2) posts.likes 를 읽고
//   3) likes = likes + 1 로 UPDATE
// ─────────────────────────────────────────────
app.post('/api/posts/:id/like', async (req, res) => {
  const postId = Number(req.params.id);
  const { clientId } = req.body || {};

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ success: false, message: '잘못된 게시글 id 입니다.' });
  }
  if (typeof clientId !== 'string' || clientId.length < 8 || clientId.length > 64) {
    return res.status(400).json({ success: false, message: '잘못된 clientId 입니다.' });
  }

  // 1) 공감 기록 남기기 — 같은 clientId 가 또 누르면 unique_violation (23505)
  const { error: likeErr } = await supabase
    .from('post_likes')
    .insert({ post_id: postId, client_id: clientId });

  if (likeErr) {
    if (likeErr.code === '23505') {
      return res.status(409).json({ success: false, message: '이미 공감한 글이에요.' });
    }
    return res.status(500).json({ success: false, message: likeErr.message });
  }

  // 2) 현재 likes 읽기
  const { data: current, error: readErr } = await supabase
    .from('posts')
    .select('likes')
    .eq('id', postId)
    .single();

  if (readErr) return res.status(500).json({ success: false, message: readErr.message });

  // 3) likes = likes + 1 UPDATE
  const { data: updated, error: updateErr } = await supabase
    .from('posts')
    .update({ likes: current.likes + 1 })
    .eq('id', postId)
    .select()
    .single();

  if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });

  res.json({ success: true, data: updated });
});

// API 404
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// SPA fallback
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
