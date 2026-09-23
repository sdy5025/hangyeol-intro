-- Supabase SQL Editor에 붙여 넣고 실행하세요.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

drop policy if exists "Authenticated users can read posts" on public.posts;
create policy "Authenticated users can read posts"
  on public.posts
  for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own posts" on public.posts;
create policy "Users can insert own posts"
  on public.posts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- 관리자 기능은 supabase/admin.sql을 이어서 실행하세요.
