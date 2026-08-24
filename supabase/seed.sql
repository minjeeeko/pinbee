-- ============================================================
-- 기본 장소 데이터 40곳 (public.places)
-- ============================================================
insert into public.places (id, name, address, region, category, lat, lng, open_min, close_min, description, like_count) values
  ('p-yn-brunch', '연남동 브런치하우스', '서울 마포구 연남로 32', '마포', '식당', 37.5619, 126.9256, 600, 1260, '연남동 골목 브런치 카페', 136),
  ('p-yn-roaster', '연남 로스터리 커피', '서울 마포구 성미산로 161', '마포', '카페', 37.5641, 126.9245, 540, 1320, '직접 볶는 스페셜티 로스터리', 464),
  ('p-yn-gallery', '연남 사진 전시관', '서울 마포구 동교로 254', '마포', '전시', 37.5602, 126.9284, 660, 1140, '소규모 사진 기획전', 208),
  ('p-hd-rooftop', '루프탑 카페 하늘', '서울 마포구 연남로 12', '마포', '카페', 37.5567, 126.9231, 720, 1380, '홍대 뷰 루프탑', 470),
  ('p-hd-market', '동진시장 커피', '서울 마포구 성미산로 198', '마포', '카페', 37.5657, 126.9258, 660, 1200, null, 220),
  ('p-mw-bakery', '망원 베이커리', '서울 마포구 포은로 88', '마포', '카페', 37.5556, 126.9059, 480, 1200, '아침 일찍 여는 동네 빵집', 295),
  ('p-mw-market', '망원시장', '서울 마포구 포은로8길 14', '마포', '쇼핑', 37.5561, 126.9026, 540, 1260, null, 201),
  ('p-gj-books', '경의선 책거리', '서울 마포구 와우산로 92', '마포', '관광', 37.5556, 126.9243, 600, 1200, null, 361),
  ('p-hj-noodle', '합정 손칼국수', '서울 마포구 양화로 45', '마포', '식당', 37.5495, 126.9139, 660, 1260, null, 115),
  ('p-hd-record', '홍대 레코드샵', '서울 마포구 와우산로 29', '마포', '쇼핑', 37.5533, 126.9245, 780, 1320, null, 69),
  ('p-hg-park', '한강 나들목 산책로', '서울 용산구 이촌로 72', '용산', '산책', 37.5177, 126.9668, null, null, '노을 보기 좋은 한강 산책 코스', 407),
  ('p-hn-museum', '한남 현대미술관', '서울 용산구 독서당로 60', '용산', '전시', 37.5385, 127.0011, 600, 1080, '기획 전시 중심 미술관', 234),
  ('p-hn-cafe', '한남 언덕 카페', '서울 용산구 대사관로 31', '용산', '카페', 37.5359, 127.0032, 660, 1320, null, 89),
  ('p-it-kebab', '이태원 케밥하우스', '서울 용산구 이태원로 165', '용산', '식당', 37.5346, 126.9946, 690, 1380, null, 45),
  ('p-yc-sunset', '이촌 한강공원 노을 전망', '서울 용산구 이촌로72길', '용산', '산책', 37.5171, 126.9741, null, null, null, 202),
  ('p-ys-tower', '남산 서울타워', '서울 용산구 남산공원길 105', '용산', '관광', 37.5512, 126.9882, 600, 1320, null, 461),
  ('p-ss-forest', '서울숲 산책길', '서울 성동구 뚝섬로 273', '성동', '산책', 37.5443, 127.0374, null, null, null, 70),
  ('p-ss-coffee', '성수 창고 카페', '서울 성동구 연무장길 45', '성동', '카페', 37.5427, 127.0554, 600, 1260, '정미소를 개조한 대형 카페', 403),
  ('p-ss-popup', '성수 팝업 스토어', '서울 성동구 아차산로 104', '성동', '쇼핑', 37.5449, 127.0561, 720, 1200, null, 386),
  ('p-ss-gallery', '성수 미디어 전시관', '서울 성동구 왕십리로 83', '성동', '전시', 37.5471, 127.0442, 660, 1140, null, 357),
  ('p-ss-gogi', '성수 화로구이', '서울 성동구 연무장길 11', '성동', '식당', 37.5411, 127.0533, 960, 1380, '저녁에만 여는 화로구이', 270),
  ('p-bc-hanok', '북촌 한옥마을', '서울 종로구 계동길 37', '종로', '관광', 37.5826, 126.985, 540, 1080, null, 82),
  ('p-sc-teahouse', '삼청동 전통 찻집', '서울 종로구 삼청로 76', '종로', '카페', 37.5843, 126.9812, 600, 1260, null, 335),
  ('p-gb-palace', '경복궁', '서울 종로구 사직로 161', '종로', '관광', 37.5796, 126.977, 540, 1020, '조선의 법궁, 야간 개장 시즌 별도', 341),
  ('p-ij-museum', '국립현대미술관 서울', '서울 종로구 삼청로 30', '종로', '전시', 37.5787, 126.98, 600, 1080, null, 389),
  ('p-uj-bar', '을지로 노포 골목', '서울 중구 을지로 157', '중구', '식당', 37.5665, 126.9915, 1020, 1440, null, 302),
  ('p-uj-coffee', '을지로 다방', '서울 중구 충무로 18', '중구', '카페', 37.5641, 126.993, 540, 1140, null, 338),
  ('p-dd-plaza', 'DDP 디자인플라자', '서울 중구 을지로 281', '중구', '전시', 37.5665, 127.0092, 600, 1200, null, 228),
  ('p-mg-shop', '명동 쇼핑거리', '서울 중구 명동길 14', '중구', '쇼핑', 37.5637, 126.9829, 600, 1320, null, 50),
  ('p-cg-stream', '청계천 산책로', '서울 중구 청계천로', '중구', '산책', 37.5696, 126.9784, null, null, null, 202),
  ('p-gn-dessert', '가로수길 디저트바', '서울 강남구 압구정로10길 25', '강남', '카페', 37.5203, 127.0227, 720, 1380, null, 240),
  ('p-gn-omakase', '신사동 오마카세', '서울 강남구 도산대로 122', '강남', '식당', 37.5223, 127.0231, 1080, 1320, '예약제 · 2회차 운영', 88),
  ('p-cd-park', '코엑스 별마당 도서관', '서울 강남구 영동대로 513', '강남', '관광', 37.5115, 127.0595, 630, 1320, null, 14),
  ('p-sc-arts', '예술의전당', '서울 서초구 남부순환로 2406', '서초', '전시', 37.4794, 127.0113, 600, 1140, null, 77),
  ('p-js-lake', '석촌호수 산책로', '서울 송파구 잠실로 148', '송파', '산책', 37.509, 127.1029, null, null, null, 485),
  ('p-js-mall', '잠실 롯데월드몰', '서울 송파구 올림픽로 300', '송파', '쇼핑', 37.5125, 127.1025, 630, 1320, null, 65),
  ('p-yd-park', '여의도 한강공원', '서울 영등포구 여의동로 330', '영등포', '산책', 37.5285, 126.9337, null, null, null, 279),
  ('p-yd-noodle', '여의도 콩국수', '서울 영등포구 국제금융로 10', '영등포', '식당', 37.5254, 126.9255, 660, 1200, null, 46),
  ('p-sd-cafe', '연희동 정원 카페', '서울 서대문구 연희로 87', '서대문', '카페', 37.5687, 126.9312, 660, 1320, null, 64),
  ('p-sd-hill', '안산 자락길', '서울 서대문구 봉원사길 75', '서대문', '산책', 37.5745, 126.9482, null, null, null, 176);

