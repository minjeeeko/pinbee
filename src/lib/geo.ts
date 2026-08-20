import type { CoursePlace, Leg, Transport } from './types'
import { PLACE_MAP } from '../data/places'

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

/** 코스 장소 목록으로 구간 정보를 계산한다 */
export function computeLegs(places: CoursePlace[]): Leg[] {
  const legs: Leg[] = []
  for (let i = 0; i < places.length - 1; i++) {
    const from = PLACE_MAP[places[i].placeId]
    const to = PLACE_MAP[places[i + 1].placeId]
    if (!from || !to) continue
    const transport = places[i].transportToNext
    const distanceKm = haversineKm(from, to)
    const minutes = legMinutes(distanceKm, transport)
    legs.push({
      fromPlaceId: from.id,
      toPlaceId: to.id,
      transport,
      minutes,
      distanceKm,
      error:
        minutes === null
          ? `${distanceKm.toFixed(1)}km는 도보 경로를 계산할 수 없어요. 대중교통이나 자동차로 바꿔보세요.`
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

// ─────────────────────────────────────────── 지도 투영

export interface Projection {
  toXY: (p: { lat: number; lng: number }) => { x: number; y: number }
}

function mercY(lat: number) {
  const r = (lat * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + r / 2))
}

export function fitProjection(
  points: { lat: number; lng: number }[],
  width: number,
  height: number,
  padding = 56,
  inset: { top?: number; bottom?: number } = {},
): Projection {
  const top = inset.top ?? 0
  const bottom = inset.bottom ?? 0
  // 시트·카드에 가리지 않는 영역 안에 동선이 들어오도록 맞춘다
  const viewTop = top
  const viewBottom = Math.max(top + 80, height - bottom)
  const viewH = viewBottom - viewTop
  const centerY = (viewTop + viewBottom) / 2
  if (points.length === 0) {
    return { toXY: () => ({ x: width / 2, y: centerY }) }
  }
  const xs = points.map((p) => p.lng)
  const ys = points.map((p) => mercY(p.lat))
  let minX = Math.min(...xs)
  let maxX = Math.max(...xs)
  let minY = Math.min(...ys)
  let maxY = Math.max(...ys)

  // 점이 하나이거나 매우 가까울 때 최소 범위 확보
  const MIN_SPAN_X = 0.004
  const MIN_SPAN_Y = 0.00005
  if (maxX - minX < MIN_SPAN_X) {
    const c = (maxX + minX) / 2
    minX = c - MIN_SPAN_X / 2
    maxX = c + MIN_SPAN_X / 2
  }
  if (maxY - minY < MIN_SPAN_Y) {
    const c = (maxY + minY) / 2
    minY = c - MIN_SPAN_Y / 2
    maxY = c + MIN_SPAN_Y / 2
  }

  const w = Math.max(40, width - padding * 2)
  const hgt = Math.max(40, viewH - padding * 2)
  const scale = Math.min(w / (maxX - minX), hgt / (maxY - minY))
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  return {
    toXY: (p) => ({
      x: width / 2 + (p.lng - cx) * scale,
      y: centerY - (mercY(p.lat) - cy) * scale,
    }),
  }
}

/** 지도 위 두 점을 잇는 부드러운 곡선 경로 */
export function curvePath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    // 구간마다 방향을 번갈아 휘어 로우파이 시안의 곡선 동선을 재현
    const bend = Math.min(48, len * 0.22) * (i % 2 === 0 ? 1 : -1)
    const nx = (-dy / len) * bend
    const ny = (dx / len) * bend
    d += ` Q ${mx + nx} ${my + ny} ${b.x} ${b.y}`
  }
  return d
}
