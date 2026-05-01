# 커뮤니티 앱

로그인한 사용자만 글을 쓸 수 있고, 자기 글만 수정/삭제할 수 있는 미니 커뮤니티.

- **스택**: Next.js 14 (App Router) + Supabase Auth + Postgres + Tailwind
- **인증**: 이메일 + 비밀번호
- **권한**: Postgres Row Level Security (RLS)

## 1. Supabase 설정

### 1-1. SQL 실행
1. https://supabase.com/dashboard 에서 프로젝트(`nhkeygrixzfjcycxmqyp`) 열기
2. 좌측 메뉴 **SQL Editor → New query**
3. `supabase/schema.sql` 내용 전체 복사 → 붙여넣기 → **Run**

이걸로 `profiles`, `posts` 테이블과 RLS 정책, 회원가입 시 자동 프로필 생성 트리거가 한 번에 만들어집니다.

### 1-2. 이메일 인증 설정 (선택)
개발 편의상 이메일 확인을 끄려면:
**Authentication → Providers → Email** 에서 *Confirm email* 토글을 **OFF**.

(켜둔 경우엔 회원가입 후 메일 인증 링크를 클릭해야 로그인 가능합니다.)

### 1-3. Redirect URLs (Vercel 배포 후)
**Authentication → URL Configuration**
- Site URL: `https://<your-vercel-domain>.vercel.app`
- Redirect URLs: 위와 동일 (필요 시 `http://localhost:3000` 도 추가)

## 2. 로컬 실행

```bash
cd week-5/community-app
npm install
npm run dev
```

`.env.local` 에 이미 Supabase URL/키가 들어가 있습니다.
브라우저: http://localhost:3000

## 3. Vercel 배포

```bash
# 처음 한 번
npm i -g vercel
vercel login
vercel link        # 새 프로젝트 생성

# 환경변수 추가 (Production + Preview + Development 다 적용)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# 배포
vercel --prod
```

또는 GitHub 푸시 후 https://vercel.com/new 에서 import → 환경변수 입력 → Deploy.

## 4. 화면

| 경로 | 설명 | 권한 |
|---|---|---|
| `/` | 게시글 목록 (최신순) | 누구나 (목록만) |
| `/signup` | 회원가입 | 비로그인 |
| `/login` | 로그인 | 비로그인 |
| `/posts/new` | 글쓰기 | 로그인 필수 |
| `/posts/[id]` | 상세 보기 | 로그인 필수 |
| `/posts/[id]/edit` | 글 수정 | 작성자 본인만 |

## 5. 구조

```
src/
├─ app/
│  ├─ page.tsx              # 게시글 목록
│  ├─ layout.tsx            # 루트 + Nav
│  ├─ globals.css
│  ├─ login/page.tsx
│  ├─ signup/page.tsx
│  ├─ auth/actions.ts       # login / signup / logout (server actions)
│  └─ posts/
│     ├─ actions.ts         # create / update / delete (server actions)
│     ├─ new/page.tsx
│     └─ [id]/
│        ├─ page.tsx        # 상세
│        └─ edit/page.tsx   # 수정
├─ components/nav.tsx
├─ lib/supabase/
│  ├─ client.ts             # 브라우저용
│  ├─ server.ts             # 서버 컴포넌트/액션용
│  └─ middleware.ts         # 세션 자동 갱신
└─ middleware.ts
supabase/schema.sql
```

## 6. 권한이 어떻게 보장되는가

서버 액션에서 `auth.uid()` 를 검사하지 않아도, **DB의 RLS 정책**이 직접 막아줍니다.

- 누가 다른 사람 글 UPDATE 쿼리를 보내도 `auth.uid() = user_id` 조건에서 0 rows affected.
- 비로그인 상태로 INSERT 를 시도해도 `with check` 가 거부.

즉 클라이언트/액션을 우회해도 DB 레벨에서 안전합니다.
