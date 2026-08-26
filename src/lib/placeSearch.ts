import { PLACES } from '../data/places'
import { similarity } from './importParse'
import { geocodeAddress, geocodeResultToPlace } from './geocode'
import { searchLocalPlaces } from './localSearch'
import type { Place } from './types'

/** 내장 40곳에서 이름·지역·주소·카테고리로 유사도 검색한다 */
export function searchBuiltinPlaces(query: string, limit = 30): Place[] {
  const q = query.trim()
  if (!q) return []
  return PLACES.map((p) => {
    const hay = `${p.name} ${p.region} ${p.address} ${p.category}`
    const contains = hay.includes(q)
    const score = contains ? 1 : Math.max(similarity(q, p.name), similarity(q, p.region))
    return { p, score }
  })
    .filter((r) => r.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.p)
}

/**
 * 상호명·주소 검색어로 실제 장소를 찾는다. 내장 40곳 + 네이버 지역 검색(상호명) +
 * NCP 지오코딩(주소) 결과를 합쳐서 돌려준다 — 붙여넣은 텍스트나 이미지에서 인식한
 * 한 줄 한 줄을 검색해 후보 목록을 보여주는 이미지 붙여넣기 흐름이 이 함수를 쓴다.
 */
export async function searchPlacesByQuery(query: string, limit = 6): Promise<Place[]> {
  const q = query.trim()
  if (!q) return []
  const builtin = searchBuiltinPlaces(q, limit)
  const [local, geocoded] = await Promise.all([
    searchLocalPlaces(q).catch(() => [] as Place[]),
    geocodeAddress(q)
      .then((found) => found.slice(0, 5).map((r) => geocodeResultToPlace(r, q)))
      .catch(() => [] as Place[]),
  ])
  const merged = [...builtin]
  const seen = new Set(merged.map((p) => p.id))
  for (const p of [...local, ...geocoded]) {
    const isDup =
      seen.has(p.id) || merged.some((m) => Math.abs(m.lat - p.lat) < 0.0001 && Math.abs(m.lng - p.lng) < 0.0001)
    if (!isDup) {
      merged.push(p)
      seen.add(p.id)
    }
  }
  return merged.slice(0, limit)
}
