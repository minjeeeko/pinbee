import type { Place } from '../lib/types'

const h = (o: string, c: string) => {
  const p = (s: string) => {
    const [hh, mm] = s.split(':').map(Number)
    return hh * 60 + mm
  }
  return { open: p(o), close: p(c) }
}

export const PLACES: Place[] = [
  // ── 마포 (연남 · 홍대 · 망원 · 합정)
  { id: 'p-yn-brunch', name: '연남동 브런치하우스', address: '서울 마포구 연남로 32', region: '마포', category: '식당', lat: 37.5619, lng: 126.9256, hours: h('10:00', '21:00'), desc: '연남동 골목 브런치 카페' , likeCount: 136 },
  { id: 'p-yn-roaster', name: '연남 로스터리 커피', address: '서울 마포구 성미산로 161', region: '마포', category: '카페', lat: 37.5641, lng: 126.9245, hours: h('09:00', '22:00'), desc: '직접 볶는 스페셜티 로스터리' , likeCount: 464 },
  { id: 'p-yn-gallery', name: '연남 사진 전시관', address: '서울 마포구 동교로 254', region: '마포', category: '전시', lat: 37.5602, lng: 126.9284, hours: h('11:00', '19:00'), desc: '소규모 사진 기획전' , likeCount: 208 },
  { id: 'p-hd-rooftop', name: '루프탑 카페 하늘', address: '서울 마포구 연남로 12', region: '마포', category: '카페', lat: 37.5567, lng: 126.9231, hours: h('12:00', '23:00'), desc: '홍대 뷰 루프탑' , likeCount: 470 },
  { id: 'p-hd-market', name: '동진시장 커피', address: '서울 마포구 성미산로 198', region: '마포', category: '카페', lat: 37.5657, lng: 126.9258, hours: h('11:00', '20:00') , likeCount: 220 },
  { id: 'p-mw-bakery', name: '망원 베이커리', address: '서울 마포구 포은로 88', region: '마포', category: '카페', lat: 37.5556, lng: 126.9059, hours: h('08:00', '20:00'), desc: '아침 일찍 여는 동네 빵집' , likeCount: 295 },
  { id: 'p-mw-market', name: '망원시장', address: '서울 마포구 포은로8길 14', region: '마포', category: '쇼핑', lat: 37.5561, lng: 126.9026, hours: h('09:00', '21:00') , likeCount: 201 },
  { id: 'p-gj-books', name: '경의선 책거리', address: '서울 마포구 와우산로 92', region: '마포', category: '관광', lat: 37.5556, lng: 126.9243, hours: h('10:00', '20:00') , likeCount: 361 },
  { id: 'p-hj-noodle', name: '합정 손칼국수', address: '서울 마포구 양화로 45', region: '마포', category: '식당', lat: 37.5495, lng: 126.9139, hours: h('11:00', '21:00') , likeCount: 115 },
  { id: 'p-hd-record', name: '홍대 레코드샵', address: '서울 마포구 와우산로 29', region: '마포', category: '쇼핑', lat: 37.5533, lng: 126.9245, hours: h('13:00', '22:00') , likeCount: 69 },

  // ── 용산 (한남 · 이태원 · 한강)
  { id: 'p-hg-park', name: '한강 나들목 산책로', address: '서울 용산구 이촌로 72', region: '용산', category: '산책', lat: 37.5177, lng: 126.9668, desc: '노을 보기 좋은 한강 산책 코스' , likeCount: 407 },
  { id: 'p-hn-museum', name: '한남 현대미술관', address: '서울 용산구 독서당로 60', region: '용산', category: '전시', lat: 37.5385, lng: 127.0011, hours: h('10:00', '18:00'), desc: '기획 전시 중심 미술관' , likeCount: 234 },
  { id: 'p-hn-cafe', name: '한남 언덕 카페', address: '서울 용산구 대사관로 31', region: '용산', category: '카페', lat: 37.5359, lng: 127.0032, hours: h('11:00', '22:00') , likeCount: 89 },
  { id: 'p-it-kebab', name: '이태원 케밥하우스', address: '서울 용산구 이태원로 165', region: '용산', category: '식당', lat: 37.5346, lng: 126.9946, hours: h('11:30', '23:00') , likeCount: 45 },
  { id: 'p-yc-sunset', name: '이촌 한강공원 노을 전망', address: '서울 용산구 이촌로72길', region: '용산', category: '산책', lat: 37.5171, lng: 126.9741 , likeCount: 202 },
  { id: 'p-ys-tower', name: '남산 서울타워', address: '서울 용산구 남산공원길 105', region: '용산', category: '관광', lat: 37.5512, lng: 126.9882, hours: h('10:00', '22:00') , likeCount: 461 },

  // ── 성동 (성수 · 서울숲)
  { id: 'p-ss-forest', name: '서울숲 산책길', address: '서울 성동구 뚝섬로 273', region: '성동', category: '산책', lat: 37.5443, lng: 127.0374 , likeCount: 70 },
  { id: 'p-ss-coffee', name: '성수 창고 카페', address: '서울 성동구 연무장길 45', region: '성동', category: '카페', lat: 37.5427, lng: 127.0554, hours: h('10:00', '21:00'), desc: '정미소를 개조한 대형 카페' , likeCount: 403 },
  { id: 'p-ss-popup', name: '성수 팝업 스토어', address: '서울 성동구 아차산로 104', region: '성동', category: '쇼핑', lat: 37.5449, lng: 127.0561, hours: h('12:00', '20:00') , likeCount: 386 },
  { id: 'p-ss-gallery', name: '성수 미디어 전시관', address: '서울 성동구 왕십리로 83', region: '성동', category: '전시', lat: 37.5471, lng: 127.0442, hours: h('11:00', '19:00') , likeCount: 357 },
  { id: 'p-ss-gogi', name: '성수 화로구이', address: '서울 성동구 연무장길 11', region: '성동', category: '식당', lat: 37.5411, lng: 127.0533, hours: h('16:00', '23:00'), desc: '저녁에만 여는 화로구이' , likeCount: 270 },

  // ── 종로 · 중구
  { id: 'p-bc-hanok', name: '북촌 한옥마을', address: '서울 종로구 계동길 37', region: '종로', category: '관광', lat: 37.5826, lng: 126.9850, hours: h('09:00', '18:00') , likeCount: 82 },
  { id: 'p-sc-teahouse', name: '삼청동 전통 찻집', address: '서울 종로구 삼청로 76', region: '종로', category: '카페', lat: 37.5843, lng: 126.9812, hours: h('10:00', '21:00') , likeCount: 335 },
  { id: 'p-gb-palace', name: '경복궁', address: '서울 종로구 사직로 161', region: '종로', category: '관광', lat: 37.5796, lng: 126.9770, hours: h('09:00', '17:00'), desc: '조선의 법궁, 야간 개장 시즌 별도' , likeCount: 341 },
  { id: 'p-ij-museum', name: '국립현대미술관 서울', address: '서울 종로구 삼청로 30', region: '종로', category: '전시', lat: 37.5787, lng: 126.9800, hours: h('10:00', '18:00') , likeCount: 389 },
  { id: 'p-uj-bar', name: '을지로 노포 골목', address: '서울 중구 을지로 157', region: '중구', category: '식당', lat: 37.5665, lng: 126.9915, hours: h('17:00', '24:00') , likeCount: 302 },
  { id: 'p-uj-coffee', name: '을지로 다방', address: '서울 중구 충무로 18', region: '중구', category: '카페', lat: 37.5641, lng: 126.9930, hours: h('09:00', '19:00') , likeCount: 338 },
  { id: 'p-dd-plaza', name: 'DDP 디자인플라자', address: '서울 중구 을지로 281', region: '중구', category: '전시', lat: 37.5665, lng: 127.0092, hours: h('10:00', '20:00') , likeCount: 228 },
  { id: 'p-mg-shop', name: '명동 쇼핑거리', address: '서울 중구 명동길 14', region: '중구', category: '쇼핑', lat: 37.5637, lng: 126.9829, hours: h('10:00', '22:00') , likeCount: 50 },
  { id: 'p-cg-stream', name: '청계천 산책로', address: '서울 중구 청계천로', region: '중구', category: '산책', lat: 37.5696, lng: 126.9784 , likeCount: 202 },

  // ── 강남 · 서초 · 송파
  { id: 'p-gn-dessert', name: '가로수길 디저트바', address: '서울 강남구 압구정로10길 25', region: '강남', category: '카페', lat: 37.5203, lng: 127.0227, hours: h('12:00', '23:00') , likeCount: 240 },
  { id: 'p-gn-omakase', name: '신사동 오마카세', address: '서울 강남구 도산대로 122', region: '강남', category: '식당', lat: 37.5223, lng: 127.0231, hours: h('18:00', '22:00'), desc: '예약제 · 2회차 운영' , likeCount: 88 },
  { id: 'p-cd-park', name: '코엑스 별마당 도서관', address: '서울 강남구 영동대로 513', region: '강남', category: '관광', lat: 37.5115, lng: 127.0595, hours: h('10:30', '22:00') , likeCount: 14 },
  { id: 'p-sc-arts', name: '예술의전당', address: '서울 서초구 남부순환로 2406', region: '서초', category: '전시', lat: 37.4794, lng: 127.0113, hours: h('10:00', '19:00') , likeCount: 77 },
  { id: 'p-js-lake', name: '석촌호수 산책로', address: '서울 송파구 잠실로 148', region: '송파', category: '산책', lat: 37.5090, lng: 127.1029 , likeCount: 485 },
  { id: 'p-js-mall', name: '잠실 롯데월드몰', address: '서울 송파구 올림픽로 300', region: '송파', category: '쇼핑', lat: 37.5125, lng: 127.1025, hours: h('10:30', '22:00') , likeCount: 65 },

  // ── 영등포 · 여의도 · 서대문
  { id: 'p-yd-park', name: '여의도 한강공원', address: '서울 영등포구 여의동로 330', region: '영등포', category: '산책', lat: 37.5285, lng: 126.9337 , likeCount: 279 },
  { id: 'p-yd-noodle', name: '여의도 콩국수', address: '서울 영등포구 국제금융로 10', region: '영등포', category: '식당', lat: 37.5254, lng: 126.9255, hours: h('11:00', '20:00') , likeCount: 46 },
  { id: 'p-sd-cafe', name: '연희동 정원 카페', address: '서울 서대문구 연희로 87', region: '서대문', category: '카페', lat: 37.5687, lng: 126.9312, hours: h('11:00', '22:00') , likeCount: 64 },
  { id: 'p-sd-hill', name: '안산 자락길', address: '서울 서대문구 봉원사길 75', region: '서대문', category: '산책', lat: 37.5745, lng: 126.9482 , likeCount: 176 },
]

