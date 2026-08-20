import { useMemo, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { findIssues, fmtDuration, suggestOrder } from '../lib/schedule'
import { computeLegs, totalTravelMinutes, TRANSPORT_LABEL } from '../lib/geo'
import { CATEGORIES, PLACE_MAP } from '../data/places'
import type { Category, Transport } from '../lib/types'
import { AppBar, Empty, Stepper } from '../components/ui'

const PACE: { key: 'tight' | 'normal' | 'relaxed'; label: string; desc: string }[] = [
  { key: 'tight', label: '빡빡하게', desc: '많이 둘러보기' },
  { key: 'normal', label: '보통', desc: '기본 여유' },
  { key: 'relaxed', label: '여유롭게', desc: '천천히 머무르기' },
]

export default function PrefsScreen({ courseId }: { courseId?: string }) {
  const store = useStore()
  const course = courseId ? store.getCourse(courseId) : store.draft
  const prefs = store.prefs
  const [applied, setApplied] = useState(false)

  const stats = useMemo(() => (course ? courseStats(course) : null), [course])
  const issues = useMemo(
    () => (course && stats ? findIssues(course, stats.legs, stats.schedule, prefs) : []),
    [course, stats, prefs],
  )
  const suggestion = useMemo(() => {
    if (!course) return null
    const next = suggestOrder(course.places)
    return {
      next,
      before: totalTravelMinutes(computeLegs(course.places)),
      after: totalTravelMinutes(computeLegs(next)),
      same: next.every((p, i) => p.uid === course.places[i].uid),
    }
  }, [course])

  if (!course || !stats) {
    return (
      <div className="screen">
        <AppBar title="선호 조건" onBack={goBack} />
        <Empty
          title="점검할 코스가 없어요"
          action={
            <button className="btn primary" onClick={() => navigate('/edit/' + store.startNewCourse())}>
              새 코스 만들기
            </button>
          }
        />
      </div>
    )
  }

  const toggleCat = (c: Category) =>
    store.setPrefs({
      ...prefs,
      categories: prefs.categories.includes(c)
        ? prefs.categories.filter((x) => x !== c)
        : [...prefs.categories, c],
    })

  return (
    <div className="screen">
      <AppBar title="선호 조건으로 코스 점검" sub={course.title || '이름 없는 코스'} onBack={goBack} />
      <div className="scroll pad">
        <div className="field">
          <span className="label">선호 이동수단</span>
          <div className="chips">
            {(['mixed', 'walk', 'transit', 'car'] as const).map((t) => (
              <button
                key={t}
                className={`chip${prefs.transport === t ? ' on' : ''}`}
                onClick={() => store.setPrefs({ ...prefs, transport: t })}
              >
                {t === 'mixed' ? '혼합' : TRANSPORT_LABEL[t as Transport]}
              </button>
            ))}
          </div>
          {prefs.transport !== 'mixed' && (
            <button
              className="btn sm block"
              style={{ marginTop: 10 }}
              onClick={() => {
                course.places.forEach((_, i) => store.setLegTransport(course.id, i, prefs.transport as Transport))
                store.toast('모든 구간에 선호 이동수단을 적용했어요')
              }}
            >
              모든 구간에 적용
            </button>
          )}
        </div>

        <div className="field">
          <span className="label">구간 최대 이동시간</span>
          <div className="between">
            <span className="small muted">이 시간을 넘는 구간을 알려드려요</span>
            <Stepper
              value={prefs.maxLegMinutes}
              min={10}
              max={120}
              step={5}
              onChange={(v) => store.setPrefs({ ...prefs, maxLegMinutes: v })}
              format={(v) => `${v}분`}
            />
          </div>
        </div>

        <div className="field">
          <span className="label">선호 장소 유형</span>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button key={c} className={`chip sm${prefs.categories.includes(c) ? ' on' : ''}`} onClick={() => toggleCat(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="label">일정 여유도</span>
          <div className="chips">
            {PACE.map((p) => (
              <button
                key={p.key}
                className={`chip${prefs.pace === p.key ? ' on' : ''}`}
                onClick={() => {
                  store.setPrefs({ ...prefs, pace: p.key })
                  const delta = p.key === 'tight' ? -10 : p.key === 'relaxed' ? 10 : 0
                  if (delta !== 0) {
                    course.places.forEach((cp) =>
                      store.updateCoursePlace(course.id, cp.uid, {
                        stayMinutes: Math.max(10, cp.stayMinutes + delta),
                      }),
                    )
                    store.toast(`장소별 체류시간을 ${delta > 0 ? '늘렸' : '줄였'}어요`)
                  }
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="section-title">점검 결과</div>
        {issues.length === 0 ? (
          <div className="banner" style={{ borderColor: '#cfe4d6', background: '#f1f8f3', color: 'var(--ok)' }}>
            설정한 조건을 모두 만족하는 코스예요.
          </div>
        ) : (
          <div className="stack">
            {issues.map((issue, i) => (
              <div className={'banner alert'} key={i}>
                {issue.text}
              </div>
            ))}
          </div>
        )}

        <div className="section-title">조정 제안</div>
        {!suggestion || suggestion.same ? (
          <div className="banner">
            지금 순서보다 이동시간이 짧은 대안을 찾지 못했어요. 조건을 완화하거나 장소를 조정해보세요.
          </div>
        ) : (
          <div className="card">
            <div className="bold small" style={{ marginBottom: 6 }}>
              순서와 이동수단을 조정하면 이동 {fmtDuration(suggestion.before)} → {fmtDuration(suggestion.after)}
            </div>
            <div className="stack" style={{ margin: '10px 0' }}>
              {suggestion.next.map((cp, i) => (
                <div className="list-item" key={cp.uid}>
                  <span className="num sm">{i + 1}</span>
                  <div className="body">
                    <div className="small truncate">{PLACE_MAP[cp.placeId]?.name}</div>
                  </div>
                  {course.places[i]?.uid !== cp.uid && <span className="pill">순서 변경</span>}
                  {course.places[i]?.uid === cp.uid &&
                    course.places[i]?.transportToNext !== cp.transportToNext && (
                      <span className="pill">이동수단 변경</span>
                    )}
                </div>
              ))}
            </div>
            <div className="row">
              <button className="btn" onClick={() => store.toast('기존 순서를 유지할게요')}>
                기존 순서 유지
              </button>
              <button
                className="btn primary"
                disabled={applied}
                onClick={() => {
                  store.reorderCourse(course.id, suggestion.next)
                  setApplied(true)
                  store.toast('제안 순서를 적용했어요')
                }}
              >
                {applied ? '적용됨' : '제안 적용'}
              </button>
            </div>
          </div>
        )}

        <button className="btn block" style={{ marginTop: 16 }} onClick={() => navigate('/summary/' + course.id)}>
          동선 요약으로
        </button>
      </div>
    </div>
  )
}
