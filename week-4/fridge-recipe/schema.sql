-- Supabase SQL Editor 에 붙여넣어 실행하세요.

create table if not exists ingredients (
  id         bigserial primary key,
  name       text not null,
  category   text,
  created_at timestamptz not null default now()
);

create table if not exists recipes (
  id          bigserial primary key,
  title       text not null,
  ingredients text not null,
  steps       text not null,
  cook_time   int,
  difficulty  text,
  meal_option text,
  source      text not null default 'user',
  created_at  timestamptz not null default now()
);

-- 이전 버전에서 만든 recipes 테이블이 있다면 누락 컬럼 추가
alter table recipes add column if not exists cook_time   int;
alter table recipes add column if not exists difficulty  text;
alter table recipes add column if not exists meal_option text;
alter table recipes add column if not exists source      text not null default 'user';

create index if not exists idx_ingredients_created_at on ingredients (created_at desc);
create index if not exists idx_recipes_created_at on recipes (created_at desc);

-- 모두 허용 정책 (학습용)
drop policy if exists "allow all ingredients" on public.ingredients;
drop policy if exists "allow all recipes"     on public.recipes;
create policy "allow all ingredients" on public.ingredients for all using (true) with check (true);
create policy "allow all recipes"     on public.recipes     for all using (true) with check (true);

alter table public.ingredients enable row level security;
alter table public.recipes     enable row level security;

notify pgrst, 'reload schema';
