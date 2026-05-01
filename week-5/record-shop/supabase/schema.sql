-- ============================================================
-- record-shop · Supabase setup script
-- 실행 방법: Supabase 대시보드 → SQL Editor → 새 쿼리 → 전체 붙여넣고 Run
-- ============================================================

-- 1. products 테이블 ------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  artist      text not null,
  format      text not null check (format in ('LP', 'CD')),
  price       integer not null check (price >= 0),
  image_url   text,
  description text,
  created_at  timestamptz not null default now()
);

-- 2. cart_items 테이블 ----------------------------------------
create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  quantity    integer not null default 1 check (quantity > 0),
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

-- 3. RLS 활성화 ------------------------------------------------
alter table public.products    enable row level security;
alter table public.cart_items  enable row level security;

-- 4. products 정책: 모두에게 읽기 허용 -------------------------
drop policy if exists "products are viewable by everyone" on public.products;
create policy "products are viewable by everyone"
  on public.products for select
  using (true);

-- 5. cart_items 정책: 본인 데이터만 CRUD ----------------------
drop policy if exists "cart: select own"  on public.cart_items;
drop policy if exists "cart: insert own"  on public.cart_items;
drop policy if exists "cart: update own"  on public.cart_items;
drop policy if exists "cart: delete own"  on public.cart_items;

create policy "cart: select own"
  on public.cart_items for select
  using (auth.uid() = user_id);

create policy "cart: insert own"
  on public.cart_items for insert
  with check (auth.uid() = user_id);

create policy "cart: update own"
  on public.cart_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cart: delete own"
  on public.cart_items for delete
  using (auth.uid() = user_id);

-- 6. 시드 데이터 (인디 LP/CD) --------------------------------
-- 이미 있다면 중복 입력을 막기 위해 title+artist 조합으로 검사
insert into public.products (title, artist, format, price, image_url, description)
select * from (values
  ('TEEN TROUBLE',         '검정치마',   'LP', 42000, 'https://picsum.photos/seed/teen-trouble/600/600',
   '청춘의 권태와 떨림을 한 장에 눌러 담은 검정치마의 명반. 연남동의 늦은 밤에 어울리는 사운드.'),
  ('이상비행',              '한로로',     'LP', 38000, 'https://picsum.photos/seed/hanroro-flight/600/600',
   '한로로 특유의 시적인 가사와 차분한 어쿠스틱이 만나는 데뷔 EP. 한정 컬러반.'),
  ('집',                   '한로로',     'CD', 16000, 'https://picsum.photos/seed/hanroro-home/600/600',
   '"집"이라는 단어를 둘러싼 따뜻하고 쓸쓸한 풍경. 가사집이 함께 들어 있는 디지팩 사양.'),
  ('자몽살구클럽',           '한로로',     'CD', 16500, 'https://picsum.photos/seed/hanroro-jamong/600/600',
   '청량한 사운드와 풋풋한 멜로디. 여름밤 베란다에서 듣기 좋은 한 장.'),
  ('POWER ANDRE 99',       '실리카겔',   'LP', 49000, 'https://picsum.photos/seed/silica-andre/600/600',
   '실리카겔이 도달한 새로운 사이키델릭의 정점. 더블 LP, 게이트폴드 자켓.'),
  ('SiO2',                 '실리카겔',   'CD', 18000, 'https://picsum.photos/seed/silica-sio2/600/600',
   '데뷔 정규의 실험적 사운드. 인디 록과 일렉트로닉의 경계를 자유롭게 넘나든다.'),
  ('비결',                 '새소년',     'LP', 39000, 'https://picsum.photos/seed/sesonyeon-bigyeol/600/600',
   '황소윤의 보컬과 기타가 만들어내는 묘한 긴장감. 인디 록 팬이라면 반드시 소장.'),
  ('잘 자',                '새소년',     'CD', 15500, 'https://picsum.photos/seed/sesonyeon-jalja/600/600',
   '잠 못 드는 새벽에 어울리는 일곱 곡. 한정판 포토북 포함.'),
  ('전설',                 '잔나비',     'LP', 41000, 'https://picsum.photos/seed/jannabi-legend/600/600',
   '레트로 록 사운드의 정석. 따뜻한 아날로그 마스터링 버전.'),
  ('MELANCHOLY',           '혁오',       'CD', 17000, 'https://picsum.photos/seed/hyukoh-melancholy/600/600',
   '담담한 멜로디 위에 쌓인 도시의 정서. 미니멀한 자켓이 인상적이다.'),
  ('Story',                '데이먼스 이어','LP', 44000, 'https://picsum.photos/seed/damons-story/600/600',
   '서정적인 보컬과 풍성한 편곡이 어우러진 한국 인디의 명반.'),
  ('아침',                 '아도이',     'CD', 16500, 'https://picsum.photos/seed/adoy-morning/600/600',
   '시티팝의 따스한 결을 인디 감성으로 재해석한 미니 앨범.')
) as v(title, artist, format, price, image_url, description)
where not exists (
  select 1 from public.products p
  where p.title = v.title and p.artist = v.artist
);
