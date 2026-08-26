import { supabase, isSupabaseConfigured } from './supabase'
import { extractRegion } from './geocode'
import type { Place } from './types'

const CATEGORY_KEYWORDS: [RegExp, Place['category']][] = [
  [/카페|커피|디저트|베이커리|제과/, '카페'],
  [/음식점|식당|레스토랑|고기|국밥|분식|중식|일식|양식|주점|술집/, '식당'],
  [/전시|미술관|박물관|갤러리/, '전시'],
  [/쇼핑|마트|백화점|시장|상점|편의점/, '쇼핑'],
  [/공원|산책|둘레길|트레킹|하천/, '산책'],
  [/관광|명소|고궁|유적|전망대/, '관광'],
]

function guessCategory(naverCategory: string): Place['category'] {
  for (const [re, cat] of CATEGORY_KEYWORDS) {
    if (re.test(naverCategory)) return cat
  }
  return '기타'
}

/**
 * 상호명(또는 주소)으로 실제 장소를 찾는다. 네이버 지역 검색 API는 REST 전용이라 Client Secret이
 * 필요해서, Supabase Edge Function(`local-search`)이 대신 호출한다 — geocodeAddress와 달리
 * 브라우저에서 직접 부를 수 없다. 좌표 기반 id(`p-geo-{lat}-{lng}`)를 써서 geocodeAddress 결과와
 * 같은 방식으로 코스·저장 장소에 등록된다.
 */
export async function searchLocalPlaces(query: string): Promise<Place[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.functions.invoke('local-search', { body: { query } })
  if (error || !Array.isArray(data?.items)) return []
  return data.items.map(
    (item: { name: string; address: string; roadAddress: string; category: string; lat: number; lng: number }): Place => {
      const address = item.roadAddress || item.address
      return {
        id: `p-geo-${item.lat.toFixed(6)}-${item.lng.toFixed(6)}`,
        name: item.name || address,
        address,
        region: extractRegion(address),
        category: guessCategory(item.category),
        lat: item.lat,
        lng: item.lng,
        likeCount: 0,
      }
    },
  )
}
