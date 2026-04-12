// ============================================================
// Mental Chat · server.js
// Express 기반 OpenAI 상담 챗봇 백엔드 (로컬 + Vercel 듀얼모드)
// ============================================================

// 로컬 개발에서 .env 로드 (Vercel 환경에서는 dotenv 실패해도 무시)
try { require('dotenv').config(); } catch (_) {}

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------
// Middleware
// ------------------------------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

// ------------------------------------------------------------
// OpenAI 클라이언트 (lazy init — 서버리스 cold start 대응)
// ------------------------------------------------------------
let openaiClient = null;
function getOpenAI() {
  if (openaiClient) return openaiClient;
  const OpenAI = require('openai');
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

// ------------------------------------------------------------
// 상담사 페르소나 프롬프트
// ------------------------------------------------------------
const SYSTEM_PROMPT = `당신은 "달빛 상담사"입니다. 따뜻하고 공감적인 심리 상담사 역할을 맡고 있습니다.

대화 원칙:
- 사용자의 감정을 판단하지 않고 있는 그대로 수용합니다.
- 성급한 충고나 해결책 제시보다, 경청과 공감을 먼저 합니다.
- 짧고 부드러운 문장으로 답합니다 (보통 2~4문장, 길어도 6문장 이내).
- 반드시 한국어로 답합니다.
- 필요할 때 따뜻함을 더하는 이모지를 자연스럽게 섞습니다 (과하지 않게, 1~2개).
- 의료적 진단이나 약 처방은 하지 않습니다.
- 자해·자살·심각한 위기 신호가 감지되면, 공감을 먼저 표현한 뒤 "자살예방상담전화 1393"을 부드럽게 안내합니다.
- 대화 끝에는 사용자의 마음을 더 열 수 있는 열린 질문을 한 가지 덧붙이면 좋습니다.
- 사용자가 그냥 들어주길 원할 때는, 질문을 강요하지 말고 조용히 함께 있어주세요.`;

// ------------------------------------------------------------
// In-memory log (optional, for debugging — 재시작 시 초기화됨)
// ------------------------------------------------------------
const recentRequests = [];
const MAX_LOG = 50;

// ------------------------------------------------------------
// Routes
// ------------------------------------------------------------

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', hasKey: Boolean((process.env.OPENAI_API_KEY || '').trim()) },
  });
});

// POST /api/chat
// body: { messages: [{ role: 'user'|'assistant', text: string }], mood?: string }
// response: { success: true, data: { reply: string } }
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, mood } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: '요청 형식이 올바르지 않습니다. messages 배열이 필요합니다.',
      });
    }

    // 최근 20턴만 유지 (토큰 절약)
    const trimmed = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && (m.text || m.content))
      .slice(-20)
      .map(m => ({ role: m.role, content: m.text || m.content }));

    if (trimmed.length === 0) {
      return res.status(400).json({
        success: false,
        message: '유효한 대화 메시지가 없습니다.',
      });
    }

    const moodMap = {
      great: '좋아요', okay: '괜찮아요', tired: '지쳤어요',
      sad: '슬퍼요', anxious: '불안해요', angry: '화나요',
    };
    const moodLabel = moodMap[mood];
    const systemContent = SYSTEM_PROMPT + (moodLabel ? `\n\n[참고] 사용자가 앱에서 선택한 오늘의 기분: "${moodLabel}"` : '');

    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemContent }, ...trimmed],
      temperature: 0.85,
      max_tokens: 400,
      presence_penalty: 0.3,
      frequency_penalty: 0.2,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || '';
    if (!reply) {
      return res.status(502).json({ success: false, message: 'AI가 빈 응답을 반환했습니다.' });
    }

    // 간단한 로그
    recentRequests.push({ at: new Date().toISOString(), inTokens: completion.usage?.prompt_tokens, outTokens: completion.usage?.completion_tokens });
    if (recentRequests.length > MAX_LOG) recentRequests.shift();

    res.json({ success: true, data: { reply } });
  } catch (err) {
    console.error('[api/chat] error:', err);
    const status = err?.status || 500;
    const message = err?.message || 'AI 응답 생성 중 오류가 발생했습니다.';
    res.status(status).json({ success: false, message });
  }
});

// 디버그용 최근 요청 로그 (선택)
app.get('/api/debug/recent', (_req, res) => {
  res.json({ success: true, data: recentRequests });
});

// ------------------------------------------------------------
// SPA fallback (Express 5 문법)
// ------------------------------------------------------------
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ------------------------------------------------------------
// Error handler
// ------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ success: false, message: '서버 내부 오류가 발생했습니다.' });
});

// ------------------------------------------------------------
// Startup (local) / Export (Vercel)
// ------------------------------------------------------------
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🌙 Mental Chat server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
