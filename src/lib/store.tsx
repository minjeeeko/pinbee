import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Course, CoursePlace, Preferences, Report, SavedPlace, Transport, User, Visibility } from './types'
import { DEFAULT_PREFS } from '../data/seed'
import { PLACE_MAP } from '../data/places'
import { haversineKm, suggestTransport } from './geo'
import { supabase, isSupabaseConfigured } from './supabase'
import * as db from './db'
import { isSavedCourseId } from './db'

const LOCAL_KEY = 'routiz.local.v1'

interface Toast {
  id: number
  text: string
}

/** 로그인 여부와 무관하게 로컬에만 존재하는 코스(아직 저장 안 한 초안들)와 현재 편집 중인 코스 id */
interface LocalState {
  localCourses: Course[]
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

function loadLocalState(): LocalState {
  const raw = localStorage.getItem(LOCAL_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.localCourses) && parsed.localCourses.length > 0) {
        return { localCourses: parsed.localCourses, draftId: parsed.draftId ?? parsed.localCourses[0].id }
      }
    } catch {
      /* 손상된 저장 데이터는 초기값으로 대체 */
    }
  }
  const draft = newCourse('guest', '게스트')
  return { localCourses: [draft], draftId: draft.id }
}

interface State {
  user: User | null
  authLoading: boolean
  /** 로그인한 사용자가 선호 조건(온보딩)을 아직 한 번도 저장하지 않았으면 false, 저장했으면 true, 모르면 null */
  onboarded: boolean | null
  courses: Course[]
  savedPlaces: SavedPlace[]
  reports: Report[]
  prefs: Preferences
  draftId: string | null
}

interface StoreValue extends State {
  toasts: Toast[]
  toast: (text: string) => void
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
  saveCourse: (id: string) => Promise<{ ok: true; id: string } | { ok: false; error: string }>
  addPlaceToCourse: (courseId: string, placeId: string) => void
  removePlaceFromCourse: (courseId: string, uid: string) => void
  updateCoursePlace: (courseId: string, uid: string, patch: Partial<CoursePlace>) => void
  reorderCourse: (courseId: string, places: CoursePlace[]) => void
  setLegTransport: (courseId: string, index: number, t: Transport) => void
  setVisibility: (courseId: string, v: Visibility) => void
  toggleSavedPlace: (placeId: string) => void
  setSavedPlaceMemo: (placeId: string, memo: string) => void
  setPrefs: (p: Preferences) => void
  addReport: (courseId: string, reason: string) => Promise<'created' | 'duplicate'>
  resolveReport: (reportId: string, status: Report['status']) => void
}

