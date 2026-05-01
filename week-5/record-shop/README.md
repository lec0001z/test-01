# Groove & Vinyl — 인디 음반샵 (record-shop)

한국 인디 LP / CD 를 다루는 작은 음반샵 데모. 과제 핵심 흐름인
**상품 목록 (DB) → 장바구니 담기 (로그인 필수) → 내 장바구니 관리 → 합계 계산** 을 모두 구현했습니다.

- **Next.js 15 (App Router) + TypeScript + Tailwind v4**
- **Supabase** : Auth (Email/Password) + Postgres + RLS
- **Vercel** 배포 준비 완료

---

## 0. 사전 준비

- Node.js 20 이상
- 이미 만들어 둔 Supabase 프로젝트 (URL · publishable key)

`.env.local` 파일은 이미 채워져 있습니다.

```
NEXT_PUBLIC_SUPABASE_URL=https://lumzgpsavbalextmzwny.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## 1. Supabase 스키마/시드 적용

1. Supabase 대시보드 → **SQL Editor** → **New query**
2. `supabase/schema.sql` 의 내용을 전부 복사해 붙여넣고 **Run**
3. 결과: `products`, `cart_items` 테이블 생성 + RLS 정책 + 시드 12장 삽입

> **이메일 확인을 끄고 싶다면** : Authentication → Providers → Email →
> "Confirm email" 토글을 **Off** 로 두면 회원가입 즉시 로그인됩니다.
> (켜둔 상태라면 가입 후 메일함의 인증 링크를 눌러야 로그인 가능)

## 2. 로컬 실행

```bash
cd week-5/record-shop
npm install
npm run dev
```

http://localhost:3000 접속.

체크리스트
- [x] 비로그인 상태로 `/` 에서 음반 목록 확인 가능
- [x] `/login`, `/signup` 으로 회원가입/로그인
- [x] 로그인 후 카드의 **장바구니 담기** 버튼 → `/cart` 이동 시 표시됨
- [x] `/cart` 에서 **+/−** 수량 조절, **삭제**, **합계** 자동 계산
- [x] 비로그인 상태로 담기 버튼을 누르면 `/login` 으로 유도

## 3. Vercel 배포

```bash
npm install -g vercel
vercel login
cd week-5/record-shop
vercel               # 첫 배포(미리보기)
vercel --prod        # 프로덕션 배포
```

또는 GitHub 푸시 후 Vercel 대시보드에서 **New Project → Import** :

1. Root Directory : `week-5/record-shop`
2. Framework : Next.js (자동 감지)
3. **Environment Variables** 에 두 개 추가
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy

배포 후 Supabase 대시보드의
**Authentication → URL Configuration → Site URL** 을 Vercel 도메인으로 갱신하면
이메일 확인 링크/리디렉션이 정상 작동합니다.

## 4. 디렉터리

```
src/
├── app/
│   ├── layout.tsx           헤더/푸터/전역 스타일
│   ├── page.tsx             상품 목록 (공개)
│   ├── login/               로그인
│   ├── signup/              회원가입
│   └── cart/                장바구니 (로그인 필수, redirect 처리)
├── components/
│   ├── Header.tsx           로그인 상태 + 장바구니 카운트
│   ├── ProductCard.tsx      앨범 카드
│   ├── AddToCartButton.tsx  비로그인 시 /login 으로 유도
│   └── CartItemRow.tsx      +/− , 삭제 UI
├── actions/
│   ├── auth.ts              signIn / signUp / signOut
│   └── cart.ts              addToCart / updateQuantity / removeFromCart
├── lib/
│   ├── supabase/{client,server,middleware}.ts
│   ├── format.ts            원화 포맷터
│   └── types.ts
└── middleware.ts            세션 쿠키 자동 갱신
supabase/
└── schema.sql               테이블 + RLS + 시드
```

## 5. 보안 모델 정리

- `products` 는 RLS 가 켜져 있고 `select` 정책이 누구에게나 허용 → 비로그인도 조회 가능
- `cart_items` 는 RLS 로 **`auth.uid() = user_id`** 인 행만 select/insert/update/delete 허용
- 클라이언트가 들고 있는 키는 `sb_publishable_*` (구 anon 키 자리). RLS 가 적용되어 있어 노출돼도 안전합니다.

## 6. 알려진 한계 / 다음 단계

- 결제 기능 없음 (과제 범위 밖)
- 앨범 커버는 `picsum.photos` 시드 이미지 → 실제 운영 시에는 Supabase Storage 또는 정식 라이선스 이미지로 교체
- 테스트 자동화는 포함되어 있지 않음
