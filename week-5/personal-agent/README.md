# Personal Agent — 이은찬 맞춤형 AI 비서

[AI Context (.md)] + [DB 데이터] → [에이전트가 둘 다 읽음] → [나에 대해 아는 맞춤형 답변]

## 폴더 구조

```
week-5/personal-agent/
├── README.md           (이 파일 — 사용법)
├── CLAUDE.md           (에이전트 구성 — Claude Code가 자동 로드)
├── context.md          (미션 1 — 사용자 프로필)
├── data/               (미션 2 — DB)
│   ├── study-log.json          학습 진도
│   ├── practice-log.json       작곡 연습 기록
│   └── hanroro-listen-log.json 한로로 청취 기록
└── compare.md          (미션 4 — Before/After 비교 시연)
```

## 어떻게 동작하나

Claude Code 가 이 폴더에서 실행되면 **자동으로** `CLAUDE.md` 를 읽고, 거기 안내된 4개 파일(`context.md` + `data/*.json` 3개) 을 모든 답변의 컨텍스트로 사용합니다.

별도 인프라(Claude API 직접 호출, 벡터 DB 등) 없이 **Claude Code 자체가 곧 에이전트** 입니다.

## 미션 매핑

| 미션 | 결과물 |
|---|---|
| 1. AI Context 파일 작성 | `context.md` |
| 2. DB에 내 데이터 넣기 | `data/study-log.json`, `data/practice-log.json`, `data/hanroro-listen-log.json` |
| 3. Context + DB 결합 에이전트 구성 | `CLAUDE.md` (자동 로드 규칙) |
| 4. Before / After 비교 시연 | `compare.md` |

## 시연 방법

1. Claude Code 를 이 폴더에서 띄움 (또는 작업 디렉토리를 이 폴더로 변경)
2. 다음과 같은 질문을 던지면, AI가 위 4개 파일을 읽고 맞춤형으로 답변:
   - "오늘 뭐 하면 좋을까?"
   - "한로로 곡 한 곡만 추천해줘"
   - "내가 지금까지 뭐 했는지 한 줄로 정리해줘"
   - "다음 작곡 연습 때 어디부터 이어갈까?"
3. 같은 질문을 다른 빈 폴더에서 던져 비교 → `compare.md` 처럼 답변 차이 확인

## 데이터 갱신

새 활동이 생기면 해당 JSON 의 `entries` 배열에 새 객체 추가 후 `summary` 갱신.
Claude Code 에서 "오늘 작곡 1시간 했어, 로그에 추가해줘" 처럼 부탁하면 자동 갱신.

## 본인 검토 필요 항목

`context.md` 안에 `<!-- 확인 필요 -->` 주석으로 표시된 부분(고1 여부, 거주 지역, 농구 동아리 활동, 작곡 데모 목표 등)은 추측이므로 본인이 한 번 정정해주세요.
