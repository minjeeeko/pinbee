import { useMemo, useState } from 'react'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import MapCanvas from '../components/MapCanvas'
import { Empty } from '../components/ui'
import { PlaceEditorModal } from '../components/common'

export default function HomeScreen() {
  const store = useStore()
  const course = store.draft
  const [editing, setEditing] = useState<string | null>(null)

  const stats = useMemo(
    () => (course ? courseStats(course, { realDriving: true }) : null),
    [course, store.directionsVersion],
  )

  if (!course || !stats) {
    return (
      <div className="screen">
        <div className="appbar">
          <img
            src="https://zsvndzfbnlwdsdeyxarj.supabase.co/storage/v1/object/public/service/logo_1.png?v=2"
            alt="routiz"
            style={{ height: 44, width: 'auto', flexShrink: 0 }}
          />
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
          <div className="section-title" style={{ fontFamily: "'JejuStoneWall', 'Wanted Sans Variable', sans-serif" }}>
            내 코스
          </div>
          {store.myCourses.map((c) => (
            <div className="card tap between" key={c.id} onClick={() => navigate('/edit/' + c.id)}>
              <div style={{ minWidth: 0 }}>
                <div className="bold truncate">{c.title || '이름 없는 코스'}</div>
                <div className="tiny muted">{c.places.length}곳</div>
              </div>
              <button
                className="btn xs"
                onClick={(e) => {
                  e.stopPropagation()
                  store.deleteCourse(c.id)
                  store.toast('코스를 삭제했어요')
                }}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const places = stats.places
  const placeCount = course.places.length
  const hasPlaces = placeCount > 0

  return (
    <div className="screen">
      {/* 지도 — 화면을 항상 전체로 채운다. 담은 장소는 지도 위 아이콘+말풍선(이름표)으로 보여주고,
          누르면 장소 카드를 눌렀을 때와 같은 편집 모달이 하단에 뜬다 */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <MapCanvas
          places={places}
          showRoute={false}
          showNumbers={false}
          showLabels
          activeIndex={null}
          onSelect={(i) => setEditing(course.places[i]?.uid ?? null)}
          insetTop={70}
          insetBottom={72}
        />

        <div className="map-float" style={{ top: 14, left: 8, right: 12, gap: 6 }}>
          <img
            src="https://zsvndzfbnlwdsdeyxarj.supabase.co/storage/v1/object/public/service/logo_1.png?v=2"
            alt="routiz"
            style={{ height: 44, width: 'auto', flexShrink: 0 }}
          />
          <button className="searchbar" style={{ flex: 1 }} onClick={() => navigate('/search/' + course.id)}>
            <span className="placeholder">장소·지역 검색</span>
          </button>
        </div>

        {hasPlaces && (
          <div style={{ position: 'absolute', top: 70, left: 20 }}>
            <span className="pill">
              {course.saved && course.title ? `${course.title} · ` : ''}
              {placeCount}곳
            </span>
          </div>
        )}

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
          {placeCount < 2 ? (
            <button className="btn sm primary" onClick={() => navigate('/search/' + course.id)}>
              장소 추가하기
            </button>
          ) : (
            <>
              <button className="btn sm" onClick={() => navigate('/search/' + course.id)}>
                장소 추가
              </button>
              <button className="btn sm primary" onClick={() => navigate('/order/' + course.id)}>
                코스 만들기
              </button>
            </>
          )}
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