const Ctx = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const local = useRef(loadLocalState())
  const [state, setState] = useState<State>(() => ({
    user: null,
    authLoading: isSupabaseConfigured,
    onboarded: null,
    courses: local.current.localCourses,
    savedPlaces: [],
    reports: [],
    prefs: DEFAULT_PREFS,
    draftId: local.current.draftId,
  }))
  const [toasts, setToasts] = useState<Toast[]>([])

  // 로컬(아직 저장 안 한) 코스만 localStorage에 남긴다 — 로그인 여부와 무관하게 유지된다
  useEffect(() => {
    const localCourses = state.courses.filter((c) => !isSavedCourseId(c.id))
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ localCourses, draftId: state.draftId }))
  }, [state.courses, state.draftId])

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400)
  }, [])

  // 인증 상태 구독: 로그인/로그아웃/토큰 갱신마다 프로필을 다시 읽는다
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authUser = session?.user
      if (!authUser) {
        setState((s) => ({ ...s, user: null, authLoading: false, onboarded: null, savedPlaces: [], reports: [], prefs: DEFAULT_PREFS }))
        return
      }
      try {
        const profile = await db.fetchProfile(authUser.id)
        setState((s) => ({
          ...s,
          authLoading: false,
          user: {
            id: authUser.id,
            name: profile?.name ?? authUser.email?.split('@')[0] ?? '사용자',
            email: authUser.email ?? '',
            provider: 'email',
            isAdmin: profile?.isAdmin ?? false,
          },
        }))
      } catch {
        setState((s) => ({ ...s, authLoading: false }))
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // 로그인 상태가 바뀔 때마다 내 저장 장소·신고·선호 조건을 다시 불러온다
  useEffect(() => {
    if (!isSupabaseConfigured || !state.user) return
    const userId = state.user.id
    db.fetchSavedPlaces()
      .then((savedPlaces) => setState((s) => (s.user?.id === userId ? { ...s, savedPlaces } : s)))
      .catch(() => toast('저장 장소를 불러오지 못했어요'))
    db.fetchReports()
      .then((reports) => setState((s) => (s.user?.id === userId ? { ...s, reports } : s)))
      .catch(() => {
        /* 관리자가 아니면 RLS로 조회가 제한될 뿐이라 조용히 무시 */
      })
    db.fetchPreferences(userId)
      .then((prefs) =>
        setState((s) => (s.user?.id === userId ? { ...s, prefs: prefs ?? s.prefs, onboarded: prefs !== null } : s)),
      )
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user?.id])

  // 접속 시 + 로그인 상태가 바뀔 때마다 (공개 또는 내) 코스를 다시 불러온다
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const userId = state.user?.id ?? null
    db.fetchVisibleCourses()
      .then((fetched) => {
        setState((s) => {
          if ((s.user?.id ?? null) !== userId) return s
          const localOnly = s.courses.filter((c) => !isSavedCourseId(c.id))
          return { ...s, courses: [...localOnly, ...fetched] }
        })
      })
      .catch(() => toast('코스를 불러오지 못했어요'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user?.id])

  const patchCourse = useCallback((id: string, fn: (c: Course) => Course) => {
    setState((s) => ({
      ...s,
      courses: s.courses.map((c) => (c.id === id ? { ...fn(c), updatedAt: Date.now() } : c)),
    }))
  }, [])

  /** places가 바뀌는 액션 공용: 낙관적으로 로컬을 먼저 바꾸고, 저장된 코스면 백그라운드로 DB에 반영한다 */
  const patchPlaces = useCallback(
    (courseId: string, fn: (places: CoursePlace[]) => CoursePlace[]) => {
      let nextPlaces: CoursePlace[] = []
      setState((s) => ({
        ...s,
        courses: s.courses.map((c) => {
          if (c.id !== courseId) return c
          nextPlaces = fn(c.places)
          return { ...c, places: nextPlaces, updatedAt: Date.now() }
        }),
      }))
      if (isSavedCourseId(courseId)) {
        db.replaceCoursePlaces(courseId, nextPlaces).catch(() => toast('저장에 실패했어요. 다시 시도해주세요'))
      }
    },
    [toast],
  )

  const value = useMemo<StoreValue>(() => {
    const myId = state.user?.id ?? 'guest'
    return {
      ...state,
      toasts,
      toast,
      logout: () => {
        if (isSupabaseConfigured) supabase.auth.signOut()
      },
      // 장소를 하나라도 추가해 코스를 "시작"한 경우에만 내 코스 목록에 노출한다
      myCourses: state.courses.filter((c) => c.authorId === myId && c.places.length > 0),
      publicCourses: state.courses.filter((c) => c.visibility === 'public' && !c.hidden),
      draft: state.courses.find((c) => c.id === state.draftId) ?? null,
      setDraftId: (id) => setState((s) => ({ ...s, draftId: id })),
      startNewCourse: () => {
        const c = newCourse(myId, state.user?.name ?? '게스트')
        setState((s) => ({ ...s, courses: [...s.courses, c], draftId: c.id }))
        return c.id
      },
      getCourse: (id) => state.courses.find((c) => c.id === id),
      getCourseByToken: (token) => state.courses.find((c) => c.shareToken === token),
      updateCourse: (id, patch) => {
        patchCourse(id, (c) => ({ ...c, ...patch }))
        if (isSavedCourseId(id)) {
          db.updateCourseRow(id, patch).catch(() => toast('저장에 실패했어요. 다시 시도해주세요'))
        }
      },
      deleteCourse: (id) => {
        setState((s) => ({
          ...s,
          courses: s.courses.filter((c) => c.id !== id),
          draftId: s.draftId === id ? null : s.draftId,
        }))
        if (isSavedCourseId(id)) {
          db.deleteCourseRow(id).catch(() => toast('삭제에 실패했어요. 다시 시도해주세요'))
        }
      },
      saveCourse: async (id) => {
        if (!isSupabaseConfigured) return { ok: false, error: 'Supabase가 설정되지 않았어요' }
        const user = state.user
        if (!user) return { ok: false, error: '로그인이 필요해요' }
        const course = state.courses.find((c) => c.id === id)
        if (!course) return { ok: false, error: '코스를 찾을 수 없어요' }
        try {
          if (isSavedCourseId(id)) {
            await db.updateCourseRow(id, { saved: true })
            setState((s) => ({ ...s, courses: s.courses.map((c) => (c.id === id ? { ...c, saved: true } : c)) }))
            return { ok: true, id }
          }
          const inserted = await db.insertCourse({ ...course, authorId: user.id, authorName: user.name })
          setState((s) => ({
            ...s,
            courses: s.courses.map((c) => (c.id === id ? inserted : c)),
            draftId: s.draftId === id ? inserted.id : s.draftId,
          }))
          return { ok: true, id: inserted.id }
        } catch {
          return { ok: false, error: '저장에 실패했어요. 다시 시도해주세요' }
        }
      },
      addPlaceToCourse: (courseId, placeId) =>
        patchPlaces(courseId, (places) => {
          const prev = places[places.length - 1]
          const next: CoursePlace = { uid: uid('cp'), placeId, stayMinutes: 60, memo: '', transportToNext: 'walk' }
          const result = [...places, next]
          if (prev) {
            const a = PLACE_MAP[prev.placeId]
            const b = PLACE_MAP[placeId]
            if (a && b) {
              result[result.length - 2] = { ...prev, transportToNext: suggestTransport(haversineKm(a, b)) }
            }
          }
          return result
        }),
      removePlaceFromCourse: (courseId, cpUid) => {
        const course = state.courses.find((c) => c.id === courseId)
        const removed = course?.places.find((p) => p.uid === cpUid)
        patchPlaces(courseId, (places) => places.filter((p) => p.uid !== cpUid))
        if (removed) {
          patchCourse(courseId, (c) => {
            const stillUsed = c.places.some((p) => p.uid !== cpUid && p.placeId === removed.placeId)
            return c.coverPlaceId === removed.placeId && !stillUsed ? { ...c, coverPlaceId: null } : c
          })
        }
      },
      updateCoursePlace: (courseId, cpUid, patch) =>
        patchPlaces(courseId, (places) => places.map((p) => (p.uid === cpUid ? { ...p, ...patch } : p))),
      reorderCourse: (courseId, places) => patchPlaces(courseId, () => places),
      setLegTransport: (courseId, index, t) =>
        patchPlaces(courseId, (places) => places.map((p, i) => (i === index ? { ...p, transportToNext: t } : p))),
      setVisibility: (courseId, v) => {
        patchCourse(courseId, (c) => ({ ...c, visibility: v }))
        if (isSavedCourseId(courseId)) {
          db.updateCourseRow(courseId, { visibility: v }).catch(() => toast('저장에 실패했어요. 다시 시도해주세요'))
        }
      },
      toggleSavedPlace: (placeId) => {
        if (!state.user) {
          toast('로그인이 필요해요')
          return
        }
        const already = state.savedPlaces.some((sp) => sp.placeId === placeId)
        setState((s) => ({
          ...s,
          savedPlaces: already ? s.savedPlaces.filter((sp) => sp.placeId !== placeId) : [...s.savedPlaces, { placeId, memo: '' }],
        }))
        const write = already ? db.deleteSavedPlace(placeId) : db.insertSavedPlace(state.user.id, placeId)
        write.catch(() => toast('저장에 실패했어요. 다시 시도해주세요'))
      },
      setSavedPlaceMemo: (placeId, memo) => {
        if (!state.user) {
          toast('로그인이 필요해요')
          return
        }
        setState((s) => ({
          ...s,
          savedPlaces: s.savedPlaces.map((sp) => (sp.placeId === placeId ? { ...sp, memo } : sp)),
        }))
        db.updateSavedPlaceMemo(placeId, memo).catch(() => toast('메모 저장에 실패했어요'))
      },
      setPrefs: (p) => {
        setState((s) => ({ ...s, prefs: p, onboarded: state.user ? true : s.onboarded }))
        if (state.user) {
          db.upsertPreferences(state.user.id, p).catch(() => toast('선호 조건 저장에 실패했어요'))
        }
      },
      addReport: async (courseId, reason) => {
        if (!state.user) {
          toast('로그인이 필요해요')
          return 'duplicate'
        }
        const result = await db.insertReport(courseId, state.user.id, reason)
        if (result === 'created') {
          db.fetchReports()
            .then((reports) => setState((s) => ({ ...s, reports })))
            .catch(() => {})
        }
        return result
      },
      resolveReport: (reportId, status) => {
        const report = state.reports.find((r) => r.id === reportId)
        if (!report || !state.user) return
        setState((s) => {
          let courses = s.courses
          if (status === 'hidden') courses = courses.map((c) => (c.id === report.courseId ? { ...c, hidden: true } : c))
          else if (status === 'deleted') courses = courses.filter((c) => c.id !== report.courseId)
          else if (status === 'rejected') courses = courses.map((c) => (c.id === report.courseId ? { ...c, hidden: false } : c))
          return {
            ...s,
            courses,
            reports: s.reports.map((r) => (r.id === reportId ? { ...r, status, resolvedAt: Date.now(), resolverId: state.user!.id } : r)),
          }
        })
        db.updateReportStatus(reportId, status, state.user.id).catch(() => toast('처리에 실패했어요. 다시 시도해주세요'))
        if (status === 'hidden' || status === 'rejected') {
          db.updateCourseRow(report.courseId, { hidden: status === 'hidden' }).catch(() => {})
        } else if (status === 'deleted') {
          db.deleteCourseRow(report.courseId).catch(() => {})
        }
      },
    }
  }, [state, toasts, toast, patchCourse, patchPlaces])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider 안에서만 사용할 수 있어요.')
  return v
}

export function resetStore() {
  localStorage.removeItem(LOCAL_KEY)
  if (isSupabaseConfigured) supabase.auth.signOut()
  location.reload()
}
