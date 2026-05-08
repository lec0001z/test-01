-- ============================================================
-- record-shop · Supabase setup script (C2C 중고 음반 거래)
-- 실행 방법: Supabase 대시보드 → SQL Editor → 새 쿼리 → 전체 붙여넣고 Run
--
-- 변경 이력
--   v1: products / cart_items + RLS + 시드
--   v2: seller_id / sold / condition / orders / order_items / Storage / RPC
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

-- 1-1. v2 컬럼 (seller_id / sold / condition) -----------------
alter table public.products
  add column if not exists seller_id uuid references auth.users(id) on delete set null;

alter table public.products
  add column if not exists sold boolean not null default false;

alter table public.products
  add column if not exists condition text;

-- 2. cart_items 테이블 ----------------------------------------
create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  quantity    integer not null default 1 check (quantity > 0),
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

-- 3. orders / order_items 테이블 ------------------------------
create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  buyer_id     uuid not null references auth.users(id) on delete cascade,
  order_id     text not null unique,
  payment_key  text,
  amount       integer not null check (amount >= 0),
  status       text not null default 'pending' check (status in ('pending','paid','failed')),
  fail_reason  text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  title        text not null,
  artist       text not null,
  format       text not null,
  price        integer not null,
  quantity     integer not null,
  image_url    text
);

-- 4. RLS 활성화 ------------------------------------------------
alter table public.products    enable row level security;
alter table public.cart_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- 5. products 정책 --------------------------------------------
drop policy if exists "products are viewable by everyone" on public.products;
drop policy if exists "products: insert own" on public.products;
drop policy if exists "products: update own" on public.products;
drop policy if exists "products: delete own" on public.products;

create policy "products are viewable by everyone"
  on public.products for select
  using (true);

create policy "products: insert own"
  on public.products for insert
  with check (auth.uid() = seller_id);

create policy "products: update own"
  on public.products for update
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

create policy "products: delete own"
  on public.products for delete
  using (auth.uid() = seller_id);

-- 6. cart_items 정책 ------------------------------------------
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

-- 7. orders 정책 ----------------------------------------------
drop policy if exists "orders: select own" on public.orders;
drop policy if exists "orders: insert own" on public.orders;
drop policy if exists "orders: update own" on public.orders;

create policy "orders: select own"
  on public.orders for select
  using (auth.uid() = buyer_id);

create policy "orders: insert own"
  on public.orders for insert
  with check (auth.uid() = buyer_id);

create policy "orders: update own"
  on public.orders for update
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

-- 8. order_items 정책 -----------------------------------------
drop policy if exists "order_items: select via own order" on public.order_items;
drop policy if exists "order_items: insert via own order" on public.order_items;

create policy "order_items: select via own order"
  on public.order_items for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.buyer_id = auth.uid()
  ));

create policy "order_items: insert via own order"
  on public.order_items for insert
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.buyer_id = auth.uid()
  ));

-- 9. Storage 버킷 (product-images) -----------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product-images: public read"        on storage.objects;
drop policy if exists "product-images: insert authenticated" on storage.objects;
drop policy if exists "product-images: delete own"         on storage.objects;

create policy "product-images: public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product-images: insert authenticated"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "product-images: delete own"
  on storage.objects for delete
  using (bucket_id = 'product-images' and owner = auth.uid());

-- 10. RPC: 결제 완료된 본인 주문의 상품을 sold=true 로 표시 ---
--    (RLS 우회가 필요해 SECURITY DEFINER, 단 본인 + 'paid' 만 허용)
create or replace function public.mark_products_sold_for_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid;
begin
  select buyer_id into v_buyer
  from public.orders
  where id = p_order_id and status = 'paid';

  if v_buyer is null or v_buyer <> auth.uid() then
    raise exception 'order not found or not paid by current user';
  end if;

  update public.products p
  set sold = true
  from public.order_items oi
  where oi.order_id = p_order_id and oi.product_id = p.id;
end;
$$;

grant execute on function public.mark_products_sold_for_order(uuid) to authenticated;

-- 11. 시드 데이터 (한로로 / 잔나비 / 검정치마 / 실리카겔 등) -----
--    seller_id 가 NULL 이면 "샵 큐레이션" 상품으로 표시
insert into public.products (title, artist, format, price, image_url, description, condition)
select * from (values
  ('TEEN TROUBLE',         '검정치마',   'LP', 42000, 'https://picsum.photos/seed/teen-trouble/600/600',
   '청춘의 권태와 떨림을 한 장에 눌러 담은 검정치마의 명반. 연남동의 늦은 밤에 어울리는 사운드.', '미개봉'),
  ('Don''t You Worry Baby (I''m Only Swimming)','검정치마','LP',46000,'https://picsum.photos/seed/blackskirts-dyw/600/600',
   '검정치마의 정규 1집. 아날로그 마스터링이 살아있는 한정반.','A'),
  ('THIRSTY',              '검정치마',   'CD', 17000, 'https://picsum.photos/seed/blackskirts-thirsty/600/600',
   '검정치마 정규 3집. 깊고 진한 사운드와 시적인 가사.', 'A'),
  ('이상비행',              '한로로',     'LP', 38000, 'https://picsum.photos/seed/hanroro-flight/600/600',
   '한로로 특유의 시적인 가사와 차분한 어쿠스틱이 만나는 데뷔 EP. 한정 컬러반.', '미개봉'),
  ('집',                   '한로로',     'CD', 16000, 'https://picsum.photos/seed/hanroro-home/600/600',
   '"집"이라는 단어를 둘러싼 따뜻하고 쓸쓸한 풍경. 가사집이 함께 들어 있는 디지팩 사양.', 'A'),
  ('자몽살구클럽',           '한로로',     'CD', 16500, 'https://picsum.photos/seed/hanroro-jamong/600/600',
   '청량한 사운드와 풋풋한 멜로디. 여름밤 베란다에서 듣기 좋은 한 장.', '미개봉'),
  ('전설',                 '잔나비',     'LP', 41000, 'https://picsum.photos/seed/jannabi-legend/600/600',
   '잔나비 특유의 레트로 록 사운드의 정석. 따뜻한 아날로그 마스터링.', '미개봉'),
  ('YOUTH! ',              '잔나비',     'LP', 39500, 'https://picsum.photos/seed/jannabi-youth/600/600',
   '청춘의 빛과 그늘을 그려낸 잔나비 정규. 게이트폴드 자켓.', 'A'),
  ('FANFARE',              '잔나비',     'CD', 17500, 'https://picsum.photos/seed/jannabi-fanfare/600/600',
   '화려한 편곡이 돋보이는 한 장. 가사집 포함 디지팩.', 'A'),
  ('POWER ANDRE 99',       '실리카겔',   'LP', 49000, 'https://picsum.photos/seed/silica-andre/600/600',
   '실리카겔이 도달한 새로운 사이키델릭의 정점. 더블 LP, 게이트폴드 자켓.', '미개봉'),
  ('SiO2',                 '실리카겔',   'CD', 18000, 'https://picsum.photos/seed/silica-sio2/600/600',
   '데뷔 정규의 실험적 사운드. 인디 록과 일렉트로닉의 경계를 자유롭게 넘나든다.', 'A'),
  ('Machine Boy',          '실리카겔',   'CD', 18500, 'https://picsum.photos/seed/silica-machineboy/600/600',
   '실리카겔의 미니 앨범. 트립합과 록의 묘한 결합.', 'A')
) as v(title, artist, format, price, image_url, description, condition)
where not exists (
  select 1 from public.products p
  where p.title = v.title and p.artist = v.artist
);
