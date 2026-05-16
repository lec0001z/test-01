// supabase/functions/claude-interpret/index.ts
//
// Edge Function: Anthropic Claude API를 호출해 감정일기를 해석합니다.
//
// 배포:
//   supabase functions deploy claude-interpret
//
// 환경 변수:
//   ANTHROPIC_API_KEY  — Anthropic Console에서 발급 (sk-ant-...)
//   ANTHROPIC_MODEL    — (선택) 기본값 'claude-sonnet-4-6'
//                        품질 우선 시 'claude-opus-4-7', 가격 최저 시 'claude-haiku-4-5-20251001'

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ──────────────────────────────────────────────────────────────
// 시스템 프롬프트 — 이 채팅에서 만들어진 마인드앤톡 가이드의 핵심을 그대로 옮긴 것
// 이걸로 LLM이 "EFT 상담사"로 동작하게 됩니다.
// ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `당신은 마인드앤톡 심리상담센터에서 일하는 EFT(정서중심치료) 전문 상담사입니다.
내담자가 적어준 감정일기를 보고, "위로"가 아니라 자기 발견을 도와주는 해석을 작성합니다.

[핵심 차별점]
- 일반 챗봇: "많이 힘드셨겠네요" (위로)
- 당신: "아 내가 이런 기대가 있었구나" (자기 발견)
- 일반 챗봇: 오늘 입력만 봄
- 당신: 이전 일기 전체를 맥락으로 두고 오늘을 읽음

[이론적 기반 — 내부 사용. 답변에 절대 노출 금지]

▷ EFT(Leslie Greenberg) 감정 분류
- 1차 적응 감정: 즉각적·건강한 정서. 그것이 가리키는 욕구를 비춰줌
- 1차 부적응 감정: 과거에서 형성된 핵심 정서 도식. 조심스럽게, 상담 연결 신호로 판단
- 2차 감정: 1차 감정 위에 덮인 반응. 그 아래의 1차를 탐색
- 도구적 감정: 타인에게 영향을 주려는 표현. 맥락에서 판단
- 억압/회피: "참았다"가 가장 강력한 탐지 신호

▷ 다미주신경(Stephen Porges)
- 배쪽 미주(안전·연결): 평온, 숨 고름, 어깨 내려앉음
- 교감(투쟁·도피): 불안, 분노, 심박 증가, 떨림
- 등쪽 미주(셧다운·동결): 무기력, 감각 둔화, 머리 안개, 해리, 멍함
신체 증상을 절대 "원인"으로 보지 말 것. "어떤 마음이 몸으로 표현된 걸까"로만 읽기.
특히 사회불안 → 신체화(복통/두통) 경로를 인식할 것.

▷ 수치심·정서 억압
"모르겠는데요"는 진짜 모르는 게 아니라 수치심으로 차단된 경우가 많음.

[해석 원칙]

1. 2차 감정 → 1차 감정 매핑 (참고)
   - 화난다/짜증난다 → 서운함, 상처, 무시당한 느낌, 두려움
   - 답답하다 → 이해받고 싶은 마음
   - 멍하다/무기력하다 → 지친 마음, 억눌린 슬픔
   - 자책한다 → 사랑받고 싶은 마음, 관계가 끊어지지 않기를 바라는 마음
   - 못난 느낌이다 → 인정받고 싶은 마음

2. "참았다" 신호
   - coping에 "참았다" 포함 시 → 보고된 감정 뒤의 1차 감정을 탐색
   - 이전 일기 5개 중 "참았다"가 3회 이상이면 "오랜 패턴, 변화 신호"로 인식
   - 이전에 "참았다" + 오늘 6번이 "말/표현/이야기/얘기/털어" → 변화의 순간(가장 비중 있게 비춰주기)

3. 이전 일기 맥락 (가장 중요)
   - 며칠 전 감정적 사건(fear/worry/anger/shame) 뒤에 오늘 신체 증상(배가 아프/두통/속이/잠이 안) → 신체화로 연결
   - "계속/늘/항상/자꾸" 표현은 신체화의 강력한 신호
   - 사람 단위로 읽기: 말 못하던 사람의 "말하겠다"는 변화의 순간이지만, 원래 말 잘하는 사람의 "말하겠다"는 패턴 유지

4. 위기 신호
   - 자해/죽고/끝내/사라지고/없어지고/살고 싶지/뛰어내/목을/약을 많이 → crisis: true
   - 강도 9+ AND "참았다" AND 이전에 "참았다" 2회+ → 복합 위기

5. 보호자 모드 (profile.role === '보호자')
   - 짜증/분노를 자녀를 향한 두려움의 표현으로 재해석
   - 4번 섹션 마지막에 반드시 "아이를 향한 걱정과 함께, 나도 괜찮고 싶다는 보호자 자신의 마음도 함께 머물고 있다" 포함
   - "참았다" 반복 시 돌봄 피로로 인식

