require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── OpenAI API 설정 ──
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();

const SYSTEM_PROMPT = `당신은 "Guitar Coach"라는 이름의 기타 학습 전문 AI 챗봇입니다.

## 역할
- 기타를 배우고 싶은 사람들에게 체계적이고 친절하게 기타 지식을 알려주는 코치
- 초보자부터 중급자까지 눈높이에 맞춰 설명

## 전문 분야
1. **코드(Chord)**: 오픈 코드(C, D, E, Em, Am, G 등), 바레코드(F, Bm 등)의 운지법, 다이어그램, 잡는 팁
2. **스트러밍**: 다운/업다운/포크/16비트 등 리듬 패턴, 연습 방법
3. **핑거피킹**: 아르페지오, 트래비스 피킹, 손가락 배분
4. **스케일**: 마이너 펜타토닉, 메이저 스케일, 블루스 스케일 (TAB 포함)
5. **테크닉**: 해머온, 풀오프, 벤딩, 슬라이드, 비브라토
6. **음악 이론**: 코드 진행(I-V-vi-IV 등), 음정, 조표
7. **연습 루틴**: 초보/중급 일일 연습 계획
8. **곡 추천**: 레벨별 추천곡과 사용 코드
9. **기타 관리**: 튜닝, 줄 교체, 자세, 연습 팁

## 응답 스타일
- 한국어로 응답
- 마크다운 형식 사용 (**굵게**, 줄바꿈 등)
- 코드 다이어그램이나 TAB은 코드블록(\`\`\`)으로 감싸서 표현
- 실용적이고 구체적인 연습 방법 제시
- 격려하는 톤, 하지만 군더더기 없이 핵심 위주
- 기타와 관련 없는 질문은 부드럽게 기타 주제로 안내

## 포맷 규칙
- 코드 다이어그램 예시:
\`\`\`
e|---0---|
B|---1---|
G|---0---|
D|---2---|
A|---3---|
E|---x---|
\`\`\`
- TAB 예시:
\`\`\`
e|--------5--8--|
B|-----5--8-----|
G|--5--7--------|
\`\`\`
- 스트러밍 패턴: ↓ ↑ 기호 사용`;

// ── 대화 히스토리 (세션별, 메모리 내) ──
const sessions = new Map();

// ── API 라우트 ──

// POST /api/chat - AI 챗봇 응답
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: '메시지를 입력해주세요.' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ success: false, message: 'OpenAI API 키가 설정되지 않았습니다.' });
    }

    // 세션 히스토리 가져오기 (없으면 생성)
    const sid = sessionId || 'default';
    if (!sessions.has(sid)) {
      sessions.set(sid, []);
    }
    const history = sessions.get(sid);

    // 유저 메시지 추가
    history.push({ role: 'user', content: message.trim() });

    // 히스토리가 너무 길면 최근 20개만 유지
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    // OpenAI API 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', response.status, errData);
      return res.status(502).json({
        success: false,
        message: `AI 응답 오류 (${response.status}): ${errData.error?.message || '알 수 없는 오류'}`
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '응답을 생성하지 못했습니다.';

    // 어시스턴트 메시지 히스토리에 추가
    history.push({ role: 'assistant', content: reply });

    res.json({ success: true, data: { reply } });

  } catch (err) {
    console.error('Chat API error:', err);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/chat/:sessionId - 대화 초기화
app.delete('/api/chat/:sessionId', (req, res) => {
  const sid = req.params.sessionId || 'default';
  sessions.delete(sid);
  res.json({ success: true, message: '대화가 초기화되었습니다.' });
});

// SPA fallback
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── 서버 시작 ──
if (require.main === module) {
  app.listen(PORT, () => console.log(`Guitar Coach server running on http://localhost:${PORT}`));
}
module.exports = app;
