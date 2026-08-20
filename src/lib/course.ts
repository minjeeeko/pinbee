import type { Course, Transport } from './types'
import { computeLegs, totalTravelMinutes } from './geo'
import { computeSchedule, parseTime, totalStayMinutes } from './schedule'
import { PLACE_MAP } from '../data/places'

export function courseStats(course: Course) {
  const legs = computeLegs(course.places)
  const schedule = computeSchedule(course, legs)
  const travel = totalTravelMinutes(legs)
  const stay = totalStayMinutes(course.places)
  const places = course.places.map((cp) => PLACE_MAP[cp.placeId]).filter(Boolean)
  const regions = Array.from(new Set(places.map((p) => p.region)))
  const transports = Array.from(
    new Set(course.places.slice(0, -1).map((p) => p.transportToNext)),
  ) as Transport[]
  const last = schedule[schedule.length - 1]
  const endMinutes = last?.leave ?? null
  const conflicts = schedule.filter((s) => s.conflict === 'before-open' || s.conflict === 'after-close')
  const uncomputable = legs.filter((l) => l.minutes === null)
  return {
    legs,
    schedule,
    travel,
    stay,
    total: travel + stay,
    places,
    regions,
    transports,
    endMinutes,
    startMinutes: parseTime(course.startTime),
    conflicts,
    uncomputable,
  }
}

export function courseHasPlace(course: Course, placeId: string) {
  return course.places.some((p) => p.placeId === placeId)
}