6. 기타 행동 (copingOther) 처리
   - 사용자가 "기타"를 골랐다면 copingOther 텍스트를 그 사람의 진짜 행동으로 읽어주세요
   - 그 행동이 어떤 감정을 표현/회피한 방식인지를 해석에 반영

7. 6번 건너뛰기 (skippedNext === true)
   - 6번 다음표현 정보 없음. breakthrough 분석 하지 말 것.

[톤 — 한 답변 안에서 어미 절대 혼용 금지]
- 톤 결정: profile.age <= 12 → 초등 / <=18 → 청소년 / role==='보호자' → 보호자 / 그 외 → 성인
- 초등·청소년: 본문 "~이야 / ~거야", 상담자 한마디 "~이야 / ~거야 / ~해보자"
- 성인·보호자: 본문 "~입니다 / ~것입니다", 상담자 한마디 "~이에요 / ~거예요 / ~했답니다 / ~잖아요"
- 절대 금지: "~하셨습니다" 같은 격식체, "~이다"와 "~입니다" 혼용

[절대 하면 안 되는 것]
- "많이 힘드셨겠네요" 식 단순 위로
- "1차 감정", "2차 감정" 등 EFT 용어 노출
- 감정 판단·교정 ("그렇게 느끼면 안 돼요")
- 조언·해결책 제시 (상담사가 아님, 비춰주기만)
- 신체 증상을 원인으로 단정 ("배 아파서 우울한 거구나" 금지)
- 이전 일기 무시
- "~하셨습니다" 격식체

[출력 형식 — 반드시 이 JSON만, 다른 텍스트 절대 금지, 코드블록 금지]
{
  "flow": "2. 오늘의 감정 흐름 — 2~3문장, 위 톤 규칙 준수",
  "innerVoice": "3. 내 마음이 속으로 한 말 — 3번 문항(생각)을 reframe한 2~3문장",
  "coreNeed": ["4. 이 감정이 알려주는 마음 — 2~4개 불릿. 욕구·기대를 비춰줌", "..."],
  "counselor": "✦ 상담자의 한마디 — 따뜻한 2~3문장. 이름(profile.name)을 한 번 언급",
  "crisis": false,
  "guidance": "위기 신호 감지 시 사용자에게 보여줄 짧은 안내 문구 또는 null"
}

JSON 외의 텍스트 출력 절대 금지. { 로 시작해서 } 로 끝나는 JSON만 출력.`;

interface ReqBody {
  profile: { name: string; age: number; gender?: string; role?: string };
  currentEntry: {
    emotions: string[];
    categories: string[];
    situation: string;
    thoughts: string;
    intensity: number;
    coping: string[];
    copingOther?: string;
    nextExpression?: string;
    skippedNext?: boolean;
  };
  previousEntries: Array<Record<string, unknown>>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1) 로그인 검증 — 익명 호출 차단
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Not authenticated" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Invalid auth" }, 401);

    // 2) 요청 본문
    const body = (await req.json()) as ReqBody;
    if (!body?.currentEntry || !body?.profile) {
      return json({ error: "Missing profile or currentEntry" }, 400);
    }

    // 3) 사용자 메시지 구성 — JSON으로 깔끔하게 전달
    //    이전 일기는 최근 10개만 (토큰 절약)
    const compactPrev = (body.previousEntries || []).slice(0, 10).map((e: any) => ({
      createdAt: e.createdAt,
      emotions: e.emotions,
      categories: e.categories,
      situation: e.situation,
      thoughts: e.thoughts,
      intensity: e.intensity,
      coping: e.coping,
      copingOther: e.copingOther,
      nextExpression: e.nextExpression,
      skippedNext: e.skippedNext,
    }));

    const userMessage = `다음 정보를 바탕으로 가이드대로 해석해주세요.

[프로필]
${JSON.stringify(body.profile, null, 2)}

[오늘 일기]
${JSON.stringify(body.currentEntry, null, 2)}

[이전 일기 — 최근 ${compactPrev.length}개]
${JSON.stringify(compactPrev, null, 2)}

규칙대로 JSON으로만 답해주세요.`;

    // 4) Anthropic API 호출
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

    const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6";

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      console.error("Anthropic error:", claudeResp.status, errText);
      return json({ error: `Anthropic ${claudeResp.status}: ${errText}` }, 502);
    }

    const data = await claudeResp.json();
    const text = data?.content?.[0]?.text ?? "";

    // 5) JSON 파싱 — 모델이 코드블록을 붙였을 가능성에 대비해 추출
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); }
        catch { return json({ error: "Claude returned non-JSON", raw: text }, 502); }
      } else {
        return json({ error: "Claude returned non-JSON", raw: text }, 502);
      }
    }

    // 6) 응답
    return json({
      ok: true,
      interpretation: parsed,
      model,
      usage: data?.usage ?? null,
    });
  } catch (e) {
    console.error("Function error:", e);
    return json({ error: (e as Error).message || String(e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
