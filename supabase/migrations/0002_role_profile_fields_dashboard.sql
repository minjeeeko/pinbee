-- ============================================================
-- 0002: role 도입, 회원가입 확장 필드, 관리자 대시보드 RPC, 아바타 스토리지
-- 이미 schema.sql(0001)을 실행한 프로젝트에 이 파일을 추가로 실행하세요.
-- SQL Editor에 그대로 붙여넣고 실행하면 됩니다. 기존 데이터는 보존됩니다.
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles 확장 컬럼
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists age_group text check (age_group in ('10대', '20대', '30대', '40대', '50대 이상')),
  add column if not exists avatar_url text,
  add column if not exists referral_source text check (referral_source in ('검색(구글/네이버 등)', '지인 추천', 'SNS', '광고', '기타')),
  add column if not exists expected_features text[] not null default '{}',
  add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

-- 기존 is_admin=true였던 사람은 role='admin'으로 이관
update public.profiles set role = 'admin' where is_admin = true;

-- ------------------------------------------------------------
-- 2. is_admin(uuid) 헬퍼 — SECURITY DEFINER라 RLS 정책 안에서도
--    안전하게 role을 확인할 수 있다. 앞으로 profiles 컬럼 권한을 더
--    좁혀도 이 함수를 쓰는 정책들은 영향받지 않는다.
-- ------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role from public.profiles where id = uid) = 'admin', false);
$$;

grant execute on function public.is_admin(uuid) to authenticated, anon;

-- ------------------------------------------------------------
-- 3. is_admin 컬럼을 참조하던 트리거·정책을 전부 role/is_admin() 기반으로 교체
-- ------------------------------------------------------------
drop trigger if exists profiles_protect_admin on public.profiles;
drop function if exists public.protect_profile_admin_flag();

create function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin(auth.uid()) then
    new.role = old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute procedure public.protect_profile_role();

-- 함수 이름은 그대로 두고 본문만 role 기반으로 교체 (기존 트리거가 자동으로 새 본문을 쓰게 됨)
create or replace function public.protect_course_hidden_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.hidden is distinct from old.hidden
     and auth.uid() is not null
     and not public.is_admin(auth.uid()) then
    new.hidden = old.hidden;
  end if;
  return new;
end;
$$;

drop policy if exists "코스 조회: 공개+비숨김 또는 본인 또는 관리자" on public.courses;
create policy "코스 조회: 공개+비숨김 또는 본인 또는 관리자" on public.courses
  for select using (
    (visibility = 'public' and hidden = false)
    or author_id = auth.uid()
    or public.is_admin(auth.uid())
  );

drop policy if exists "코스 수정: 관리자" on public.courses;
create policy "코스 수정: 관리자" on public.courses
  for update using (public.is_admin(auth.uid()));

drop policy if exists "코스 장소 조회" on public.course_places;
create policy "코스 장소 조회" on public.course_places
  for select using (
    exists (
      select 1 from public.courses c
      where c.id = course_places.course_id
        and (
          (c.visibility = 'public' and c.hidden = false)
          or c.author_id = auth.uid()
          or public.is_admin(auth.uid())
        )
    )
  );

drop policy if exists "신고 조회: 본인 또는 관리자" on public.reports;
create policy "신고 조회: 본인 또는 관리자" on public.reports
  for select using (
    reporter_id = auth.uid()
    or public.is_admin(auth.uid())
  );

drop policy if exists "신고 처리: 관리자만" on public.reports;
create policy "신고 처리: 관리자만" on public.reports
  for update using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- role로 완전히 대체됐으니 이제 제거한다
alter table public.profiles drop column if exists is_admin;

-- ------------------------------------------------------------
-- 4. 회원가입 트리거가 새 필드까지 채우도록 갱신
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, age_group, referral_source, expected_features)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'age_group',
    new.raw_user_meta_data ->> 'referral_source',
    coalesce(
      (select array_agg(x) from jsonb_array_elements_text(new.raw_user_meta_data -> 'expected_features') as x),
      '{}'::text[]
    )
  );
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 5. 내 프로필은 RPC로 읽는다 (본인 것만, SECURITY DEFINER)
-- ------------------------------------------------------------
create or replace function public.get_my_profile()
returns public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select * from public.profiles where id = auth.uid();
$$;

grant execute on function public.get_my_profile() to authenticated;

-- ------------------------------------------------------------
-- 6. 관리자 대시보드 통계 RPC — 관리자가 아니면 예외를 던진다
--    (사용자 수·연령대 분포 등은 profiles를 직접 집계하지 않고 반드시 이 RPC로만 본다)
-- ------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception '관리자만 볼 수 있어요' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'new_users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'total_courses', (select count(*) from public.courses),
    'public_courses', (select count(*) from public.courses where visibility = 'public'),
    'private_courses', (select count(*) from public.courses where visibility = 'private'),
    'hidden_courses', (select count(*) from public.courses where hidden = true),
    'pending_reports', (select count(*) from public.reports where status = 'pending'),
    'age_group_counts', (
      select coalesce(jsonb_object_agg(age_group, cnt), '{}'::jsonb)
      from (select coalesce(age_group, '미입력') as age_group, count(*) cnt from public.profiles group by 1) t
    ),
    'referral_source_counts', (
      select coalesce(jsonb_object_agg(referral_source, cnt), '{}'::jsonb)
      from (select coalesce(referral_source, '미입력') as referral_source, count(*) cnt from public.profiles group by 1) t
    ),
    'expected_feature_counts', (
      select coalesce(jsonb_object_agg(feature, cnt), '{}'::jsonb)
      from (select unnest(expected_features) as feature, count(*) cnt from public.profiles group by 1) t
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_stats() to authenticated;

-- ------------------------------------------------------------
-- 7. 프로필 이미지용 Storage 버킷 + 정책 (본인 폴더에만 쓰기, 조회는 공개)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "아바타는 누구나 조회" on storage.objects;
create policy "아바타는 누구나 조회" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "아바타 업로드는 본인 폴더에만" on storage.objects;
create policy "아바타 업로드는 본인 폴더에만" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "아바타 수정은 본인 폴더만" on storage.objects;
create policy "아바타 수정은 본인 폴더만" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "아바타 삭제는 본인 폴더만" on storage.objects;
create policy "아바타 삭제는 본인 폴더만" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
