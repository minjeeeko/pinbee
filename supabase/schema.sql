-- ============================================================
-- 루티즈(Routiz) Supabase 스키마 + RLS
-- Supabase 대시보드 > SQL Editor 에 그대로 붙여넣고 실행하세요.
-- (필요한 확장은 Supabase 프로젝트에 기본으로 켜져 있습니다: pgcrypto → gen_random_uuid())
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles — auth.users를 앱에서 쓰는 프로필 정보로 확장
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- 회원가입(auth.users insert) 시 profiles 행을 자동 생성한다.
-- signUp 호출 시 options.data.name 으로 넘긴 값을 이름으로 쓰고, 없으면 이메일 앞부분을 쓴다.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- is_admin은 본인 스스로 못 올리게 막는다 (이미 관리자인 사람만 값을 바꿀 수 있음).
-- auth.uid()가 없는 요청(= SQL Editor·service_role 등 앱 바깥의 직접 접근)은 검사하지 않는다.
-- 그래야 최초 관리자를 SQL Editor에서 만들 수 있다.
create function public.protect_profile_admin_flag()
returns trigger
language plpgsql
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null
     and not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    new.is_admin = old.is_admin;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_admin
  before update on public.profiles
  for each row execute procedure public.protect_profile_admin_flag();

-- ------------------------------------------------------------
-- 2. places — 내장 장소 데이터 (40곳). 관리자(서비스 키)만 쓰고, 조회는 누구나.
-- ------------------------------------------------------------
create table public.places (
  id text primary key,
  name text not null,
  address text not null,
  region text not null,
  category text not null check (category in ('카페', '식당', '전시', '쇼핑', '산책', '관광')),
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
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  hidden boolean not null default false,
  date date,
  start_time text,
  author_id uuid not null references auth.users (id) on delete cascade,
  share_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  theme text not null default '',
  saved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
as $$
begin
  if new.hidden is distinct from old.hidden
     and auth.uid() is not null
     and not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
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
-- 5. saved_places — 사용자별 저장 장소 + 메모
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

-- ---- places (읽기 전용 참조 데이터) ----
create policy "장소는 누구나 조회" on public.places
  for select using (true);

-- ---- courses ----
create policy "코스 조회: 공개+비숨김 또는 본인 또는 관리자" on public.courses
  for select using (
    (visibility = 'public' and hidden = false)
    or author_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy "코스 생성은 본인 명의로만" on public.courses
  for insert with check (author_id = auth.uid());

create policy "코스 수정: 본인" on public.courses
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "코스 수정: 관리자" on public.courses
  for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

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
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
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
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy "신고 처리: 관리자만" on public.reports
  for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ---- preferences ----
create policy "선호 조건은 본인만" on public.preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
