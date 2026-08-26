import { useMemo, useRef, useState } from 'react'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { PLACE_MAP } from '../data/places'
import MapCanvas from '../components/MapCanvas'
import { Empty } from '../components/ui'
import { CategoryIcon } from '../components/CategoryIcon'
import { PlaceEditorModal } from '../components/common'

export default function HomeScreen() {
  const store = useStore()
  const course = store.draft
  const [editing, setEditing] = useState<string | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const CARD_STEP = 162

  const scrollCards = (dir: 1 | -1) => {
    rowRef.current?.scrollBy({ left: dir * CARD_STEP, behavior: 'smooth' })
  }

  const stats = useMemo(
    () => (course ? courseStats(course, { realDriving: true }) : null),
    [course, store.directionsVersion],
  )

  if (!course || !stats) {
    return (
      <div className="screen">
        <div className="appbar">
          <span className="logo">routiz</span>
        </div>
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
      {/* 지도 — 남는 공간을 모두 채운다 */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
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
          <span className="logo">routiz</span>
          <button className="searchbar" style={{ flex: 1 }} onClick={() => navigate('/search/' + course.id)}>
            <span className="placeholder">장소·지역 검색</span>
          </button>
        </div>
      </div>

      {/* 하단 장소 카드 — 내용에 맞춘 고정 높이 패널 */}
      <div
        style={{
          flex: 'none',
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
          <>
            <div
              ref={rowRef}
              className="no-scrollbar"
              style={{
                height: 110,
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                padding: '0 20px 4px',
              }}
            >
              {course.places.map((cp) => {
                const place = PLACE_MAP[cp.placeId]
                return (
                  <div
                    key={cp.uid}
                    className="card tap"
                    style={{
                      flex: 'none',
                      width: 152,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                    onClick={() => setEditing(cp.uid)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                      <div className="name truncate" style={{ fontWeight: 700, fontSize: 14, lineHeight: '19px' }}>
                        {place?.name}
                      </div>
                      {place && <CategoryIcon category={place.category} size={17} />}
                    </div>
                    <div className="meta truncate" style={{ fontSize: 12 }}>{place?.category}</div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '6px 0 2px' }}>
              <button className="scroll-nav" onClick={() => scrollCards(-1)} aria-label="이전 카드">
                ‹
              </button>
              <button className="scroll-nav" onClick={() => scrollCards(1)} aria-label="다음 카드">
                ›
              </button>
            </div>
          </>
        )}

        {course.places.length > 0 && (
          <div style={{ padding: '10px 20px calc(14px + var(--safe-b))' }}>
            <button
              className="btn primary block"
              disabled={course.places.length < 2}
              onClick={() => navigate('/order/' + course.id)}
            >
              코스 만들기
            </button>
          </div>
        )}
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
