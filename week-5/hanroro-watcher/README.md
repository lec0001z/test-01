# 한로로 자동 리서치 워처

Claude Code + Chrome MCP + Notion MCP 로 만든 미니 자동 리서치 에이전트.
한로로(HANRORO) 의 신곡 / 신영상 / 미디어 노출을 자동으로 모아 정리합니다.

## 폴더 구조

```
week-5/hanroro-watcher/
├── README.md                       (이 파일)
├── research-2026-05-01.md          (자동 리서치 스냅샷)
└── hanroro-watch.mjs               (RSS 기반 신영상 워처 스크립트)
```

## 동작 흐름

```
[관심 주제: 한로로]
   ↓
[Chrome MCP] 위키백과 / 공식 YouTube / 네이버 뉴스 자동 탐색
   ↓
[정보 수집] 신곡 MV · 콘서트 · 자체 콘텐츠 · 도서
   ↓
[research-YYYY-MM-DD.md] 작성
   ↓
[Notion MCP] 워크스페이스에 새 페이지로 업로드
```

## 자동 업데이트 — 신영상만 빠르게 체크

전체 리서치는 Claude 가 Chrome MCP 로 다시 돌리면 되지만,
"새 영상 떴나?" 만 빠르게 알고 싶을 때는 이 스크립트:

```bash
# 첫 실행 — 최근 5개 영상 표시 + 마지막 본 영상 ID 저장
node hanroro-watch.mjs

# 이후 실행 — 마지막 본 영상 이후 새로 올라온 것만 표시
node hanroro-watch.mjs

# 기억 초기화
node hanroro-watch.mjs --reset
```

의존성 0개 (Node 18+ 의 빌트인 fetch 만 사용).

### 윈도우 작업 스케줄러 등록 (선택)

```
프로그램:  node
인수:      "C:\Users\반주현\OneDrive\Desktop\test-01\week-5\hanroro-watcher\hanroro-watch.mjs"
시작 위치: C:\Users\반주현\OneDrive\Desktop\test-01\week-5\hanroro-watcher
```

매일 1회 정도면 충분.

## 다음 단계 아이디어

- [ ] 새 영상 감지 시 Notion 페이지 자동 업데이트 (`mcp__notion__notion-update-page`)
- [ ] 인스타그램/X 등 SNS도 RSS 가능한 어댑터로 추가
- [ ] 멜론 차트 진입 여부도 체크
