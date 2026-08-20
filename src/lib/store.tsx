import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Course, CoursePlace, Preferences, Report, SavedPlace, Transport, User, Visibility } from './types'
import { DEFAULT_PREFS, SEED_COURSES, SEED_SAVED_PLACES } from '../data/seed'
import { PLACE_MAP } from '../data/places'
import { haversineKm, suggestTransport } from './geo'

const KEY = 'pinbee.state.v1'

interface Toast {
  id: number
  text: string
}

interface PersistState {
  user: User | null
  courses: Course[]
  savedPlaces: SavedPlace[]
  reports: Report[]
  prefs: Preferences
  draftId: string | null
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`
}

export function newCourse(authorId: string, authorName: string): Course {
  return {
    id: uid('c'),
    title: '',
    description: '',
    coverPlaceId: null,
    visibility: 'private',
    hidden: false,
    date: todayISO(),
    startTime: '11:00',
    places: [],
    authorId,
    authorName,
    shareToken: Math.random().toString(36).slice(2, 8),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    theme: '데이트',
    saved: false,
  }
}

/** 이전 버전 localStorage(예: savedPlaceIds: string[])를 현재 스키마로 안전하게 보정한다 */
function normalizePersisted(parsed: any): PersistState | null {
  if (!parsed || !Array.isArray(parsed.courses)) return null

  let savedPlaces: SavedPlace[]
  if (Array.isArray(parsed.savedPlaces)) {
    savedPlaces = parsed.savedPlaces
  } else if (Array.isArray(parsed.savedPlaceIds)) {
    // 이전 스키마: 장소 id만 담긴 배열
    savedPlaces = parsed.savedPlaceIds.map((placeId: string) => ({ placeId, memo: '' }))
  } else {
    savedPlaces = []
  }

  return {
    user: parsed.user ?? null,
    courses: parsed.courses.map((c: Partial<Course>) => ({ ...c, saved: c.saved ?? false }) as Course),
    savedPlaces,
    reports: Array.isArray(parsed.reports) ? parsed.reports : [],
    prefs: parsed.prefs ?? DEFAULT_PREFS,
    draftId: parsed.draftId ?? null,
  }
}

function initialState(): PersistState {
  const raw = localStorage.getItem(KEY)
  if (raw) {
    try {
      const normalized = normalizePersisted(JSON.parse(raw))
      if (normalized) return normalized
    } catch {
      /* 손상된 저장 데이터는 초기값으로 대체 */
    }
  }
  const draft = newCourse('u-me', '나')
  draft.title = '연남 → 한강 데이트'
  draft.theme = '데이트'
  draft.startTime = '11:00'
  draft.places = [
    { uid: uid('cp'), placeId: 'p-yn-brunch', stayMinutes: 60, memo: '', transportToNext: 'walk' },
    { uid: uid('cp'), placeId: 'p-yn-gallery', stayMinutes: 50, memo: '', transportToNext: 'transit' },
    { uid: uid('cp'), placeId: 'p-hd-rooftop', stayMinutes: 60, memo: '', transportToNext: 'walk' },
  ]
  return {
    user: null,
    courses: [...SEED_COURSES, draft],
    savedPlaces: SEED_SAVED_PLACES,
    reports: [],
    prefs: DEFAULT_PREFS,
    draftId: draft.id,
  }
}

interface StoreValue extends PersistState {
  toasts: Toast[]
  toast: (text: string) => void
  login: (u: Omit<User, 'id'> & { id?: string }) => void
  logout: () => void
  myCourses: Course[]
  publicCourses: Course[]
  draft: Course | null
  setDraftId: (id: string | null) => void
  startNewCourse: () => string
  getCourse: (id: string) => Course | undefined
  getCourseByToken: (token: string) => Course | undefined
  updateCourse: (id: string, patch: Partial<Course>) => void
  deleteCourse: (id: string) => void
  addPlaceToCourse: (courseId: string, placeId: string) => void
  removePlaceFromCourse: (courseId: string, uid: string) => void
  updateCoursePlace: (courseId: string, uid: string, patch: Partial<CoursePlace>) => void
  reorderCourse: (courseId: string, places: CoursePlace[]) => void
  setLegTransport: (courseId: string, index: number, t: Transport) => void
  setVisibility: (courseId: string, v: Visibility) => void
  toggleSavedPlace: (placeId: string) => void
  setSavedPlaceMemo: (placeId: string, memo: string) => void
  setPrefs: (p: Preferences) => void
  addReport: (courseId: string, reason: string) => 'created' | 'duplicate'
  resolveReport: (reportId: string, status: Report['status']) => void
}

const Ctx = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistState>(initialState)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400)
  }, [])

  const patchCourse = useCallback((id: string, fn: (c: Course) => Course) => {
    setState((s) => ({
      ...s,
      courses: s.courses.map((c) => (c.id === id ? { ...fn(c), updatedAt: Date.now() } : c)),
    }))
  }, [])

  const value = useMemo<StoreValue>(() => {
    const myId = state.user?.id ?? 'u-me'
    return {
      ...state,
      toasts,
      toast,
      login: (u) =>
        setState((s) => ({
          ...s,
          user: { id: u.id ?? 'u-me', name: u.name, email: u.email, provider: u.provider, isAdmin: u.isAdmin },
        })),
      logout: () => setState((s) => ({ ...s, user: null })),
      myCourses: state.courses.filter((c) => c.authorId === myId),
      publicCourses: state.courses.filter((c) => c.visibility === 'public' && !c.hidden),
      draft: state.courses.find((c) => c.id === state.draftId) ?? null,
      setDraftId: (id) => setState((s) => ({ ...s, draftId: id })),
      startNewCourse: () => {
        const c = newCourse(myId, state.user?.name ?? '나')
        setState((s) => ({ ...s, courses: [...s.courses, c], draftId: c.id }))
        return c.id
      },
      getCourse: (id) => state.courses.find((c) => c.id === id),
      getCourseByToken: (token) => state.courses.find((c) => c.shareToken === token),
      updateCourse: (id, patch) => patchCourse(id, (c) => ({ ...c, ...patch })),
      deleteCourse: (id) =>
        setState((s) => ({
          ...s,
          courses: s.courses.filter((c) => c.id !== id),
          draftId: s.draftId === id ? null : s.draftId,
        })),
      addPlaceToCourse: (courseId, placeId) =>
        patchCourse(courseId, (c) => {
          const prev = c.places[c.places.length - 1]
          const next: CoursePlace = {
            uid: uid('cp'),
            placeId,
            stayMinutes: 60,
            memo: '',
            transportToNext: 'walk',
          }
          const places = [...c.places, next]
          if (prev) {
            const a = PLACE_MAP[prev.placeId]
            const b = PLACE_MAP[placeId]
            if (a && b) {
              places[places.length - 2] = {
                ...prev,
                transportToNext: suggestTransport(haversineKm(a, b)),
              }
            }
          }
          return { ...c, places }
        }),
      removePlaceFromCourse: (courseId, cpUid) =>
        patchCourse(courseId, (c) => {
          const removed = c.places.find((p) => p.uid === cpUid)
          const places = c.places.filter((p) => p.uid !== cpUid)
          const stillUsed = removed ? places.some((p) => p.placeId === removed.placeId) : true
          return {
            ...c,
            places,
            coverPlaceId:
              removed && c.coverPlaceId === removed.placeId && !stillUsed ? null : c.coverPlaceId,
          }
        }),
      updateCoursePlace: (courseId, cpUid, patch) =>
        patchCourse(courseId, (c) => ({
          ...c,
          places: c.places.map((p) => (p.uid === cpUid ? { ...p, ...patch } : p)),
        })),
      reorderCourse: (courseId, places) => patchCourse(courseId, (c) => ({ ...c, places })),
      setLegTransport: (courseId, index, t) =>
        patchCourse(courseId, (c) => ({
          ...c,
          places: c.places.map((p, i) => (i === index ? { ...p, transportToNext: t } : p)),
        })),
      setVisibility: (courseId, v) => patchCourse(courseId, (c) => ({ ...c, visibility: v })),
      toggleSavedPlace: (placeId) =>
        setState((s) => ({
          ...s,
          savedPlaces: s.savedPlaces.some((sp) => sp.placeId === placeId)
            ? s.savedPlaces.filter((sp) => sp.placeId !== placeId)
            : [...s.savedPlaces, { placeId, memo: '' }],
        })),
      setSavedPlaceMemo: (placeId, memo) =>
        setState((s) => ({
          ...s,
          savedPlaces: s.savedPlaces.map((sp) => (sp.placeId === placeId ? { ...sp, memo } : sp)),
        })),
      setPrefs: (p) => setState((s) => ({ ...s, prefs: p })),
      addReport: (courseId, reason) => {
        const existing = state.reports.find(
          (r) => r.courseId === courseId && r.reporterId === myId && r.status === 'pending',
        )
        if (existing) return 'duplicate'
        const report: Report = {
          id: uid('r'),
          courseId,
          reporterId: myId,
          reason,
          status: 'pending',
          createdAt: Date.now(),
        }
        setState((s) => ({ ...s, reports: [report, ...s.reports] }))
        return 'created'
      },
      resolveReport: (reportId, status) =>
        setState((s) => {
          const report = s.reports.find((r) => r.id === reportId)
          if (!report) return s
          let courses = s.courses
          if (status === 'hidden') {
            courses = courses.map((c) => (c.id === report.courseId ? { ...c, hidden: true } : c))
          } else if (status === 'deleted') {
            courses = courses.filter((c) => c.id !== report.courseId)
          } else if (status === 'rejected') {
            courses = courses.map((c) => (c.id === report.courseId ? { ...c, hidden: false } : c))
          }
          return {
            ...s,
            courses,
            reports: s.reports.map((r) =>
              r.id === reportId ? { ...r, status, resolvedAt: Date.now(), resolverId: myId } : r,
            ),
          }
        }),
    }
  }, [state, toasts, toast, patchCourse])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider 안에서만 사용할 수 있어요.')
  return v
}

export function resetStore() {
  localStorage.removeItem(KEY)
  location.reload()
}
