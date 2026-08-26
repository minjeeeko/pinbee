-- 0005_courses_region.sql
-- 탐색(공개 코스) 카드에 보여줄 지역을 코스에 담긴 장소들에서 자동으로 뽑는 대신,
-- 코스 저장 시 사용자가 직접 고른 값으로 고정해서 보여주기 위한 컬럼.
-- 실행: Supabase SQL Editor에서 이 파일 내용을 한 번 실행하면 된다.

alter table public.courses add column if not exists region text;