export const PLACE_MAP: Record<string, Place> = Object.fromEntries(PLACES.map((p) => [p.id, p]))

export const CATEGORIES: Place['category'][] = ['카페', '식당', '전시', '쇼핑', '산책', '관광', '기타']

/** 코스 저장 시 사용자가 고르는 대표 지역 (탐색 카드·필터에 쓴다). 장소 데이터의 region과는 별개다 */
export const REGIONS = [
  '홍대', '신촌', '성수', '서촌', '북촌', '종로', '동대문', '남대문', '강남', '사당', '김포', '천호', '잠실', '그외',
]

/** 카테고리별 색상 (dataviz 스킬의 검증된 카테고리컬 팔레트 1~7번 슬롯, 순서 고정). 지도 핀·카테고리 태그가 함께 쓴다 */
export const CATEGORY_COLOR: Record<Place['category'], string> = {
  카페: '#2a78d6',
  식당: '#eb6834',
  전시: '#1baf7a',
  쇼핑: '#eda100',
  산책: '#e87ba4',
  관광: '#008300',
  기타: '#4a3aa7',
}

/**
 * 주소 검색(Geocoding)으로 새로 찾은 장소를 실행 중에 PLACE_MAP에 등록한다.
 * PLACE_MAP은 내장 40곳 조회에도 쓰이는 단일 참조 테이블이라, 여기에 더해두면
 * PLACE_MAP[id] 를 쓰는 기존 화면들이 전부 그대로 새 장소도 보여줄 수 있다.
 */
export function registerPlace(place: Place) {
  PLACE_MAP[place.id] = place
}
