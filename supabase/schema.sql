-- ============================================================
-- 루티즈(Routiz) Supabase 스키마 + RLS
-- Supabase 대시보드 > SQL Editor 에 그대로 붙여넣고 실행하세요.
-- (필요한 확장은 Supabase 프로젝트에 기본으로 켜져 있습니다: pgcrypto → gen_random_uuid())
--
-- 이미 이 파일의 이전 버전을 실행한 적이 있다면(= is_admin 컬럼이 있는 상태) 이 파일을
-- 다시 실행하지 말고 supabase/migrations/0002_role_profile_fields_dashboard.sql 을 실행하세요.
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles — auth.users를 앱에서 쓰는 프로필 정보로 확장
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  age_group text check (age_group in ('10대', '20대', '30대', '40대', '50대 이상')),
  avatar_url text,
  referral_source text check (referral_source in ('검색(구글/네이버 등)', '지인 추천', 'SNS', '광고', '기타')),
  expected_features text[] not null default '{}',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- 회원가입(auth.users insert) 시 profiles 행을 자동 생성한다.
-- signUp 호출 시 options.data(name/age_group/referral_source/expected_features)로 넘긴 값을 그대로 채운다.
create function public.handle_new_user()
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- is_admin(uid) — SECURITY DEFINER라 RLS 정책 안에서 안전하게 role을 확인할 수 있다.
-- (profiles의 select 정책이 나중에 더 좁아져도 이 함수를 쓰는 정책들은 영향받지 않는다)
create function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role from public.profiles where id = uid) = 'admin', false);
$$;

grant execute on function public.is_admin(uuid) to authenticated, anon;

-- role은 본인 스스로 못 올리게 막는다 (이미 관리자인 사람만 값을 바꿀 수 있음).
-- auth.uid()가 없는 요청(= SQL Editor·service_role 등 앱 바깥의 직접 접근)은 검사하지 않는다.
-- 그래야 최초 관리자를 SQL Editor에서 만들 수 있다.
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

-- 내 프로필은 이 RPC로 읽는다 (본인 것만, SECURITY DEFINER)
create function public.get_my_profile()
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
-- 2. places — 내장 장소 데이터 (40곳). 관리자(서비스 키)만 쓰고, 조회는 누구나.
-- ------------------------------------------------------------
create table public.places (
  id text primary key,
  name text not null,
  address text not null,
  region text not null,
  category text not null check (category in ('카페', '식당', '전시', '쇼핑', '산책', '관광', '기타')),
  lat double precision not null,
  lng double precision not null,
  open_min int,
  close_min int,
  description text,
  like_count int not null default 0
);

-- ------------------------------------------------------------
-- 3. courses — 코스(내 코스 / 공개 코스 공용)
-- ------------------------------------------------------------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  description text not null default '',
  cover_place_id text references public.places (id) on delete set null,
  -- 코스 등록 시 사용자가 직접 올린 대표 사진 (course-covers 버킷의 공개 URL). 안 올렸으면 null
  cover_image_url text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  hidden boolean not null default false,
  date date,
  start_time text,
  author_id uuid not null references auth.users (id) on delete cascade,
  share_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  theme text not null default '',
  -- 탐색 화면 카드에 보여줄 대표 지역. 코스에 담긴 장소들에서 자동으로 뽑지 않고
  -- 코스 저장 시 사용자가 직접 고른 값을 그대로 저장한다.
  region text,
  saved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- author_id -> profiles(id)로도 걸어둬야 PostgREST가 코스 조회 시 작성자 이름
  -- (profiles.name)을 자동으로 묶어(embed) 가져올 수 있다. auth.users(id) 참조만 있으면
  -- courses와 profiles 사이에 직접 연결이 없어 "Could not find a relationship between
  -- 'courses' and 'profiles'" 에러로 코스 조회·저장이 전부 실패한다.
  constraint courses_author_id_profiles_fkey foreign key (author_id) references public.profiles (id)
);

create index courses_author_id_idx on public.courses (author_id);
create index courses_visibility_idx on public.courses (visibility) where visibility = 'public';

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute procedure public.set_updated_at();

-- hidden(관리자 숨김 처리)은 관리자만 바꿀 수 있게 막는다.
-- auth.uid()가 없는 요청(= SQL Editor·service_role 등 앱 바깥의 직접 접근)은 검사하지 않는다.
create function public.protect_course_hidden_flag()
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

create trigger courses_protect_hidden
  before update on public.courses
  for each row execute procedure public.protect_course_hidden_flag();

-- ------------------------------------------------------------
-- 4. course_places — 코스에 담긴 장소 (순서 = position)
-- ------------------------------------------------------------
create table public.course_places (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  place_id text not null references public.places (id),
  position int not null,
  stay_minutes int not null default 60,
  memo text not null default '',
  transport_to_next text not null default 'walk' check (transport_to_next in ('walk', 'transit', 'car')),
  unique (course_id, position)
);

