import { useMemo, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { TRANSPORT_LABEL } from '../lib/geo'
import { PLACE_MAP } from '../data/places'
import MapCanvas from '../components/MapCanvas'
import { AppBar, Empty, Modal, Thumb } from '../components/ui'

const REASONS = ['부적절한 내용', '개인정보 노출', '허위·과장 정보', '광고·스팸', '기타']

export default function PublicCourseScreen({ courseId, token }: { courseId?: string; token?: string }) {
  const store = useStore()
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState(REASONS[0])
  const course = token ? store.getCourseByToken(token) : courseId ? store.getCourse(courseId) : undefined
  const stats = useMemo(() => (course ? courseStats(course) : null), [course])

  const unavailable =
    !course || course.hidden || (course.visibility !== 'public' && course.authorId !== (store.user?.id ?? 'u-me'))

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

  const isMine = course.authorId === (store.user?.id ?? 'u-me')

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
        <div className="tiny muted" style={{ marginTop: 4 }}>
          작성자 {course.authorName} · {stats.regions.join('·')} · {course.theme} ·{' '}
          {stats.transports.map((t) => TRANSPORT_LABEL[t]).join('+') || '이동수단 없음'} · {course.places.length}곳
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
          return (
            <div key={cp.uid}>
              <div className="card" style={{ padding: 12 }}>
                <div className="list-item">
                  <span className="num">{i + 1}</span>
                  <div className="body">
                    <div className="name truncate">{place?.name}</div>
                    <div className="meta truncate">
                      {place?.region} · {place?.category}
                      {cp.memo ? ` · ${cp.memo}` : ''}
                    </div>
                  </div>
                  <Thumb />
                </div>
              </div>
              {leg && (
                <div className={`leg${leg.minutes === null ? ' error' : ''}`}>
                  <span className="seg-btn">
                    {TRANSPORT_LABEL[leg.transport]} · {leg.distanceKm.toFixed(1)}km
                  </span>
                </div>
              )}
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
            onClick={() => {
              const res = store.addReport(course.id, reason)
              store.toast(res === 'duplicate' ? '이미 접수된 신고가 검토 중이에요' : '신고가 접수되었어요')
              setReportOpen(false)
            }}
          >
            신고하기
          </button>
        </div>
      </Modal>
    </div>
  )
}
