import type { CoursePlace, Leg, Transport } from './types'
import { PLACE_MAP } from '../data/places'
import { getCachedDrivingLeg } from './directions'

const R = 6371 // km

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const la1 = toRad(a.lat)
  const la2 = toRad(b.lat)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)))
}

/** 직선거리에 도로 우회 계수를 적용한 실제 이동거리 근사 */
const DETOUR = 1.3

export const TRANSPORT_LABEL: Record<Transport, string> = {
  walk: '도보',
  transit: '대중교통',
  car: '자동차',
}

/** 도보로 이 거리를 넘어서면 경로 계산 불가로 간주 */
export const WALK_LIMIT_KM = 5

export function legMinutes(distanceKm: number, transport: Transport): number | null {
  const d = distanceKm * DETOUR
  if (transport === 'walk') {
    if (distanceKm > WALK_LIMIT_KM) return null
    return Math.max(1, Math.round((d / 4.5) * 60))
  }
  if (transport === 'transit') {
    return Math.max(6, Math.round(6 + (d / 21) * 60))
  }
  return Math.max(4, Math.round(4 + (d / 24) * 60))
}

/**
 * 코스 장소 목록으로 구간 정보를 계산한다.
 * opts.realDriving이 켜져 있으면 자동차 구간은 실제 도로 기준 거리·시간(캐시에 있을 때만, Supabase Edge
 * Function 프록시로 백그라운드 조회)을 쓰고, 없으면 직선거리 근사로 대체한다. 도보·대중교통은 NCP Maps에
 * 대응하는 API가 없어 항상 직선거리 근사를 쓴다. 탐색·공개 코스 목록처럼 여러 코스를 한 번에 보여주는
 * 화면에서는 realDriving을 켜지 않는다 — API 호출이 코스 수만큼 늘어나는 걸 막기 위해서다.
 */
export function computeLegs(places: CoursePlace[], opts?: { realDriving?: boolean }): Leg[] {
  const legs: Leg[] = []
  for (let i = 0; i < places.length - 1; i++) {
    const from = PLACE_MAP[places[i].placeId]
    const to = PLACE_MAP[places[i + 1].placeId]
    if (!from || !to) continue
    const transport = places[i].transportToNext
    const straightKm = haversineKm(from, to)
    const real = opts?.realDriving && transport === 'car' ? getCachedDrivingLeg(from, to) : null
    const distanceKm = real ? real.distanceKm : straightKm
    const minutes = real ? real.minutes : legMinutes(straightKm, transport)
    legs.push({
      fromPlaceId: from.id,
      toPlaceId: to.id,
      transport,
      minutes,
      distanceKm,
      error:
        minutes === null
          ? `${straightKm.toFixed(1)}km는 도보 경로를 계산할 수 없어요. 대중교통이나 자동차로 바꿔보세요.`
          : undefined,
    })
  }
  return legs
}

export function totalTravelMinutes(legs: Leg[]) {
  return legs.reduce((sum, l) => sum + (l.minutes ?? 0), 0)
}

export function totalDistanceKm(legs: Leg[]) {
  return legs.reduce((sum, l) => sum + l.distanceKm, 0)
}

/** 이동수단 자동 추천: 거리 기반 */
export function suggestTransport(distanceKm: number): Transport {
  if (distanceKm <= 1.2) return 'walk'
  if (distanceKm <= 12) return 'transit'
  return 'car'
}
