-- 0003_geocoded_places.sql
-- 주소 검색(Geocoding)으로 찾은 장소를 코스·저장 장소에 쓸 수 있게 한다.
-- 실행: Supabase SQL Editor에서 이 파일 내용을 한 번 실행하면 된다 (0001, 0002를 이미 적용한 DB 기준).

-- 1) 업종을 알 수 없는 주소 검색 결과를 담을 수 있도록 카테고리 제약을 넓힌다.
alter table public.places drop constraint places_category_check;
alter table public.places add constraint places_category_check
  check (category in ('카페', '식당', '전시', '쇼핑', '산책', '관광', '기타'));

-- 2) 로그인한 사용자가 주소 검색 결과를 places에 추가할 수 있게 한다.
--    id가 'p-geo-'로 시작하는 행만 허용해 내장 40곳(다른 id 형식)은 건드릴 수 없다.
--    update/delete 정책은 추가하지 않으므로, 로그인 사용자도 기존 장소는 수정·삭제할 수 없다.
create policy "주소 검색 장소는 로그인 사용자가 추가" on public.places
  for insert to authenticated with check (id like 'p-geo-%');
