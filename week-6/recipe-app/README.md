# RecipeBox — 한 끼 레시피

3줄 미리보기로 둘러보고, 마음에 드는 한 그릇만 골라 결제하면 전체 레시피가 풀리는 작은 레시피 상점.

- **Next.js 16** App Router · React 19 · Tailwind v4
- **Supabase** Auth + Postgres (RLS)
- **TossPayments** 결제 위젯 (테스트 모드)

## 기능

- 회원가입 / 로그인 (Supabase Auth, 이메일 + 비밀번호)
- 레시피 목록 — 카드마다 앞 3줄 미리보기 + 가격
- 레시피 상세 — 비결제 시 3단계까지만 노출, 나머지는 잠금 처리
- 결제 — 토스페이먼츠 위젯 → 서버 confirm → `purchases` 테이블 `paid` 처리
- 마이페이지 — 결제 완료한 레시피 목록

## 셋업

### 1. 패키지 설치

```bash
npm install
```

### 2. Supabase

1. [Supabase](https://supabase.com) 에서 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 전체 실행 (시드 7개 레시피 포함)
3. Project Settings → API 에서 URL과 Publishable key 복사

### 3. `.env.local`

`.env.example` 을 복사:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...

# 토스페이먼츠 테스트 키
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm
TOSS_SECRET_KEY=test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6
```

> 위 토스 키는 [공개 테스트 키](https://docs.tosspayments.com/reference/test-key)이며 실제 청구되지 않습니다.

### 4. 개발 서버

```bash
npm run dev
```

http://localhost:3000

## 결제 테스트 카드

토스 테스트 환경에서는 어떤 카드 번호든 통과합니다. 안내된 테스트 카드:

- 카드번호: `4330-1234-1234-1234`
- 유효기간: 미래의 아무 날짜
- CVC: 임의 3자리
- 비밀번호 앞 2자리: 임의

## 폴더 구조

```
src/
  actions/         # auth.ts, checkout.ts (Server Actions)
  app/
    checkout/[id]/ # 단건 레시피 결제
    login/, signup/
    mypage/        # 결제 완료 레시피
    payment/
      success/     # 토스 confirm + purchases.status='paid'
      fail/        # 실패 사유 기록
    recipes/[id]/  # 상세 (3줄 미리보기 / 전체)
    page.tsx       # 목록
  components/
    CheckoutWidget.tsx, Header.tsx, RecipeCard.tsx
  lib/
    supabase/      # client.ts, server.ts, middleware.ts
    format.ts, types.ts
  middleware.ts    # 세션 갱신
supabase/
  schema.sql       # recipes / purchases + RLS + 시드
```

## 데이터 모델

- **recipes** — `preview` (무료, 3줄) / `full_content` (유료) / `price`
- **purchases** — 사용자별 결제 내역. `(user_id, recipe_id) where status='paid'` 유니크 인덱스로 중복 결제 방지
- RLS: recipes는 누구나 read, purchases는 본인 것만 read/write

## 개발 메모

- `recipes` 테이블은 모두 SELECT 가능합니다 (`full_content` 포함). 클라이언트 코드에서 결제 여부를 확인한 사용자에게만 화면에 그려줍니다. 강한 보호가 필요하면 `full_content` 만 별도 RPC + service role 로 가져오도록 바꾸면 됩니다.
- 결제 승인은 반드시 서버에서 (`/payment/success` 서버 컴포넌트 안에서 `TOSS_SECRET_KEY` 사용)만 수행합니다. 클라이언트에서 노출하지 않습니다.
