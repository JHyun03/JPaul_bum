-- =====================================================================
-- 🥕 당근 사진 마을 전시회 - Supabase 설정 (무료 플랜)
-- Supabase 대시보드 → SQL Editor → 이 파일 내용을 전부 붙여넣고 Run.
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ---------- 설정 (동호회 입장 코드) ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  club_code text
);
insert into public.settings (id, club_code) values (1, null) on conflict (id) do nothing;
alter table public.settings enable row level security;
-- 정책이 없으므로 앱에서 코드를 읽을 수 없어요 (아래 함수로만 확인).

-- ---------- 회원 (입장 코드를 통과한 기기) ----------
create table if not exists public.members (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  joined_at timestamptz not null default now()
);
alter table public.members enable row level security;
drop policy if exists "members: read own" on public.members;
create policy "members: read own" on public.members
  for select to authenticated using (user_id = auth.uid());

-- ---------- 작품 ----------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  path text not null,
  title text not null check (char_length(title) between 1 and 40),
  description text not null default '' check (char_length(description) <= 300),
  nickname text not null check (char_length(nickname) between 1 and 16),
  character text not null check (character in ('carrot','bunny','radish','potato','squirrel','hedgehog')),
  created_at timestamptz not null default now()
);
alter table public.photos enable row level security;

drop policy if exists "photos: anyone can view" on public.photos;
create policy "photos: anyone can view" on public.photos
  for select to anon, authenticated using (true);

drop policy if exists "photos: members can add" on public.photos;
create policy "photos: members can add" on public.photos
  for insert to authenticated with check (
    user_id = auth.uid()
    and path like auth.uid()::text || '/%'
    and exists (select 1 from public.members m where m.user_id = auth.uid())
  );

drop policy if exists "photos: owner can delete" on public.photos;
create policy "photos: owner can delete" on public.photos
  for delete to authenticated using (user_id = auth.uid());

-- ---------- 좋아요 ----------
create table if not exists public.likes (
  photo_id uuid not null references public.photos on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);
alter table public.likes enable row level security;

drop policy if exists "likes: anyone can view" on public.likes;
create policy "likes: anyone can view" on public.likes
  for select to anon, authenticated using (true);
drop policy if exists "likes: like as myself" on public.likes;
create policy "likes: like as myself" on public.likes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "likes: unlike my own" on public.likes;
create policy "likes: unlike my own" on public.likes
  for delete to authenticated using (user_id = auth.uid());

-- ---------- 전시 목록 (좋아요 수 포함) ----------
create or replace view public.photo_feed with (security_invoker = true) as
  select p.id, p.user_id, p.path, p.title, p.description, p.nickname, p.character, p.created_at,
         (select count(*) from public.likes l where l.photo_id = p.id)::int as likes
  from public.photos p;
grant select on public.photo_feed to anon, authenticated;

-- ---------- 함수 ----------
-- 입장 코드가 필요한지 (코드 자체는 알려주지 않음)
create or replace function public.club_requires_code()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(trim(club_code), '') <> '' from public.settings where id = 1 $$;

-- 입장 코드 확인 후 회원 등록
create or replace function public.join_club(code text)
returns boolean language plpgsql volatile security definer set search_path = ''
as $$
declare
  expected text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select coalesce(trim(club_code), '') into expected from public.settings where id = 1;
  if coalesce(expected, '') = '' or trim(coalesce(code, '')) = expected then
    insert into public.members (user_id) values (auth.uid()) on conflict do nothing;
    return true;
  end if;
  perform pg_sleep(1); -- 코드 무작위 대입을 느리게
  return false;
end $$;

revoke all on function public.join_club(text) from public;
grant execute on function public.club_requires_code() to anon, authenticated;
grant execute on function public.join_club(text) to authenticated;

-- ---------- 사진 저장소 (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos bucket: members upload to own folder" on storage.objects;
create policy "photos bucket: members upload to own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.members m where m.user_id = auth.uid())
  );

-- 파일 삭제 시 Storage API가 내 파일을 조회할 수 있어야 해요.
drop policy if exists "photos bucket: read own files" on storage.objects;
create policy "photos bucket: read own files" on storage.objects
  for select to authenticated using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "photos bucket: delete own files" on storage.objects;
create policy "photos bucket: delete own files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- 동호회 입장 코드 설정 (선택) — 원하는 코드로 바꿔서 이 줄만 다시 실행하세요.
-- 코드를 없애려면 null 로 설정하면 누구나 작품을 걸 수 있어요.
--
--   update public.settings set club_code = '당근사진2026' where id = 1;
-- =====================================================================
