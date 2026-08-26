import { useEffect, useMemo, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { TRANSPORT_LABEL } from '../lib/geo'
import { PLACE_MAP, registerPlace } from '../data/places'
import MapCanvas from '../components/MapCanvas'
import { AppBar, Empty, Modal, Thumb } from '../components/ui'
import { fetchCourseById, fetchCourseByToken, fetchPlacesByIds } from '../lib/db'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Course } from '../lib/types'

const REASONS = ['부적절한 내용', '개인정보 노출', '허위·과장 정보', '광고·스팸', '기타']

export default function PublicCourseScreen({ courseId, token }: { courseId?: string; token?: string }) {
  const store = useStore()
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState(REASONS[0])
  const cached = token ? store.getCourseByToken(token) : courseId ? store.getCourse(courseId) : undefined
  const [fetched, setFetched] = useState<Course | null>(null)
  const [checking, setChecking] = useState(!cached && isSupabaseConfigured)
  const course = cached ?? fetched ?? undefined
  const [placesTick, setPlacesTick] = useState(0)
  const stats = useMemo(() => (course ? courseStats(course) : null), [course, placesTick])

  // 공유 링크로 바로 들어온 경우처럼 아직 목록 캐시에 없을 수 있어 직접 한 번 더 조회한다
  useEffect(() => {
    if (cached || !isSupabaseConfigured) {
      setChecking(false)
      return
    }
    setChecking(true)
    const load = token ? fetchCourseByToken(token) : courseId ? fetchCourseById(courseId) : Promise.resolve(null)
    load
      .then(setFetched)
      .catch(() => {})
      .finally(() => setChecking(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cached, token, courseId])

  // 다른 사람이 공유 링크로 처음 들어오면 그 코스가 참조하는 장소가 이 세션의
  // PLACE_MAP에 없을 수 있다(주소 검색으로 등록된 장소 등) — 없으면 DB에서 채워 넣어야
  // 지도가 실제 좌표로 표시된다. 비워두면 장소가 하나도 안 잡혀 지도가 기본 서울 중심(종로구)에 머문다.
  useEffect(() => {
    if (!course || !isSupabaseConfigured) return
    const missing = course.places.map((p) => p.placeId).filter((id) => !PLACE_MAP[id])
    if (missing.length === 0) return
    fetchPlacesByIds(missing)
      .then((places) => {
        if (places.length === 0) return
        places.forEach(registerPlace)
        setPlacesTick((t) => t + 1)
      })
      .catch(() => {})
  }, [course])

  if (checking) {
    return (
      <div className="screen">
        <AppBar title="코스 상세" onBack={goBack} />
        <div className="scroll pad">
          <div className="tiny muted" style={{ textAlign: 'center', marginTop: 40 }}>
            불러오는 중…
          </div>
        </div>
      </div>
    )
  }

  const unavailable =
    !course ||
    (course.hidden && !store.user?.isAdmin) ||
    (course.visibility !== 'public' && course.authorId !== (store.user?.id ?? 'guest') && !store.user?.isAdmin)

  if (unavailable || !course || !stats) {
    return (
      <div className="screen">
        <AppBar title="코스 상세" onBack={goBack} />
        <Empty
          title="지금은 볼 수 없는 코스예요"
          desc="비공개로 전환되었거나 관리자에 의해 숨김 처리된 코스입니다."
          action={
            <button className="btn primary" onClick={() => navigate('/explore')}>
              공개 코스 둘러보기
            </button>
          }
        />
      </div>
    )
  }

  const isMine = course.authorId === (store.user?.id ?? 'guest')

  return (
    <div className="screen">
      <AppBar
        title={course.title}
        sub={`${course.authorName} · ${course.theme}`}
        onBack={goBack}
        right={
          <div className="flexrow" style={{ gap: 6 }}>
            <button
              className="btn xs"
              onClick={async () => {
                const url = `${window.location.origin}${window.location.pathname}#/s/${course.shareToken}`
                try {
                  await navigator.clipboard.writeText(url)
                } catch {
                  /* 클립보드를 쓸 수 없는 환경은 토스트만 표시 */
                }
                store.toast('공유 링크를 복사했어요')
              }}
            >
              공유
            </button>
            {!isMine && (
              <button className="btn xs" onClick={() => setReportOpen(true)}>
                신고
              </button>
            )}
          </div>
        }
      />

      <div style={{ position: 'relative', height: '36%', minHeight: 190, margin: '0 20px', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <MapCanvas places={stats.places} showRoute legs={stats.legs} seed={13} />
      </div>

      <div className="scroll pad" style={{ marginTop: 12 }}>
        <div className="flexrow" style={{ gap: 6, marginBottom: 8 }}>
          <span className="pill dark">공개</span>
        </div>
        <div className="bold" style={{ fontSize: 17, lineHeight: '27px' }}>
          {course.title}
        </div>
        {course.description && (
          <div className="small" style={{ marginTop: 10, color: 'var(--fg)' }}>
            {course.description}
          </div>
        )}

        <div className="section-title">방문 순서</div>
        {course.places.map((cp, i) => {
          const place = PLACE_MAP[cp.placeId]
          const leg = stats.legs[i]
          const isLast = i === course.places.length - 1
          return (
            <div key={cp.uid} style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flex: 'none' }}>
                <span className="num">{i + 1}</span>
                {!isLast && <div style={{ flex: 1, width: 1, minHeight: 20, background: 'var(--border)' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 16 }}>
                <div className="card" style={{ padding: 12, border: 'none' }}>
                  <div className="list-item">
                    <div className="body">
                      <div className="name truncate">{place?.name}</div>
                      <div className="meta truncate">
                        {place?.category}
                        {cp.memo ? ` · ${cp.memo}` : ''}
                      </div>
                    </div>
                    <Thumb category={place?.category} border={false} />
                  </div>
                </div>
                {leg && (
                  <div
                    className={`leg${leg.minutes === null ? ' error' : ''}`}
                    style={{ borderLeft: 'none', margin: '6px 0 0', paddingLeft: 0 }}
                  >
                    <span className="seg-btn">
                      {TRANSPORT_LABEL[leg.transport]} · {leg.distanceKm.toFixed(1)}km
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}

      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)}>
        <div className="modal-title">이 코스를 신고할게요</div>
        <div className="stack" style={{ marginBottom: 14 }}>
          {REASONS.map((r) => (
            <button
              key={r}
              className={`btn block${reason === r ? ' primary' : ''}`}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="row">
          <button className="btn" onClick={() => setReportOpen(false)}>
            취소
          </button>
          <button
            className="btn primary"
            onClick={async () => {
              setReportOpen(false)
              const res = await store.addReport(course.id, reason)
              store.toast(res === 'duplicate' ? '이미 접수된 신고가 검토 중이에요' : '신고가 접수되었어요')
            }}
          >
            신고하기
          </button>
        </div>
      </Modal>
    </div>
  )
}
