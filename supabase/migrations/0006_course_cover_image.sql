-- 0006_course_cover_image.sql
-- 탐색 카드에 보여줄 코스 대표 사진을 사용자가 직접 올릴 수 있게 컬럼과 전용 Storage 버킷을 추가한다.
-- 실행: Supabase SQL Editor에서 이 파일 내용을 한 번 실행하면 된다.

alter table public.courses add column if not exists cover_image_url text;

insert into storage.buckets (id, name, public)
values ('course-covers', 'course-covers', true)
on conflict (id) do nothing;

drop policy if exists "코스 사진은 누구나 조회" on storage.objects;
create policy "코스 사진은 누구나 조회" on storage.objects
  for select using (bucket_id = 'course-covers');

drop policy if exists "코스 사진 업로드는 본인 폴더에만" on storage.objects;
create policy "코스 사진 업로드는 본인 폴더에만" on storage.objects
  for insert with check (bucket_id = 'course-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "코스 사진 수정은 본인 폴더만" on storage.objects;
create policy "코스 사진 수정은 본인 폴더만" on storage.objects
  for update using (bucket_id = 'course-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "코스 사진 삭제는 본인 폴더만" on storage.objects;
create policy "코스 사진 삭제는 본인 폴더만" on storage.objects
  for delete using (bucket_id = 'course-covers' and (storage.foldername(name))[1] = auth.uid()::text);
