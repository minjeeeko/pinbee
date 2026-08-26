export type Category = '카페' | '식당' | '전시' | '쇼핑' | '산책' | '관광' | '기타'

export type Transport = 'walk' | 'transit' | 'car'

export interface OpenHours {
  /** 분 단위 (0~1440). 없으면 영업시간 정보 없음 */
  open: number
  close: number
}

export interface Place {
  id: string
  name: string
  address: string
  region: string
  category: Category
  lat: number
  lng: number
  hours?: OpenHours
  desc?: string
  /** 저장한 사용자 수 (프로토타입 목데이터) */
  likeCount: number
  /** 상호명 검색(네이버 지역 검색) 결과의 원본 업종 문자열. 저장 전(아직 카테고리를 고르지 않은) 카드 표시용 */
  sourceCategory?: string
}

export interface CoursePlace {
  /** 코스 안에서 항목을 구분하는 고유 키 (같은 장소를 중복 추가할 수 있음) */
  uid: string
  placeId: string
  /** 예상 체류시간(분) */
  stayMinutes: number
  memo: string
  /** 이 장소 -> 다음 장소 구간의 이동수단 */
  transportToNext: Transport
}

export interface SavedPlace {
  placeId: string
  /** 저장 장소에 대한 개인 메모 */
  memo: string
}

export type Visibility = 'private' | 'public'

export interface Course {
  id: string
  title: string
  description: string
  coverPlaceId: string | null
  visibility: Visibility
  /** 관리자 숨김 처리 */
  hidden: boolean
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  places: CoursePlace[]
  authorId: string
  authorName: string
  shareToken: string
  createdAt: number
  updatedAt: number
  theme: string
  /** 코스 저장 시 사용자가 직접 고르는 대표 지역 (탐색 카드에 표시). 아직 안 골랐으면 null */
  region: string | null
  /** 저장(코스 저장) 완료 여부. 편집 중인 초안은 false */
  saved: boolean
}

export interface Preferences {
  transport: Transport | 'mixed'
  maxLegMinutes: number
  categories: Category[]
  pace: 'tight' | 'normal' | 'relaxed'
}

export interface Report {
  id: string
  courseId: string
  reporterId: string
  reason: string
  status: 'pending' | 'hidden' | 'deleted' | 'rejected'
  createdAt: number
  resolvedAt?: number
  resolverId?: string
}

export interface User {
  id: string
  name: string
  email: string
  provider: 'email'
  isAdmin?: boolean
  ageGroup: string | null
  avatarUrl: string | null
  referralSource: string | null
  expectedFeatures: string[]
}

export interface ImportCandidate {
  id: string
  raw: string
  status: 'matched' | 'ambiguous' | 'failed'
  placeId: string | null
  excluded: boolean
}

/** 계산된 구간 정보 */
export interface Leg {
  fromPlaceId: string
  toPlaceId: string
  transport: Transport
  minutes: number | null
  distanceKm: number
  error?: string
}

/** 계산된 일정 정보 */
export interface ScheduleItem {
  placeId: string
  arrive: number | null // 분 (0~)
  leave: number | null
  conflict: 'none' | 'before-open' | 'after-close' | 'unknown' | 'uncomputable'
  conflictText?: string
}
