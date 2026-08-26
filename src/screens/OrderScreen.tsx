import { useMemo, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { PLACE_MAP } from '../data/places'
import MapCanvas from '../components/MapCanvas'
import SortableList from '../components/SortableList'
import { AppBar, Empty, Thumb } from '../components/ui'
import { LegRow } from '../components/common'
import type { CoursePlace } from '../lib/types'

export default function OrderScreen({ courseId }: { courseId?: string }) {
  const store = useStore()
  const course = courseId ? store.getCourse(courseId) : store.draft
  const [active, setActive] = useState<number | null>(null)
  const stats = useMemo(
    () => (course ? courseStats(course, { realDriving: true }) : null),
    [course, store.directionsVersion],
  )

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
      <AppBar title="순서 정하기" sub="변경한 동선은 자동 저장돼요" onBack={goBack} logo />

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

        <div className="tiny muted" style={{ marginBottom: 10 }}>
          총 이동 거리 {stats.legs.reduce((sum, l) => sum + l.distanceKm, 0).toFixed(1)}km
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
                  style={{ padding: 12 }}
                  onClick={() => setActive(i)}
                >
                  <div className="list-item" style={{ alignItems: 'flex-start' }}>
                    <span className={`num${active === i ? '' : ' ghost'}`} style={{ marginTop: 1 }}>
                      {i + 1}
                    </span>
                    <div className="body">
                      <div className="name truncate">{place?.name}</div>
                      <div className="meta truncate">{place?.category}</div>
                    </div>
                    <Thumb category={place?.category} />
                    <span {...handle}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                        <circle cx="4" cy="3" r="1.3" fill="currentColor" />
                        <circle cx="10" cy="3" r="1.3" fill="currentColor" />
                        <circle cx="4" cy="7" r="1.3" fill="currentColor" />
                        <circle cx="10" cy="7" r="1.3" fill="currentColor" />
                        <circle cx="4" cy="11" r="1.3" fill="currentColor" />
                        <circle cx="10" cy="11" r="1.3" fill="currentColor" />
                      </svg>
                    </span>
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
    </div>
  )
}
