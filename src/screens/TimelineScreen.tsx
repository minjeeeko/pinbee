import { useMemo } from 'react'
import { goBack } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { DAY_LIMIT, fmtDuration, fmtTime, parseTime } from '../lib/schedule'
import { PLACE_MAP } from '../data/places'
import { AppBar, Empty, Stepper } from '../components/ui'
import { ConflictBadge, LegRow } from '../components/common'

export default function TimelineScreen({ courseId }: { courseId?: string }) {
  const store = useStore()
  const course = courseId ? store.getCourse(courseId) : store.draft
  const stats = useMemo(() => (course ? courseStats(course) : null), [course])

  if (!course || !stats) {
    return (
      <div className="screen">
        <AppBar title="일정 시간" onBack={goBack} />
        <Empty icon="🔍" title="코스를 찾을 수 없어요" />
      </div>
    )
  }

  const span = stats.endMinutes !== null ? stats.endMinutes - parseTime(course.startTime) : null

  return (
    <div className="screen">
      <AppBar title="일정 시간" sub="출발 시각 기준 예상 도착·종료 시각" onBack={goBack} />
      <div className="scroll pad">
        <div className="card">
          <div className="row">
            <label className="field" style={{ margin: 0 }}>
              <span className="label">방문 날짜</span>
              <input
                className="input"
                type="date"
                value={course.date}
                onChange={(e) => store.updateCourse(course.id, { date: e.target.value })}
              />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="label">출발 시간</span>
              <input
                className="input"
                type="time"
                value={course.startTime}
                onChange={(e) => store.updateCourse(course.id, { startTime: e.target.value })}
              />
            </label>
          </div>
        </div>

        {span !== null && span > DAY_LIMIT && (
          <div className="banner warn" style={{ marginTop: 10 }}>
            <div className="t">하루 일정 범위를 넘었어요</div>
            전체 {fmtDuration(span)} 일정이에요. 장소를 줄이거나 체류시간을 조정해보세요.
          </div>
        )}
        {stats.conflicts.length > 0 && (
          <div className="banner danger" style={{ marginTop: 10 }}>
            <div className="t">영업시간과 겹치지 않는 장소가 {stats.conflicts.length}곳 있어요</div>
            출발 시간이나 방문 순서를 바꾸면 해결될 수 있어요.
          </div>
        )}

        <div className="section-title">예상 일정</div>
        {stats.schedule.map((item, i) => {
          const place = PLACE_MAP[item.placeId]
          const cp = course.places[i]
          const leg = stats.legs[i]
          return (
            <div key={cp.uid}>
              <div className="card" style={{ padding: 12 }}>
                <div className="list-item" style={{ alignItems: 'flex-start' }}>
                  <span className="num">{i + 1}</span>
                  <div className="body">
                    <div className="between">
                      <span className="name truncate">{place?.name}</span>
                      <span className="small bold">
                        {fmtTime(item.arrive)} – {fmtTime(item.leave)}
                      </span>
                    </div>
                    <div className="meta">
                      {place?.hours
                        ? `영업 ${fmtTime(place.hours.open)}–${fmtTime(place.hours.close)}`
                        : '영업시간 정보 없음'}
                    </div>
                    <div className="flexrow" style={{ marginTop: 8, gap: 8 }}>
                      <span className="tiny muted">체류</span>
                      <Stepper
                        value={cp.stayMinutes}
                        onChange={(v) => store.updateCoursePlace(course.id, cp.uid, { stayMinutes: v })}
                        format={(v) => fmtDuration(v)}
                      />
                      <ConflictBadge conflict={item.conflict} />
                    </div>
                    {item.conflictText && item.conflict !== 'none' && (
                      <div
                        className={`banner ${item.conflict === 'after-close' ? 'danger' : item.conflict === 'before-open' ? 'warn' : ''}`}
                        style={{ marginTop: 8 }}
                      >
                        {item.conflictText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {leg && <LegRow leg={leg} onChangeTransport={(t) => store.setLegTransport(course.id, i, t)} />}
            </div>
          )
        })}

        <div className="card" style={{ marginTop: 14, background: 'var(--surface-2)' }}>
          <div className="between">
            <span className="small muted">이동 합계</span>
            <span className="bold small">{fmtDuration(stats.travel)}</span>
          </div>
          <div className="between" style={{ marginTop: 6 }}>
            <span className="small muted">체류 합계</span>
            <span className="bold small">{fmtDuration(stats.stay)}</span>
          </div>
          <div className="divider" />
          <div className="between">
            <span className="small bold">전체 예상</span>
            <span className="bold">{span !== null ? fmtDuration(span) : '계산 불가'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
