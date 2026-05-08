# Groove & Vinyl — 인디 중고 음반샵 (record-shop)

한국 인디 LP / CD 를 거래하는 작은 C2C 중고 음반샵. 번개장터처럼 **사용자가 직접 음반을 올리고** 다른 사람이 **결제로 사 갈 수 있어요.**

핵심 기능
- 회원가입 / 로그인 (Supabase Auth)
- 본인 음반 등록 + **이미지 업로드** (Supabase Storage)
- 장바구니 → **토스페이먼츠 결제위젯** 으로 결제
- 마이페이지: 내 판매 목록 / 구매 내역
- RLS 로 데이터 분리, 결제는 서버에서 secret key 로 승인

스택
- **Next.js 16 (App Router) + TypeScript + Tailwind v4**
- **Supabase** : Auth + Postgres + Storage + RLS
- **TossPayments** : `@tosspayments/tosspayments-sdk` v2 결제위젯

---

## 0. 사전 준비

- Node.js 20+
- Supabase 프로젝트 (URL + publishable key)

## 1. Supabase 설정

1. **SQL Editor → New query** → `supabase/schema.sql` 전체 붙여넣고 **Run**
   - `products` / `cart_items` / `orders` / `order_items` 테이블 생성
   - `seller_id` / `sold` / `condition` 컬럼 추가
   - RLS 정책, `mark_products_sold_for_order` RPC 생성
   - **Storage 버킷 `product-images`** 자동 생성 + 정책
   - 시드 음반 삽입 (한로로 / 잔나비 / 검정치마 / 실리카겔)
2. **Authentication → Providers → Email** : "Confirm email" 토글을 **Off** 로 두면 가입 즉시 로그인됨

## 2. 환경 변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# 토스페이먼츠 결제위젯 (테스트 키)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_gck_docs_OaPz8L5KdmQXkzRz3y47BMw6v1YQ
TOSS_SECRET_KEY=test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6v1YQ
```

테스트 키는 토스페이먼츠 공식 문서에 공개돼 있는 값으로, 실제로 결제되지 않아요. 운영 시에는 가맹점 별 키로 교체.

## 3. 로컬 실행

```bash
cd week-5/record-shop
npm install
npm run dev
```

http://localhost:3000

테스트 흐름
1. `/signup` 으로 계정 만들기 → `/login`
2. 홈에서 음반 → **장바구니 담기** → `/cart`
3. **결제하기** → `/checkout` → 결제위젯에서 카드/계좌이체 선택 → 결제
   - 토스 안내 카드 번호 (`4330-1234-1234-1234` 등 문서 참고)
4. `/payment/success` → 자동 승인 → **/mypage?tab=orders** 에서 구매 내역 확인
5. `/sell` 에서 본인 음반 등록 → 홈에서 "사용자 판매" 라벨로 노출

## 4. 디렉터리

```
src/
├── app/
│   ├── layout.tsx, page.tsx       홈 (sold 제외 목록)
│   ├── login, signup              인증
│   ├── cart                       장바구니 → 결제하기
│   ├── checkout                   pending order 생성 + 결제위젯
│   ├── payment/success            토스 승인 → paid + 카트 비움 + sold 처리
│   ├── payment/fail               결제 실패/취소
│   ├── sell                       본인 음반 등록 (이미지 업로드)
│   └── mypage                     내 판매목록 / 구매 내역 탭
├── components/
│   ├── Header, ProductCard, AddToCartButton, CartItemRow
│   ├── SellForm                   파일 업로드 + 미리보기
│   ├── CheckoutWidget             토스 결제위젯 클라이언트
│   └── DeleteListingButton
├── actions/
│   ├── auth.ts, cart.ts
│   ├── products.ts                createListing / deleteOwnProduct
│   └── checkout.ts                createPendingOrderFromCart
└── lib/supabase, format, types
supabase/schema.sql
```

## 5. 보안 모델

| 테이블 / 리소스 | 접근 정책 |
|---|---|
| `products` (select) | 모두 허용 (RLS public) |
| `products` (insert/update/delete) | `auth.uid() = seller_id` |
| `cart_items` | 본인만 (`auth.uid() = user_id`) |
| `orders` | 본인 buyer 만 |
| `order_items` | 본인 order 의 item 만 |
| Storage `product-images` | read 공개, write 인증 사용자, delete 업로더 본인 |
| `mark_products_sold_for_order` | SECURITY DEFINER + 본인 + status='paid' 검증 |

결제 승인은 **서버 컴포넌트(`/payment/success`) 안에서만** 토스 secret key 로 호출하기 때문에 클라이언트에 시크릿이 노출되지 않아요. 또한 DB 의 `orders.amount` 와 query 의 `amount` 를 비교해 **위변조된 금액으로 승인되는 것을 차단**합니다.

## 6. Vercel 배포

```bash
vercel
vercel --prod
```

Environment Variables 4개 모두 입력
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_TOSS_CLIENT_KEY`
- `TOSS_SECRET_KEY` (Production / Preview 모두)

배포 후 Supabase **Authentication → URL Configuration → Site URL** 을 Vercel 도메인으로 갱신.

## 7. 알려진 한계

- 판매자가 자기 음반을 자기 카트에 넣고 결제할 수 있음 (RLS 위반은 아니나 의미 없음)
- 환불/주문 취소 화면은 미구현 (DB 와 토스 API 가 양쪽 다 필요)
- 동일 상품을 여러 명이 동시에 결제하면 마지막에 sold 가 덮어쓰기됨 (재고 1개 가정)
