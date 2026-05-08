-- ============================================================
-- recipe-app · Supabase setup script
-- 실행 방법: Supabase 대시보드 → SQL Editor → 새 쿼리 → 전체 붙여넣고 Run
--
-- 모델
--   recipes    : 모든 레시피. preview(3줄, 무료) / full_content(유료)
--   purchases  : 사용자별 결제 내역 (status='paid'면 full_content 열람 가능)
-- ============================================================

-- 1. recipes 테이블 -------------------------------------------
create table if not exists public.recipes (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null,
  category     text not null,
  difficulty   text not null check (difficulty in ('쉬움','보통','어려움')),
  cooking_time integer not null check (cooking_time > 0),
  image_url    text,
  preview      text not null,
  full_content text not null,
  price        integer not null check (price >= 0),
  created_at   timestamptz not null default now()
);

-- 2. purchases 테이블 -----------------------------------------
create table if not exists public.purchases (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  recipe_id    uuid not null references public.recipes(id) on delete cascade,
  order_id     text not null unique,
  payment_key  text,
  amount       integer not null check (amount >= 0),
  status       text not null default 'pending' check (status in ('pending','paid','failed')),
  fail_reason  text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);

-- 한 사용자가 같은 레시피를 두 번 결제하지 못하게 (paid 한 건만 유일)
create unique index if not exists purchases_user_recipe_paid_unique
  on public.purchases(user_id, recipe_id)
  where status = 'paid';

-- 3. RLS ------------------------------------------------------
alter table public.recipes   enable row level security;
alter table public.purchases enable row level security;

-- 3-1. recipes: 모두 읽을 수 있음 (목록/상세에서 preview 노출 위해)
--      full_content 도 SELECT 결과에 포함되지만, 클라이언트 코드에서
--      결제 여부를 확인한 사용자에게만 화면에 그려준다.
--      "절대 노출하면 안 되는 비밀"이 아니라 "유료 잠금 콘텐츠"이므로
--      이 패턴을 사용. 강한 보호가 필요하면 별도 RPC + service role 로
--      바꾸면 된다.
drop policy if exists "recipes are viewable by everyone" on public.recipes;
create policy "recipes are viewable by everyone"
  on public.recipes for select
  using (true);

-- 3-2. purchases: 본인 것만
drop policy if exists "purchases: select own" on public.purchases;
drop policy if exists "purchases: insert own" on public.purchases;
drop policy if exists "purchases: update own" on public.purchases;

create policy "purchases: select own"
  on public.purchases for select
  using (auth.uid() = user_id);

create policy "purchases: insert own"
  on public.purchases for insert
  with check (auth.uid() = user_id);

create policy "purchases: update own"
  on public.purchases for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. 시드 데이터 -----------------------------------------------
