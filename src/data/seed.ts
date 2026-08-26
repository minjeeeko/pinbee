import type { Preferences } from '../lib/types'

export const DEFAULT_PREFS: Preferences = {
  transport: 'mixed',
  maxLegMinutes: 30,
  categories: [],
  pace: 'normal',
}

export const THEMES = ['데이트', '여행', '친구 모임', '카페 투어', '관광', '혼자']

export const AGE_GROUPS = ['10대', '20대', '30대', '40대', '50대 이상'] as const
export const REFERRAL_SOURCES = ['검색(구글/네이버 등)', '지인 추천', 'SNS', '광고', '기타'] as const
export const EXPECTED_FEATURES = [
  '장소 저장 · 메모',
  '친구와 코스 공유',
  '동선 확인',
  '다른 사람 코스 둘러보기',
] as const
