import { supabase } from './supabase'
import type { Course, CoursePlace, Preferences, Report, SavedPlace } from './types'

/** 로컬에서만 존재하는(아직 저장 안 한) 코스는 uid('c')가 만든 'c-xxxxx' 형태라 UUID가 아니다 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isSavedCourseId(id: string) {
  return UUID_RE.test(id)
}

const COURSE_SELECT = '*, course_places(*), profiles(name)'

function mapCoursePlace(row: any): CoursePlace {
  return {
    uid: row.id,
    placeId: row.place_id,
    stayMinutes: row.stay_minutes,
    memo: row.memo,
    transportToNext: row.transport_to_next,
  }
}

function mapCourse(row: any): Course {
  const places = (row.course_places ?? [])
    .slice()
    .sort((a: any, b: any) => a.position - b.position)
    .map(mapCoursePlace)
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    coverPlaceId: row.cover_place_id,
    visibility: row.visibility,
    hidden: row.hidden,
    date: row.date ?? '',
    startTime: row.start_time ?? '',
    places,
    authorId: row.author_id,
    authorName: row.profiles?.name ?? '',
    shareToken: row.share_token,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    theme: row.theme,
    saved: row.saved,
  }
}

/** RLS가 이미 "공개+비숨김 또는 본인 또는 관리자"로 걸러주므로 별도 필터 없이 보이는 걸 전부 받는다 */
export async function fetchVisibleCourses(): Promise<Course[]> {
  const { data, error } = await supabase.from('courses').select(COURSE_SELECT).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapCourse)
}

export async function fetchCourseById(id: string): Promise<Course | null> {
  const { data, error } = await supabase.from('courses').select(COURSE_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapCourse(data) : null
}

export async function fetchCourseByToken(token: string): Promise<Course | null> {
  const { data, error } = await supabase.from('courses').select(COURSE_SELECT).eq('share_token', token).maybeSingle()
  if (error) throw error
  return data ? mapCourse(data) : null
}

/** 로컬 초안(코스 저장을 처음 누르는 순간)을 DB에 새로 만든다 */
export async function insertCourse(course: Course): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .insert({
      title: course.title,
      description: course.description,
      cover_place_id: course.coverPlaceId,
      visibility: course.visibility,
      hidden: false,
      date: course.date || null,
      start_time: course.startTime || null,
      author_id: course.authorId,
      theme: course.theme,
      saved: true,
    })
    .select(COURSE_SELECT)
    .single()
  if (error) throw error
  const inserted = mapCourse(data)
  await replaceCoursePlaces(inserted.id, course.places)
  return { ...inserted, places: course.places }
}

/** saved/hidden 등 스칼라 필드만 갱신 (places는 replaceCoursePlaces로 별도 처리) */
export async function updateCourseRow(id: string, patch: Partial<Course>) {
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.description !== undefined) row.description = patch.description
  if (patch.coverPlaceId !== undefined) row.cover_place_id = patch.coverPlaceId
  if (patch.visibility !== undefined) row.visibility = patch.visibility
  if (patch.hidden !== undefined) row.hidden = patch.hidden
  if (patch.date !== undefined) row.date = patch.date || null
  if (patch.startTime !== undefined) row.start_time = patch.startTime || null
  if (patch.theme !== undefined) row.theme = patch.theme
  if (patch.saved !== undefined) row.saved = patch.saved
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('courses').update(row).eq('id', id)
  if (error) throw error
}

/** 코스에 담긴 장소 전체를 지우고 다시 넣는다 (순서 변경·추가·삭제를 한 번에 반영) */
export async function replaceCoursePlaces(courseId: string, places: CoursePlace[]) {
  const { error: delErr } = await supabase.from('course_places').delete().eq('course_id', courseId)
  if (delErr) throw delErr
  if (places.length === 0) return
  const rows = places.map((p, i) => ({
    course_id: courseId,
    place_id: p.placeId,
    position: i,
    stay_minutes: p.stayMinutes,
    memo: p.memo,
    transport_to_next: p.transportToNext,
  }))
  const { error: insErr } = await supabase.from('course_places').insert(rows)
  if (insErr) throw insErr
}

export async function deleteCourseRow(id: string) {
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw error
}

export async function fetchSavedPlaces(): Promise<SavedPlace[]> {
  const { data, error } = await supabase.from('saved_places').select('place_id, memo').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({ placeId: r.place_id, memo: r.memo }))
}

export async function insertSavedPlace(userId: string, placeId: string) {
  const { error } = await supabase.from('saved_places').insert({ user_id: userId, place_id: placeId, memo: '' })
  if (error) throw error
}

export async function deleteSavedPlace(placeId: string) {
  const { error } = await supabase.from('saved_places').delete().eq('place_id', placeId)
  if (error) throw error
}

export async function updateSavedPlaceMemo(placeId: string, memo: string) {
  const { error } = await supabase.from('saved_places').update({ memo }).eq('place_id', placeId)
  if (error) throw error
}

export async function fetchPreferences(userId: string): Promise<Preferences | null> {
  const { data, error } = await supabase.from('preferences').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    transport: data.transport,
    maxLegMinutes: data.max_leg_minutes,
    categories: data.categories ?? [],
    pace: data.pace,
  }
}

export async function upsertPreferences(userId: string, prefs: Preferences) {
  const { error } = await supabase.from('preferences').upsert({
    user_id: userId,
    transport: prefs.transport,
    max_leg_minutes: prefs.maxLegMinutes,
    categories: prefs.categories,
    pace: prefs.pace,
  })
  if (error) throw error
}

export async function fetchReports(): Promise<Report[]> {
  const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    courseId: r.course_id,
    reporterId: r.reporter_id,
    reason: r.reason,
    status: r.status,
    createdAt: new Date(r.created_at).getTime(),
    resolvedAt: r.resolved_at ? new Date(r.resolved_at).getTime() : undefined,
    resolverId: r.resolver_id ?? undefined,
  }))
}

/** reports_one_pending_per_reporter 유니크 인덱스 위반(23505)이면 중복 신고로 처리한다 */
export async function insertReport(courseId: string, reporterId: string, reason: string): Promise<'created' | 'duplicate'> {
  const { error } = await supabase.from('reports').insert({ course_id: courseId, reporter_id: reporterId, reason })
  if (error) {
    if (error.code === '23505') return 'duplicate'
    throw error
  }
  return 'created'
}

export async function updateReportStatus(reportId: string, status: Report['status'], resolverId: string) {
  const { error } = await supabase
    .from('reports')
    .update({ status, resolved_at: new Date().toISOString(), resolver_id: resolverId })
    .eq('id', reportId)
  if (error) throw error
}

export async function fetchProfile(userId: string): Promise<{ name: string; isAdmin: boolean } | null> {
  const { data, error } = await supabase.from('profiles').select('name, is_admin').eq('id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return { name: data.name, isAdmin: data.is_admin }
}