insert into public.recipes (title, description, category, difficulty, cooking_time, image_url, price, preview, full_content)
select * from (values
  (
    '돼지고기 김치찌개',
    '묵은지의 깊은 산미와 돼지고기 기름의 고소함이 만나는 가장 한국적인 한 그릇.',
    '한식', '쉬움', 25,
    'https://images.unsplash.com/photo-1583224994076-ae7e1d9c9d6a?w=800',
    1900,
$$1. 묵은지 1/4포기를 손가락 두 마디 길이로 썰고, 양념을 살짝 털어낸다.
2. 달군 냄비에 들기름 1큰술을 두르고 김치를 5분간 충분히 볶아 신맛을 잡는다.
3. 돼지고기 앞다리살 200g을 넣어 색이 변할 때까지 볶는다.$$,
$$1. 묵은지 1/4포기를 손가락 두 마디 길이로 썰고, 양념을 살짝 털어낸다.
2. 달군 냄비에 들기름 1큰술을 두르고 김치를 5분간 충분히 볶아 신맛을 잡는다.
3. 돼지고기 앞다리살 200g을 넣어 색이 변할 때까지 볶는다.
4. 쌀뜨물 또는 멸치다시마 육수 500ml를 붓고 강불로 끓인다.
5. 끓어오르면 중불로 줄이고 고춧가루 1큰술, 다진마늘 1작은술, 국간장 1작은술을 푼다.
6. 두부 1/2모를 1cm 두께로 썰어 넣고 10분 더 끓인다.
7. 마지막에 대파 1대를 어슷썰어 올리고 1분만 더 끓인 뒤 불을 끈다.
8. 한 번 식혔다가 다시 끓이면 맛이 더 깊어진다. 흰 쌀밥과 함께 즉시.$$
  ),
  (
    '오일 파스타 알리오 올리오',
    '재료 4가지로 만드는 가장 단순하고 가장 맛있는 파스타. 마늘 향이 핵심.',
    '양식', '쉬움', 15,
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800',
    1500,
$$1. 큰 냄비에 물 2L를 끓이고 굵은소금 1큰술을 푼다.
2. 스파게티 100g을 넣고 포장 시간보다 1분 짧게 삶는다.
3. 차가운 팬에 올리브유 4큰술과 얇게 슬라이스한 마늘 4쪽을 함께 올려 약불로 천천히 익힌다.$$,
$$1. 큰 냄비에 물 2L를 끓이고 굵은소금 1큰술을 푼다.
2. 스파게티 100g을 넣고 포장 시간보다 1분 짧게 삶는다.
3. 차가운 팬에 올리브유 4큰술과 얇게 슬라이스한 마늘 4쪽을 함께 올려 약불로 천천히 익힌다.
4. 마늘이 옅은 황금색이 되면 페퍼론치노 2-3개를 부숴 넣는다.
5. 면수 1국자(약 80ml)를 팬에 부어 유화시킨다 — 기름과 물이 뽀얗게 섞일 때까지 흔든다.
6. 삶은 면을 건져 팬에 옮기고, 면수를 조금씩 더해가며 30초간 빠르게 볶는다.
7. 불을 끄고 엑스트라버진 올리브유 1큰술, 다진 파슬리 1큰술을 마지막에 두른다.
8. 접시에 둥글게 말아 담고, 후추를 갈아 마무리. 치즈는 넣지 않는 것이 정석.$$
  ),
  (
    '바질 토마토 브루스케타',
    '잘 익은 토마토와 갓 뜯은 바질, 그리고 잘 구운 빵 한 장이면 충분하다.',
    '양식', '쉬움', 10,
    'https://images.unsplash.com/photo-1572441710534-cdc887e0b6ed?w=800',
    1200,
$$1. 방울토마토 200g을 4등분하고 소금 1꼬집을 뿌려 10분 둔다 — 수분이 빠지며 단맛이 농축된다.
2. 마늘 1쪽을 반으로 자르고, 단단한 빵 2조각을 토스터에 노릇하게 굽는다.
3. 토마토에 올리브유 2큰술, 발사믹 식초 1작은술, 손으로 찢은 바질 5장을 더해 살살 섞는다.$$,
$$1. 방울토마토 200g을 4등분하고 소금 1꼬집을 뿌려 10분 둔다 — 수분이 빠지며 단맛이 농축된다.
2. 마늘 1쪽을 반으로 자르고, 단단한 빵 2조각을 토스터에 노릇하게 굽는다.
3. 토마토에 올리브유 2큰술, 발사믹 식초 1작은술, 손으로 찢은 바질 5장을 더해 살살 섞는다.
4. 따뜻한 빵 표면을 자른 마늘 단면으로 문질러 향을 입힌다.
5. 빵 위에 올리브유를 살짝 두른 뒤 토마토 믹스를 듬뿍 올린다.
6. 굵은소금과 갓 갈아낸 후추, 마무리 올리브유를 한 번 더 두른다.
7. 빵이 눅눅해지기 전, 만든 즉시 먹을 것.$$
  ),
  (
    '바삭한 닭다리 오븐구이',
    '튀기지 않고도 바삭함을 만드는 비밀은 베이킹파우더 한 꼬집.',
    '양식', '보통', 60,
    'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800',
    2500,
$$1. 닭다리 6개의 물기를 키친타올로 완벽하게 닦아낸다 — 바삭함은 건조에서 시작된다.
2. 소금 1작은술, 후추 1/2작은술, 베이킹파우더 1/2작은술을 닭 표면에 골고루 묻힌다.
3. 식힘망 위에 올려 냉장고에서 최소 1시간(가능하면 하룻밤) 건조시킨다.$$,
$$1. 닭다리 6개의 물기를 키친타올로 완벽하게 닦아낸다 — 바삭함은 건조에서 시작된다.
2. 소금 1작은술, 후추 1/2작은술, 베이킹파우더 1/2작은술을 닭 표면에 골고루 묻힌다.
3. 식힘망 위에 올려 냉장고에서 최소 1시간(가능하면 하룻밤) 건조시킨다.
4. 오븐을 220°C로 예열한다.
5. 닭다리를 식힘망 그대로 오븐 트레이에 옮긴다 — 공기가 아래로도 순환해야 사방이 바삭해진다.
6. 220°C에서 35-40분, 표면이 짙은 황금색이 될 때까지 굽는다.
7. 마지막 5분에 마늘가루, 파프리카 가루를 살짝 뿌리고 한 번 더 굽는다.
8. 꺼낸 뒤 5분간 휴지. 레몬을 짜고 갓 다진 파슬리를 흩뿌려 마무리.$$
  ),
  (
    '계란말이 정석',
    '도시락 단골 메뉴. 약불과 한 번에 한 층씩, 두 가지만 지키면 된다.',
    '한식', '쉬움', 12,
    'https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=800',
    1300,
$$1. 계란 4개를 볼에 풀고, 소금 1/4작은술과 맛술 1작은술을 넣어 알끈이 풀릴 때까지 젓는다.
2. 체에 한 번 걸러 알끈을 제거하면 표면이 매끈해진다.
3. 사각 팬을 약불로 충분히 예열하고 식용유를 키친타올로 얇게 닦듯 두른다.$$,
$$1. 계란 4개를 볼에 풀고, 소금 1/4작은술과 맛술 1작은술을 넣어 알끈이 풀릴 때까지 젓는다.
2. 체에 한 번 걸러 알끈을 제거하면 표면이 매끈해진다.
3. 사각 팬을 약불로 충분히 예열하고 식용유를 키친타올로 얇게 닦듯 두른다.
4. 계란물 1/3을 부어 팬을 살짝 기울여 고르게 펴고, 표면이 절반쯤 익었을 때 한쪽으로 돌돌 만다.
5. 빈 자리에 식용유를 다시 닦듯 두르고 계란물 1/3을 더 부은 뒤, 만 계란을 들어 그 아래로 계란물이 흐르게 한다.
6. 다시 익으면 처음 만 방향으로 이어서 만다. 같은 과정을 한 번 더.
7. 마지막엔 김발이나 키친타올로 모양을 잡고 1분 정도 둔다.
8. 식힌 뒤 1.5cm 두께로 썰면 단면이 또렷하다. 잘게 썬 쪽파나 당근을 섞으면 색이 예쁘다.$$
  ),
  (
    '바나나 팬케이크',
    '밀가루 없이 계란 2개와 바나나 1개로 만드는 글루텐프리 아침 메뉴.',
    '디저트', '쉬움', 10,
    'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800',
    1100,
$$1. 잘 익은 바나나 1개를 포크로 곱게 으깬다. 검은 반점이 있을수록 단맛이 강하다.
2. 계란 2개를 풀어 바나나에 섞고, 시나몬 가루 1꼬집을 더한다.
3. 약불로 달군 팬에 버터 약간을 녹이고, 반죽을 한 국자씩 동그랗게 부어 굽는다.$$,
$$1. 잘 익은 바나나 1개를 포크로 곱게 으깬다. 검은 반점이 있을수록 단맛이 강하다.
2. 계란 2개를 풀어 바나나에 섞고, 시나몬 가루 1꼬집을 더한다.
3. 약불로 달군 팬에 버터 약간을 녹이고, 반죽을 한 국자씩 동그랗게 부어 굽는다.
4. 표면에 작은 기포가 송송 올라오면 (1분~1분 30초) 뒤집어 30초만 더 굽는다.
5. 너무 크게 만들면 뒤집을 때 부서진다 — 직경 8cm 정도가 적당.
6. 접시에 3-4장을 쌓고 메이플시럽이나 꿀, 견과류를 올린다.
7. 그릭요거트 한 숟가락과 베리류를 곁들이면 한 끼 식사로 손색없다.$$
  ),
  (
    '마라 가지볶음',
    '얼얼한 마라향 가득한 사천식 가지볶음. 밥도둑 보장.',
    '중식', '보통', 20,
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
    2100,
$$1. 가지 2개를 길게 4등분 후 4cm 길이로 썰고, 소금 1/2작은술 뿌려 10분 둔다.
2. 키친타올로 물기를 꽉 짜낸다 — 이 단계가 기름 폭발을 막는다.
3. 마라장 1.5큰술, 두반장 1큰술, 간장 1큰술, 설탕 1작은술을 미리 섞어둔다.$$,
$$1. 가지 2개를 길게 4등분 후 4cm 길이로 썰고, 소금 1/2작은술 뿌려 10분 둔다.
2. 키친타올로 물기를 꽉 짜낸다 — 이 단계가 기름 폭발을 막는다.
3. 마라장 1.5큰술, 두반장 1큰술, 간장 1큰술, 설탕 1작은술을 미리 섞어둔다.
4. 강불로 달군 웍에 식용유 3큰술을 넉넉히 두르고, 가지를 1분간 튀기듯 볶아 따로 빼둔다.
5. 같은 웍에 다진마늘 1큰술, 다진생강 1작은술, 화자오 1작은술을 약불로 30초 볶아 향을 낸다.
6. 미리 섞은 양념을 붓고 부글부글 끓을 때 가지를 다시 넣어 강불로 1분 휘리릭.
7. 마무리로 참기름 1작은술, 잘게 썬 쪽파를 흩뿌린다.
8. 흰 쌀밥 위에 듬뿍 올려 비벼 먹는다. 매운 게 약하면 마라장을 줄일 것.$$
  )
) as v(title, description, category, difficulty, cooking_time, image_url, price, preview, full_content)
where not exists (
  select 1 from public.recipes r where r.title = v.title
);
