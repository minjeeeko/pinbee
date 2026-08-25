import { supabase, isSupabaseConfigured } from './supabase'

export interface DrivingLeg {
  distanceKm: number
  minutes: number
}

type Listener = () => void
const listeners = new Set<Listener>()

/** 실제 자동차 경로(캐시)가 갱신될 때마다 알림을 받는다 — 렌더 중 계산은 동기라서 갱신 후 재렌더를 유도하는 용도 */
export function onDirectionsUpdate(cb: Listener) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function notify() {
  listeners.forEach((fn) => fn())
}

const cache = new Map<string, DrivingLeg>()
const pending = new Set<string>()

function legKey(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return `${a.lat.toFixed(5)},${a.lng.toFixed(5)}->${b.lat.toFixed(5)},${b.lng.toFixed(5)}`
}

/**
 * 캐시에 실제 자동차 경로가 있으면 바로 돌려주고, 없으면 백그라운드로 조회만 걸어둔다.
 * 동기 함수라 computeLegs 안(렌더 중)에서 안전하게 부를 수 있다 — 결과가 오면 onDirectionsUpdate로 알려서
 * 화면을 다시 그리게 한다. (주소 검색 결과를 렌더 중에 PLACE_MAP에 등록하는 것과 같은 패턴)
 */
export function getCachedDrivingLeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): DrivingLeg | null {
  const key = legKey(a, b)
  const hit = cache.get(key)
  if (hit) return hit
  requestDrivingLeg(a, b, key)
  return null
}

/**
 * NCP Directions 5(자동차 길찾기) API는 REST 전용이라 Client Secret이 필요하고, 브라우저에서 직접 부르면
 * Secret이 그대로 노출된다. 그래서 Supabase Edge Function(`directions`)이 대신 호출하고, Secret은
 * 그 함수의 서버 환경변수에만 있다. 여기서는 그 함수를 익명 호출만 한다.
 */
function requestDrivingLeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }, key: string) {
  if (!isSupabaseConfigured || pending.has(key)) return
  pending.add(key)
  supabase.functions
    .invoke('directions', { body: { start: a, goal: b } })
    .then(({ data, error }: { data: any; error: any }) => {
      pending.delete(key)
      if (error || !data || typeof data.distanceMeters !== 'number' || typeof data.durationMs !== 'number') return
      cache.set(key, { distanceKm: data.distanceMeters / 1000, minutes: Math.max(1, Math.round(data.durationMs / 60000)) })
      notify()
    })
    .catch(() => pending.delete(key))
}
