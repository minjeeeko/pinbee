import type { Course, CoursePlace, Preferences } from '../lib/types'

let seq = 0

const cp = (placeId: string, stayMinutes: number, transportToNext: CoursePlace['transportToNext'], memo = ''): CoursePlace => ({
  uid: `cp-${placeId}-${(seq += 1)}`,
  placeId,
  stayMinutes,
  memo,
  transportToNext,
})

const DAY = '2026-08-23'

export const SEED_COURSES: Course[] = [
  {
    id: 'c-seed-1',
    title: '연남 → 한강 노을 코스',
    description: '브런치부터 노을 산책까지 이어지는 동선. 이동은 도보와 대중교통을 섞었어요.',
    coverPlaceId: 'p-yn-brunch',
    visibility: 'public',
    hidden: false,
    date: DAY,
    startTime: '11:00',
    places: [
      cp('p-yn-brunch', 60, 'walk', '오픈 시간 맞춰 가면 웨이팅 없음'),
      cp('p-yn-gallery', 50, 'transit'),
      cp('p-hg-park', 80, 'walk', '노을 시간대 추천'),
    ],
    authorId: 'u-coco',
    authorName: '코코',
    shareToken: 'sh9f2a',
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 6,
    saved: true,
    theme: '데이트',
  },
  {
    id: 'c-seed-2',
    title: '성수 카페 투어 하루',
    description: '창고형 카페와 팝업 스토어 위주로 도보 이동만으로 구성했어요.',
    coverPlaceId: 'p-ss-coffee',
    visibility: 'public',
    hidden: false,
    date: DAY,
    startTime: '12:00',
    places: [
      cp('p-ss-coffee', 70, 'walk'),
      cp('p-ss-popup', 40, 'walk'),
      cp('p-ss-gallery', 60, 'walk'),
      cp('p-ss-forest', 60, 'walk', '해질녘 산책'),
    ],
    authorId: 'u-bean',
    authorName: '빈',
    shareToken: 'sh4c1b',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
    saved: true,
    theme: '카페 투어',
  },
  {
    id: 'c-seed-3',
    title: '외국인 친구와 서울 첫날',
    description: '경복궁부터 남산까지, 처음 서울에 온 친구에게 보여주기 좋은 코스.',
    coverPlaceId: 'p-gb-palace',
    visibility: 'public',
    hidden: false,
    date: DAY,
    startTime: '10:00',
    places: [
      cp('p-gb-palace', 90, 'walk'),
      cp('p-bc-hanok', 60, 'walk'),
      cp('p-sc-teahouse', 50, 'transit'),
      cp('p-ys-tower', 90, 'car', '야경까지 보고 내려오기'),
    ],
    authorId: 'u-jin',
    authorName: '진',
    shareToken: 'sh71d0',
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 9,
    saved: true,
    theme: '관광',
  },
  {
    id: 'c-seed-4',
    title: '을지로 야장 저녁 모임',
    description: '퇴근 후 만나서 노포 골목과 DDP 야경까지.',
    coverPlaceId: 'p-uj-bar',
    visibility: 'public',
    hidden: false,
    date: DAY,
    startTime: '18:00',
    places: [cp('p-uj-coffee', 40, 'walk'), cp('p-uj-bar', 100, 'walk'), cp('p-dd-plaza', 50, 'walk')],
    authorId: 'u-hyun',
    authorName: '현',
    shareToken: 'sh22e7',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    saved: true,
    theme: '친구 모임',
  },
]

export const SEED_SAVED_PLACE_IDS = [
  'p-mw-bakery',
  'p-gj-books',
  'p-hg-park',
  'p-sd-cafe',
  'p-ss-coffee',
  'p-hn-museum',
]

export const DEFAULT_PREFS: Preferences = {
  transport: 'mixed',
  maxLegMinutes: 30,
  categories: [],
  pace: 'normal',
}

export const THEMES = ['데이트', '여행', '친구 모임', '카페 투어', '관광', '혼자']
