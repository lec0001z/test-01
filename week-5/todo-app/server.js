// ============================================================
//  Todo App — Express 백엔드 (JWT 인증)
//  실행:  node server.js   →  http://localhost:3001
// ============================================================
//  - 사용자/할 일 데이터: 인메모리 저장 (DB 연동은 추후)
//  - 비밀번호: bcrypt 해싱
//  - 인증: JWT (HS256, Authorization: Bearer <token>)
// ============================================================

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const JWT_EXPIRES = "7d";

// ------------------------------------------------------------
//  인메모리 저장소
// ------------------------------------------------------------
/** @type {{ id: string; email: string; passwordHash: string; createdAt: string }[]} */
const users = [];
/** @type {{ id: string; userId: string; text: string; done: boolean; createdAt: string; updatedAt: string }[]} */
const todos = [];

const newId = () =>
  Date.now().toString(36) + crypto.randomBytes(4).toString("hex");

// ------------------------------------------------------------
//  유효성 검사 유틸
// ------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCredentials(email, password) {
  if (typeof email !== "string" || !EMAIL_RE.test(email))
    return "유효한 이메일을 입력하세요.";
  if (typeof password !== "string" || password.length < 6)
    return "비밀번호는 6자 이상이어야 합니다.";
  return null;
}

function publicUser(u) {
  return { id: u.id, email: u.email, createdAt: u.createdAt };
}

// ------------------------------------------------------------
//  JWT 인증 미들웨어
// ------------------------------------------------------------
function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "인증 토큰이 없습니다." });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: "사용자를 찾을 수 없습니다." });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "토큰이 유효하지 않습니다." });
  }
}

// ------------------------------------------------------------
//  앱 설정
// ------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(express.static(__dirname));

// ------------------------------------------------------------
//  Health
// ------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, users: users.length, todos: todos.length });
});

// ============================================================
//  Auth
// ============================================================

app.post("/api/auth/signup", async (req, res) => {
  const { email, password } = req.body || {};
  const err = validateCredentials(email, password);
  if (err) return res.status(400).json({ error: err });

  const normalizedEmail = email.trim().toLowerCase();
  if (users.some((u) => u.email === normalizedEmail)) {
    return res.status(409).json({ error: "이미 가입된 이메일입니다." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: newId(),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);

  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.status(201).json({ token, user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "이메일과 비밀번호를 입력하세요." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((u) => u.email === normalizedEmail);
  if (!user) return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });

  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.json({ token, user: publicUser(user) });
});

app.get("/api/auth/me", authRequired, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// ============================================================
//  Todos (protected)
// ============================================================

app.get("/api/todos", authRequired, (req, res) => {
  const list = todos
    .filter((t) => t.userId === req.user.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json({ todos: list });
});

app.post("/api/todos", authRequired, (req, res) => {
  const { text } = req.body || {};
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "내용을 입력하세요." });
  }
  if (text.length > 500) {
    return res.status(400).json({ error: "최대 500자까지 입력 가능합니다." });
  }
  const now = new Date().toISOString();
  const todo = {
    id: newId(),
    userId: req.user.id,
    text: text.trim(),
    done: false,
    createdAt: now,
    updatedAt: now,
  };
  todos.push(todo);
  res.status(201).json({ todo });
});

app.patch("/api/todos/:id", authRequired, (req, res) => {
  const todo = todos.find((t) => t.id === req.params.id && t.userId === req.user.id);
  if (!todo) return res.status(404).json({ error: "할 일을 찾을 수 없습니다." });

  const { text, done } = req.body || {};
  if (typeof text === "string") {
    if (!text.trim()) return res.status(400).json({ error: "내용을 입력하세요." });
    if (text.length > 500) return res.status(400).json({ error: "최대 500자까지 입력 가능합니다." });
    todo.text = text.trim();
  }
  if (typeof done === "boolean") todo.done = done;
  todo.updatedAt = new Date().toISOString();
  res.json({ todo });
});

app.delete("/api/todos/:id", authRequired, (req, res) => {
  const idx = todos.findIndex((t) => t.id === req.params.id && t.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: "할 일을 찾을 수 없습니다." });
  todos.splice(idx, 1);
  res.status(204).end();
});

app.delete("/api/todos", authRequired, (req, res) => {
  // 완료된 항목 일괄 삭제
  if (req.query.done !== "true") {
    return res.status(400).json({ error: "지원하지 않는 작업입니다." });
  }
  for (let i = todos.length - 1; i >= 0; i--) {
    if (todos[i].userId === req.user.id && todos[i].done) todos.splice(i, 1);
  }
  res.status(204).end();
});

// ------------------------------------------------------------
//  SPA fallback (해시 라우팅이라 사실 필요 없지만, 직접 접속 시 index 반환)
// ------------------------------------------------------------
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ------------------------------------------------------------
//  에러 핸들러
// ------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "서버 오류" });
});

app.listen(PORT, () => {
  console.log(`✅ Todo server listening on http://localhost:${PORT}`);
});
