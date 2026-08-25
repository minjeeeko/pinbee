import { useMemo, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { suggestOrder } from '../lib/schedule'
import { computeLegs, totalDistanceKm } from '../lib/geo'
import { PLACE_MAP } from '../data/places'
import MapCanvas from '../components/MapCanvas'
import SortableList from '../components/SortableList'
import { AppBar, Empty, Modal, Thumb } from '../components/ui'
import { LegRow } from '../components/common'
import type { CoursePlace } from '../lib/types'

export default function OrderScreen({ courseId }: { courseId?: string }) {
  const store = useStore()
  const course = courseId ? store.getCourse(courseId) : store.draft
  const [active, setActive] = useState<number | null>(null)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const stats = useMemo(
    () => (course ? courseStats(course, { realDriving: true }) : null),
    [course, store.directionsVersion],
  )

  const suggestion = useMemo(() => {
    if (!course) return null
    const next = suggestOrder(course.places, store.prefs.transport)
    const before = totalDistanceKm(computeLegs(course.places))
    const after = totalDistanceKm(computeLegs(next))
    const unchanged = next.every(
      (p, i) => p.uid === course.places[i].uid && p.transportToNext === course.places[i].transportToNext,
    )
    return { next, before, after, same: unchanged || after >= before }
  }, [course, store.prefs.transport])

  if (!course || !stats) {
    return (
      <div className="screen">
        <AppBar title="순서 정하기" onBack={goBack} />
        <Empty title="코스를 찾을 수 없어요" />
      </div>
    )
  }

  return (
    <div className="screen">
      <AppBar title="순서 정하기" sub="변경한 동선은 자동 저장돼요" onBack={goBack} />

      <div style={{ position: 'relative', height: '40%', minHeight: 200, margin: '0 20px', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <MapCanvas
          places={stats.places}
          showRoute
          legs={stats.legs}
          activeIndex={active}
          onSelect={setActive}
          seed={9}
        />
      </div>

      <div className="scroll pad" style={{ marginTop: 12 }}>
        <div className="tiny muted" style={{ textAlign: 'center', marginBottom: 12 }}>
          카드를 드래그해서 동선 순서를 바꿔보세요
        </div>

        <div className="between" style={{ marginBottom: 10 }}>
          <span className="tiny muted">총 이동 거리 {stats.legs.reduce((sum, l) => sum + l.distanceKm, 0).toFixed(1)}km</span>
          <button className="btn xs" onClick={() => setSuggestOpen(true)}>
            순서 제안 받기
          </button>
        </div>

        <SortableList
          items={course.places}
          keyOf={(p: CoursePlace) => p.uid}
          onReorder={(next) => {
            store.reorderCourse(course.id, next)
            store.toast('동선을 다시 계산했어요')
          }}
          renderItem={(cp, i, handle, dragging) => {
            const place = PLACE_MAP[cp.placeId]
            const leg = stats.legs[i]
            return (
              <div>
                <div
                  className={`card${active === i || dragging ? ' selected' : ''}`}
                  style={{ padding: 12, cursor: 'grab' }}
                  onClick={() => setActive(i)}
                  onPointerDown={handle.onPointerDown}
                  role={handle.role}
                  aria-label={handle['aria-label']}
                >
                  <div className="list-item">
                    <span className={`num${active === i ? '' : ' ghost'}`}>{i + 1}</span>
                    <div className="body">
                      <div className="name truncate">{place?.name}</div>
                      <div className="meta truncate">
                        {place?.region} · {place?.category}
                      </div>
                    </div>
                    <Thumb />
                    <button
                      className="btn xs"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        store.removePlaceFromCourse(course.id, cp.uid)
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {leg && <LegRow leg={leg} onChangeTransport={(t) => store.setLegTransport(course.id, i, t)} />}
              </div>
            )
          }}
        />

        <button
          className="btn ghost block"
          style={{ marginTop: 16 }}
          onClick={() => navigate('/search/' + course.id)}
        >
          장소 추가
        </button>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={() => navigate('/summary/' + course.id)}>
            동선 확인
          </button>
          <button className="btn primary" onClick={() => navigate('/save/' + course.id)}>
            코스 저장
          </button>
        </div>
      </div>

      <Modal open={suggestOpen} onClose={() => setSuggestOpen(false)}>
        <div className="modal-title">이동 거리가 짧아지는 순서 제안</div>
        {!suggestion || suggestion.same ? (
          <div className="banner" style={{ marginBottom: 14 }}>
            지금보다 거리가 짧아지는 대안을 찾지 못했어요. 기존 순서를 유지할게요.
          </div>
        ) : (
          <>
            <div className="banner" style={{ marginBottom: 12 }}>
              총 거리 {suggestion.before.toFixed(1)}km → <b>{suggestion.after.toFixed(1)}km</b>
              {suggestion.after < suggestion.before
                ? ` (${(suggestion.before - suggestion.after).toFixed(1)}km 단축)`
                : ' (단축 효과 없음)'}
            </div>
            <div className="stack" style={{ marginBottom: 14 }}>
              {suggestion.next.map((cp, i) => (
                <div className="list-item" key={cp.uid}>
                  <span className="num sm">{i + 1}</span>
                  <div className="body">
                    <div className="small bold truncate">{PLACE_MAP[cp.placeId]?.name}</div>
                  </div>
                  {course.places[i]?.uid !== cp.uid && <span className="pill">순서 변경</span>}
                  {course.places[i]?.uid === cp.uid &&
                    course.places[i]?.transportToNext !== cp.transportToNext && (
                      <span className="pill">이동수단 변경</span>
                    )}
                </div>
              ))}
            </div>
          </>
        )}
        <div className="row">
          <button className="btn" onClick={() => setSuggestOpen(false)}>
            기존 순서 유지
          </button>
          <button
            className="btn primary"
            disabled={!suggestion || suggestion.same}
            onClick={() => {
              if (suggestion) {
                store.reorderCourse(course.id, suggestion.next)
                store.toast('제안 순서를 적용했어요')
              }
              setSuggestOpen(false)
            }}
          >
            제안 적용
          </button>
        </div>
      </Modal>
    </div>
  )
}