-- ============================================================
-- (선택) 데모용 공개 코스 시드
-- 아래 00000000-0000-0000-0000-000000000000 자리는 회원가입 후
--   select id from auth.users where email = '가입한 이메일';
-- 로 얻은 UUID로 전부 바꿔서(찾기/바꾸기) 실행하세요.
-- ============================================================
-- 연남 → 한강 노을 코스 (원래 author: 코코)
with new_course as (
  insert into public.courses (title, description, cover_place_id, visibility, hidden, theme, saved, author_id)
  values ('연남 → 한강 노을 코스', '브런치부터 노을 산책까지 이어지는 동선. 이동은 도보와 대중교통을 섞었어요.', 'p-yn-brunch', 'public', false, '데이트', true, '00000000-0000-0000-0000-000000000000'::uuid)
  returning id
)
insert into public.course_places (course_id, place_id, position, stay_minutes, memo, transport_to_next)
select id, v.place_id, v.position, v.stay_minutes, v.memo, v.transport_to_next from new_course, (values
  ('p-yn-brunch', 0, 60, '오픈 시간 맞춰 가면 웨이팅 없음', 'walk'),
  ('p-yn-gallery', 1, 50, '', 'transit'),
  ('p-hg-park', 2, 80, '노을 시간대 추천', 'walk')
) as v(place_id, position, stay_minutes, memo, transport_to_next);

