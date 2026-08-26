-- 0004_courses_author_profiles_fk.sql
-- "저장에 실패했어요: Could not find a relationship between 'courses' and 'profiles'
-- in the schema cache" 에러를 고친다.
--
-- db.ts의 COURSE_SELECT('*, course_places(*), profiles(name)')는 코스를 조회할 때마다
-- 작성자 이름(profiles.name)을 함께 묶어(embed) 가져온다. PostgREST는 두 테이블 사이에
-- "직접" 걸린 외래키가 있어야만 이렇게 자동으로 묶을 수 있는데, 지금은
-- courses.author_id가 auth.users(id)만 참조하고 있다 (profiles.id도 auth.users(id)를
-- 참조하지만, courses와 profiles 사이엔 서로 연결된 외래키가 없다). 그래서 코스를
-- 조회·저장할 때마다 이 관계를 못 찾아 실패한다.
--
-- 실행: Supabase SQL Editor에서 이 파일 내용을 한 번 실행하면 된다.
-- (전제: courses.author_id에 들어있는 모든 값이 profiles.id에도 존재해야 제약이 걸린다.
--  회원가입 시 트리거로 profiles가 항상 같이 생기므로 정상 가입한 사용자라면 문제없다.)

alter table public.courses
  add constraint courses_author_id_profiles_fkey
  foreign key (author_id) references public.profiles (id);
