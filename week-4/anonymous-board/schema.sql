-- ============================================
-- Supabase Dashboard → SQL Editor 에서 실행
-- ============================================

-- 게시글 테이블
create table if not exists posts (
  id          bigserial primary key,
  category    text not null check (category in ('고민', '칭찬', '응원')),
  content     text not null check (char_length(content) between 1 and 500),
  likes       integer not null default 0,
  created_at  timestamptz not null default now()
);

-- 정렬용 인덱스 (최신순/공감순)
create index if not exists posts_created_at_idx on posts (created_at desc);
create index if not exists posts_likes_idx      on posts (likes desc);

-- 누가 어느 글에 공감했는지 기록 (한 client_id 당 한 번만 가능)
create table if not exists post_likes (
  post_id     bigint not null references posts(id) on delete cascade,
  client_id   text   not null,
  created_at  timestamptz not null default now(),
  primary key (post_id, client_id)
);