create index course_places_course_id_idx on public.course_places (course_id);

-- ------------------------------------------------------------
-- 5. saved_places — 사용자별 저장 장소 + 개인 메모
-- ------------------------------------------------------------
create table public.saved_places (
  user_id uuid not null references auth.users (id) on delete cascade,
  place_id text not null references public.places (id),
  memo text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

-- ------------------------------------------------------------
-- 6. reports — 공개 코스 신고
-- ------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'hidden', 'deleted', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolver_id uuid references auth.users (id)
);

-- 같은 사람이 같은 코스를 중복으로 대기중 신고하는 것을 DB 차원에서 막는다
create unique index reports_one_pending_per_reporter
  on public.reports (course_id, reporter_id)
  where status = 'pending';

-- ------------------------------------------------------------
-- 7. preferences — 사용자별 선호 조건
-- ------------------------------------------------------------
create table public.preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  transport text not null default 'mixed' check (transport in ('walk', 'transit', 'car', 'mixed')),
  max_leg_minutes int not null default 30,
  categories text[] not null default '{}',
  pace text not null default 'normal' check (pace in ('tight', 'normal', 'relaxed'))
);

-- ------------------------------------------------------------
-- 8. admin_stats() — 관리자 대시보드 통계 RPC. 관리자가 아니면 예외를 던진다.
--    사용자 수·연령대 분포 등은 profiles를 직접 집계하지 않고 반드시 이 RPC로만 본다.
-- ------------------------------------------------------------
create function public.admin_stats()
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
-- 9. avatars — 프로필 이미지 Storage 버킷 + 정책 (본인 폴더에만 쓰기, 조회는 공개)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "아바타는 누구나 조회" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "아바타 업로드는 본인 폴더에만" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "아바타 수정은 본인 폴더만" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "아바타 삭제는 본인 폴더만" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------
-- 10. course-covers — 코스 대표 사진 Storage 버킷 + 정책 (본인 폴더에만 쓰기, 조회는 공개)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('course-covers', 'course-covers', true)
on conflict (id) do nothing;

create policy "코스 사진은 누구나 조회" on storage.objects
  for select using (bucket_id = 'course-covers');

create policy "코스 사진 업로드는 본인 폴더에만" on storage.objects
  for insert with check (bucket_id = 'course-covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "코스 사진 수정은 본인 폴더만" on storage.objects
  for update using (bucket_id = 'course-covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "코스 사진 삭제는 본인 폴더만" on storage.objects
  for delete using (bucket_id = 'course-covers' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.courses enable row level security;
alter table public.course_places enable row level security;
alter table public.saved_places enable row level security;
alter table public.reports enable row level security;
alter table public.preferences enable row level security;

-- ---- profiles ----
create policy "프로필 조회는 누구나" on public.profiles
  for select using (true);

create policy "프로필 수정은 본인만" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---- places (읽기 전용 참조 데이터 + 주소 검색으로 찾은 장소는 로그인 사용자가 추가 가능) ----
create policy "장소는 누구나 조회" on public.places
  for select using (true);

-- 주소 검색(geocoding) 결과만 추가 가능 (id가 'p-geo-'로 시작). 내장 40곳은 id가 다르므로 변경 불가.
-- update/delete 정책은 없으므로 로그인 사용자도 기존 장소를 수정·삭제할 수 없다.
create policy "주소 검색 장소는 로그인 사용자가 추가" on public.places
  for insert to authenticated with check (id like 'p-geo-%');

-- ---- courses ----
create policy "코스 조회: 공개+비숨김 또는 본인 또는 관리자" on public.courses
  for select using (
    (visibility = 'public' and hidden = false)
    or author_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create policy "코스 생성은 본인 명의로만" on public.courses
  for insert with check (author_id = auth.uid());

create policy "코스 수정: 본인" on public.courses
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "코스 수정: 관리자" on public.courses
  for update using (public.is_admin(auth.uid()));

create policy "코스 삭제: 본인" on public.courses
  for delete using (author_id = auth.uid());

-- ---- course_places (부모 코스 권한을 그대로 따라감) ----
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

create policy "코스 장소 쓰기: 본인 코스만" on public.course_places
  for all using (
    exists (select 1 from public.courses c where c.id = course_places.course_id and c.author_id = auth.uid())
  ) with check (
    exists (select 1 from public.courses c where c.id = course_places.course_id and c.author_id = auth.uid())
  );

-- ---- saved_places (완전히 개인 데이터) ----
create policy "저장 장소는 본인만" on public.saved_places
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- reports ----
create policy "신고 생성: 로그인 사용자 본인 명의로만" on public.reports
  for insert with check (reporter_id = auth.uid());

create policy "신고 조회: 본인 또는 관리자" on public.reports
  for select using (
    reporter_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create policy "신고 처리: 관리자만" on public.reports
  for update using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---- preferences ----
create policy "선호 조건은 본인만" on public.preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
