import { useMemo, useState } from 'react'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { PLACE_MAP } from '../data/places'
import MapCanvas from '../components/MapCanvas'
import { Empty, Thumb } from '../components/ui'
import { PlaceEditorModal } from '../components/common'

export default function HomeScreen() {
  const store = useStore()
  const course = store.draft
  const [editing, setEditing] = useState<string | null>(null)

  const stats = useMemo(() => (course ? courseStats(course) : null), [course])

  if (!course || !stats) {
    return (
      <div className="screen">
        <div className="scroll pad">
          <Empty
            title="편집 중인 코스가 없어요"
            desc="새 코스를 만들어 장소를 추가해보세요."
            action={
              <button className="btn primary" onClick={() => navigate('/edit/' + store.startNewCourse())}>
                새 코스 만들기
              </button>
            }
          />
          <div className="section-title">내 코스</div>
          {store.myCourses.map((c) => (
            <div className="card tap" key={c.id} onClick={() => navigate('/edit/' + c.id)}>
              <div className="bold">{c.title || '이름 없는 코스'}</div>
              <div className="tiny muted">{c.places.length}곳</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const places = stats.places

  return (
    <div className="screen">
      {/* 상단 2/3 — 지도 */}
      <div style={{ position: 'relative', flex: 2, minHeight: 0 }}>
        <MapCanvas
          places={places}
          showRoute={false}
          showNumbers={false}
          activeIndex={null}
          onSelect={(i) => setEditing(course.places[i]?.uid ?? null)}
          insetTop={70}
          insetBottom={16}
        />

        <div className="map-float" style={{ top: 10 }}>
          <button className="searchbar" style={{ flex: 1 }} onClick={() => navigate('/search/' + course.id)}>
            <span className="placeholder">장소·지역 검색</span>
          </button>
        </div>
      </div>

      {/* 하단 1/3 — 장소 카드 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          borderTop: '1px solid var(--border)',
          background: 'var(--canvas)',
        }}
      >
        <div style={{ padding: '10px 20px 6px' }}>
          {course.saved && course.title && (
            <div className="bold truncate" style={{ fontSize: 17, lineHeight: '27px' }}>
              {course.title}
            </div>
          )}
          <div className="tiny muted">{course.places.length}곳</div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {course.places.length === 0 ? (
            <Empty
              title="아직 추가한 장소가 없어요"
              desc="검색해서 코스를 시작하세요."
              action={
                <button className="btn primary" onClick={() => navigate('/search/' + course.id)}>
                  장소 검색하기
                </button>
              }
            />
          ) : (
            <div
              style={{
                display: 'flex',
                gap: 10,
                height: '100%',
                overflowX: 'auto',
                padding: '0 20px 4px',
                alignItems: 'stretch',
              }}
            >
              {course.places.map((cp) => {
                const place = PLACE_MAP[cp.placeId]
                return (
                  <div
                    key={cp.uid}
                    className="card tap"
                    style={{ flex: 'none', width: 152, padding: 10, display: 'flex', flexDirection: 'column' }}
                    onClick={() => setEditing(cp.uid)}
                  >
                    <Thumb />
                    <div className="name truncate" style={{ marginTop: 8 }}>
                      {place?.name}
                    </div>
                    <div className="meta truncate">
                      {place?.category} · 좋아요 {place?.likeCount ?? 0}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ padding: '10px 20px calc(72px + var(--safe-b))' }}>
          <button
            className="btn primary block"
            disabled={course.places.length < 2}
            onClick={() => navigate('/order/' + course.id)}
          >
            순서 정하기
          </button>
        </div>
      </div>

      <PlaceEditorModal
        open={!!editing}
        coursePlace={course.places.find((p) => p.uid === editing) ?? null}
        onClose={() => setEditing(null)}
        onChange={(patch) => editing && store.updateCoursePlace(course.id, editing, patch)}
        onRemove={() => {
          if (editing) {
            store.removePlaceFromCourse(course.id, editing)
            store.toast('장소를 삭제했어요')
          }
          setEditing(null)
        }}
      />
    </div>
  )
}
