-- ============================================================
--  Todo App — PostgreSQL / Supabase 스키마
-- ============================================================
--  대상 DB: Supabase (PostgreSQL 15+)
--  실행 방법:
--    1) Supabase 대시보드 → SQL Editor 에 붙여넣고 Run
--    2) 또는 psql "$DATABASE_URL" -f schema.sql
-- ============================================================

-- ------------------------------------------------------------
--  Extensions
-- ------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ------------------------------------------------------------
--  공통 트리거 함수 : updated_at 자동 갱신
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
--  todos
-- ============================================================
--  현재 React 앱의 { id, text, done } 모델을 그대로 수용하면서
--  서버측에서 필요한 메타 필드(생성/수정 시각, 정렬 위치, 소유자)를
--  함께 보관한다. user_id 는 Supabase Auth (auth.users) 와 연결.
-- ------------------------------------------------------------

create table if not exists public.todos (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users(id) on delete cascade,
  text        text        not null
              check (char_length(btrim(text)) between 1 and 500),
  done        boolean     not null default false,
  position    integer     not null default 0,           -- 드래그 정렬용
  due_at      timestamptz,                              -- 마감 (옵션)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.todos              is '할 일 목록';
comment on column public.todos.user_id      is 'Supabase Auth 사용자 (NULL = 익명/로컬 모드)';
comment on column public.todos.position     is '동일 사용자 내 정렬 순서 (작을수록 위)';

-- ------------------------------------------------------------
--  Indexes
-- ------------------------------------------------------------
create index if not exists idx_todos_user_created
  on public.todos (user_id, created_at desc);

create index if not exists idx_todos_user_done
  on public.todos (user_id, done);

create index if not exists idx_todos_user_position
  on public.todos (user_id, position);

-- ------------------------------------------------------------
--  Triggers
-- ------------------------------------------------------------
drop trigger if exists trg_todos_set_updated_at on public.todos;
create trigger trg_todos_set_updated_at
before update on public.todos
for each row execute function public.set_updated_at();

-- ============================================================
--  Row Level Security (Supabase 권장)
-- ============================================================
--  본인 행만 조회/수정/삭제 가능하도록 잠근다.
--  익명 사용 시(user_id IS NULL) 는 anon 역할에 별도 정책 필요.
-- ------------------------------------------------------------

alter table public.todos enable row level security;

drop policy if exists "todos_select_own" on public.todos;
create policy "todos_select_own"
  on public.todos for select
  using (auth.uid() = user_id);

drop policy if exists "todos_insert_own" on public.todos;
create policy "todos_insert_own"
  on public.todos for insert
  with check (auth.uid() = user_id);

drop policy if exists "todos_update_own" on public.todos;
create policy "todos_update_own"
  on public.todos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "todos_delete_own" on public.todos;
create policy "todos_delete_own"
  on public.todos for delete
  using (auth.uid() = user_id);

-- ============================================================
--  (선택) 통계용 뷰
-- ============================================================
create or replace view public.todos_stats as
select
  user_id,
  count(*)                                   as total,
  count(*) filter (where done)               as done_count,
  count(*) filter (where not done)           as remaining_count,
  count(*) filter (where due_at < now()
                   and not done)             as overdue_count
from public.todos
group by user_id;

comment on view public.todos_stats is '사용자별 todo 집계 (전체/완료/남은/지연)';
