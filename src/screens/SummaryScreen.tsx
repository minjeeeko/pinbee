import { useMemo, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { TRANSPORT_LABEL } from '../lib/geo'
import { PLACE_MAP } from '../data/places'
import MapCanvas from '../components/MapCanvas'
import { AppBar, Empty } from '../components/ui'
import { TransportPicker } from '../components/common'

export default function SummaryScreen({ courseId }: { courseId?: string }) {
  const store = useStore()
  const course = courseId ? store.getCourse(courseId) : store.draft
  const [expanded, setExpanded] = useState(false)
  const [active, setActive] = useState<number | null>(null)
  const stats = useMemo(
    () => (course ? courseStats(course, { realDriving: true }) : null),
    [course, store.directionsVersion],
  )

  if (!course || !stats) {
    return (
      <div className="screen">
        <AppBar title="동선 요약" onBack={goBack} />
        <Empty title="코스를 찾을 수 없어요" />
      </div>
    )
  }

  const totalKm = stats.legs.reduce((sum, l) => sum + l.distanceKm, 0)

  return (
    <div className="screen">
      <AppBar title={course.title || '이름 없는 코스'} onBack={goBack} />

      <div className="chips" style={{ padding: '0 14px 10px' }}>
        {stats.places.map((p, i) => (
          <button
            key={p.id + i}
            className={`chip sm${active === i ? ' on' : ' outline'}`}
            onClick={() => setActive(i)}
          >
            <span
              className="num sm"
              style={{
                background: active === i ? 'var(--canvas)' : 'var(--ink)',
                color: active === i ? 'var(--ink)' : 'var(--canvas)',
              }}
            >
              {i + 1}
            </span>
            {p.name.length > 6 ? p.name.slice(0, 6) + '…' : p.name}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <MapCanvas
          places={stats.places}
          showRoute={false}
          legs={stats.legs}
          activeIndex={active}
          onSelect={setActive}
          seed={9}
          insetBottom={expanded ? 380 : 170}
        />

        <div
          style={{
            position: 'absolute',
            left: 14,
            right: 14,
            bottom: 14,
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div className="card">
            <div className="between" onClick={() => setExpanded((v) => !v)} style={{ cursor: 'pointer' }}>
              <div>
                <div className="bold">동선 총 {course.places.length}곳</div>
                <div className="tiny muted">총 이동 거리 {totalKm.toFixed(1)}km</div>
              </div>
              <span className="textbtn">{expanded ? '접기' : '자세히'}</span>
            </div>

            {expanded && (
              <>
                <div className="divider" />
                <div className="stack">
                  {stats.legs.map((leg, i) => (
                    <div key={i} className="card flat" style={{ padding: 10, background: 'var(--map-base)' }}>
                      <div style={{ marginBottom: 6 }}>
                        <span className="small bold truncate">
                          {i + 1} {PLACE_MAP[leg.fromPlaceId]?.name} → {i + 2} {PLACE_MAP[leg.toPlaceId]?.name}
                        </span>
                      </div>
                      <TransportPicker
                        value={leg.transport}
                        onChange={(t) => store.setLegTransport(course.id, i, t)}
                      />
                      {leg.minutes === null && (
                        <div className="banner alert" style={{ marginTop: 8 }}>
                          {leg.error}
                        </div>
                      )}
                    </div>
                  ))}
                  {stats.legs.length === 0 && (
                    <div className="tiny muted">장소를 2곳 이상 추가하면 구간 정보가 표시돼요.</div>
                  )}
                </div>
                <div className="divider" />
                <div className="flexrow" style={{ flexWrap: 'wrap', gap: 6 }}>
                  <button className="chip sm" onClick={() => navigate('/order/' + course.id)}>
                    순서 편집
                  </button>
                  <button className="chip sm" onClick={() => navigate('/prefs/' + course.id)}>
                    조건 점검
                  </button>
                  <span className="chip sm">
                    {stats.transports.map((t) => TRANSPORT_LABEL[t]).join(' · ') || '이동수단 없음'}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="row">
            <button className="btn" onClick={() => navigate('/search/' + course.id)}>
              장소 추가
            </button>
            <button className="btn primary" onClick={() => navigate('/save/' + course.id)}>
              저장·공유
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