-- 성수 카페 투어 하루 (원래 author: 빈)
with new_course as (
  insert into public.courses (title, description, cover_place_id, visibility, hidden, theme, saved, author_id)
  values ('성수 카페 투어 하루', '창고형 카페와 팝업 스토어 위주로 도보 이동만으로 구성했어요.', 'p-ss-coffee', 'public', false, '카페 투어', true, '00000000-0000-0000-0000-000000000000'::uuid)
  returning id
)
insert into public.course_places (course_id, place_id, position, stay_minutes, memo, transport_to_next)
select id, v.place_id, v.position, v.stay_minutes, v.memo, v.transport_to_next from new_course, (values
  ('p-ss-coffee', 0, 70, '', 'walk'),
  ('p-ss-popup', 1, 40, '', 'walk'),
  ('p-ss-gallery', 2, 60, '', 'walk'),
  ('p-ss-forest', 3, 60, '해질녘 산책', 'walk')
) as v(place_id, position, stay_minutes, memo, transport_to_next);

-- 외국인 친구와 서울 첫날 (원래 author: 진)
with new_course as (
  insert into public.courses (title, description, cover_place_id, visibility, hidden, theme, saved, author_id)
  values ('외국인 친구와 서울 첫날', '경복궁부터 남산까지, 처음 서울에 온 친구에게 보여주기 좋은 코스.', 'p-gb-palace', 'public', false, '관광', true, '00000000-0000-0000-0000-000000000000'::uuid)
  returning id
)
insert into public.course_places (course_id, place_id, position, stay_minutes, memo, transport_to_next)
select id, v.place_id, v.position, v.stay_minutes, v.memo, v.transport_to_next from new_course, (values
  ('p-gb-palace', 0, 90, '', 'walk'),
  ('p-bc-hanok', 1, 60, '', 'walk'),
  ('p-sc-teahouse', 2, 50, '', 'transit'),
  ('p-ys-tower', 3, 90, '야경까지 보고 내려오기', 'car')
) as v(place_id, position, stay_minutes, memo, transport_to_next);

-- 을지로 야장 저녁 모임 (원래 author: 현)
with new_course as (
  insert into public.courses (title, description, cover_place_id, visibility, hidden, theme, saved, author_id)
  values ('을지로 야장 저녁 모임', '퇴근 후 만나서 노포 골목과 DDP 야경까지.', 'p-uj-bar', 'public', false, '친구 모임', true, '00000000-0000-0000-0000-000000000000'::uuid)
  returning id
)
insert into public.course_places (course_id, place_id, position, stay_minutes, memo, transport_to_next)
select id, v.place_id, v.position, v.stay_minutes, v.memo, v.transport_to_next from new_course, (values
  ('p-uj-coffee', 0, 40, '', 'walk'),
  ('p-uj-bar', 1, 100, '', 'walk'),
  ('p-dd-plaza', 2, 50, '', 'walk')
) as v(place_id, position, stay_minutes, memo, transport_to_next);

-- ============================================================
-- (선택) 데모용 저장 장소 시드 — user_id는 실제 auth.users.id로 바꿔서 사용하세요
-- ============================================================
insert into public.saved_places (user_id, place_id, memo) values
  ('00000000-0000-0000-0000-000000000000'::uuid, 'p-mw-bakery', '아침 일찍 가면 웨이팅 없대'),
  ('00000000-0000-0000-0000-000000000000'::uuid, 'p-gj-books', ''),
  ('00000000-0000-0000-0000-000000000000'::uuid, 'p-hg-park', '노을 시간대 추천'),
  ('00000000-0000-0000-0000-000000000000'::uuid, 'p-sd-cafe', ''),
  ('00000000-0000-0000-0000-000000000000'::uuid, 'p-ss-coffee', '다음 코스에 넣을 후보'),
  ('00000000-0000-0000-0000-000000000000'::uuid, 'p-hn-museum', '');
