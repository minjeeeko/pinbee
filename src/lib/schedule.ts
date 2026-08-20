import type { Course, CoursePlace, Leg, Preferences, ScheduleItem, Transport } from './types'
import { PLACE_MAP } from '../data/places'
import { haversineKm, legMinutes, suggestTransport } from './geo'

export function parseTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function fmtTime(min: number | null) {
  if (min === null) return '--:--'
  const wrapped = ((min % 1440) + 1440) % 1440
  const h = Math.floor(wrapped / 60)
  const m = Math.round(wrapped % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function fmtDuration(min: number) {
  if (min < 60) return `${min}분`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

/** 출발 시각부터 이동/체류 시간을 누적해 장소별 예상 시각을 계산한다 */
export function computeSchedule(course: Course, legs: Leg[]): ScheduleItem[] {
  const start = parseTime(course.startTime)
  const items: ScheduleItem[] = []
  let cursor: number | null = start

  course.places.forEach((cp, i) => {
    const place = PLACE_MAP[cp.placeId]
    const arrive = cursor
    const leave = arrive === null ? null : arrive + cp.stayMinutes

    let conflict: ScheduleItem['conflict'] = 'none'
    let conflictText: string | undefined

    if (arrive === null) {
      conflict = 'uncomputable'
      conflictText = '앞 구간의 이동시간을 계산할 수 없어 예상 시각을 알 수 없어요.'
    } else if (!place?.hours) {
      conflict = 'unknown'
      conflictText = '영업시간 정보가 없어 방문 가능 여부를 확인할 수 없어요.'
    } else if (arrive < place.hours.open) {
      conflict = 'before-open'
      conflictText = `${fmtTime(place.hours.open)} 오픈 · 도착 예정 ${fmtTime(arrive)}, ${fmtDuration(
        place.hours.open - arrive,
      )} 일찍 도착해요.`
    } else if (leave !== null && leave > place.hours.close) {
      conflict = 'after-close'
      conflictText = `${fmtTime(place.hours.close)} 마감 · 종료 예정 ${fmtTime(leave)}, ${fmtDuration(
        leave - place.hours.close,
      )} 초과해요.`
    }

    items.push({ placeId: cp.placeId, arrive, leave, conflict, conflictText })

    const leg = legs[i]
    if (leave === null) cursor = null
    else if (!leg) cursor = leave
    else cursor = leg.minutes === null ? null : leave + leg.minutes
  })

  return items
}

export function totalStayMinutes(places: CoursePlace[]) {
  return places.reduce((s, p) => s + p.stayMinutes, 0)
}

/** 하루 일정 한계 (분) — 출발 시각 기준 12시간 */
export const DAY_LIMIT = 12 * 60

export interface PreferenceIssue {
  kind: 'leg' | 'place' | 'day'
  index: number
  text: string
}

/** 선호 조건과 현재 코스를 비교해 위반 항목을 찾는다 */
export function findIssues(course: Course, legs: Leg[], prefs: Preferences): PreferenceIssue[] {
  const issues: PreferenceIssue[] = []

  legs.forEach((leg, i) => {
    if (leg.minutes === null) {
      issues.push({ kind: 'leg', index: i, text: leg.error ?? '경로를 계산할 수 없는 구간이에요.' })
      return
    }
    if (prefs.transport !== 'mixed' && leg.transport !== prefs.transport) {
      issues.push({
        kind: 'leg',
        index: i,
        text: `${i + 1}→${i + 2}구간이 선호 이동수단과 달라요.`,
      })
    }
  })

  if (prefs.categories.length > 0) {
    course.places.forEach((cp, i) => {
      const p = PLACE_MAP[cp.placeId]
      if (p && !prefs.categories.includes(p.category)) {
        issues.push({ kind: 'place', index: i, text: `${p.name}은(는) 선호 장소 유형에 없어요.` })
      }
    })
  }

  return issues
}

/**
 * 이동시간이 짧아지는 대안 순서를 제안한다(최근접 이웃 + 2-opt 개선).
 * 첫 장소는 고정하고, 구간마다 거리에 맞는 이동수단도 함께 제안한다.
 * preferred가 지정되면 모든 구간에 해당 이동수단을 적용한 기준으로 계산한다.
 */
export function suggestOrder(
  places: CoursePlace[],
  preferred: Transport | 'mixed' = 'mixed',
): CoursePlace[] {
  if (places.length < 3) return places
  const coords = places.map((cp) => PLACE_MAP[cp.placeId])
  const n = places.length

  const modeFor = (distanceKm: number): Transport =>
    preferred === 'mixed' ? suggestTransport(distanceKm) : preferred

  /** 두 장소 사이의 예상 이동시간(분). 계산 불가 구간은 큰 값으로 처리한다 */
  const cost = (a: number, b: number) => {
    if (!coords[a] || !coords[b]) return 0
    const d = haversineKm(coords[a], coords[b])
    return legMinutes(d, modeFor(d)) ?? 600
  }

  const visited = new Set<number>([0])
  const order = [0]
  while (order.length < n) {
    const cur = order[order.length - 1]
    let best = -1
    let bestCost = Infinity
    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue
      const c = cost(cur, i)
      if (c < bestCost) {
        bestCost = c
        best = i
      }
    }
    if (best < 0) break
    visited.add(best)
    order.push(best)
  }

  const pathCost = (o: number[]) => o.slice(0, -1).reduce((s, v, i) => s + cost(v, o[i + 1]), 0)
  let improved = true
  let guard = 0
  while (improved && guard++ < 40) {
    improved = false
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const next = order.slice(0, i).concat(order.slice(i, j + 1).reverse(), order.slice(j + 1))
        if (pathCost(next) < pathCost(order) - 1e-9) {
          order.splice(0, n, ...next)
          improved = true
        }
      }
    }
  }

  const reordered = order.map((i) => places[i])
  // 재배치한 순서의 구간 거리에 맞춰 이동수단을 함께 제안
  return reordered.map((cp, i) => {
    if (i === reordered.length - 1) return cp
    const a = PLACE_MAP[cp.placeId]
    const b = PLACE_MAP[reordered[i + 1].placeId]
    if (!a || !b) return cp
    const mode = modeFor(haversineKm(a, b))
    return mode === cp.transportToNext ? cp : { ...cp, transportToNext: mode }
  })
}
