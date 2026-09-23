-- 관리자 기능용 테이블과 정책입니다. SQL Editor에서 실행하세요.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.replies enable row level security;

drop policy if exists "Users can read own admin row" on public.admin_users;
create policy "Users can read own admin row"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can delete posts" on public.posts;
create policy "Admins can delete posts"
  on public.posts
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Authenticated users can read replies" on public.replies;
create policy "Authenticated users can read replies"
  on public.replies
  for select
  to authenticated
  using (true);

drop policy if exists "Admins can insert replies" on public.replies;
create policy "Admins can insert replies"
  on public.replies
  for insert
  to authenticated
  with check (public.is_admin() and auth.uid() = user_id);

drop policy if exists "Admins can delete replies" on public.replies;
create policy "Admins can delete replies"
  on public.replies
  for delete
  to authenticated
  using (public.is_admin());

create index if not exists replies_post_id_idx on public.replies (post_id, created_at);

insert into public.admin_users (user_id)
select id from auth.users
where lower(email) = lower('sdy5025@naver.com')
on conflict (user_id) do nothing;
