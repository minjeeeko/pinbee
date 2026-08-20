import { useMemo, useState } from 'react'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { haversineKm } from '../lib/geo'
import { PLACE_MAP } from '../data/places'
import MapCanvas from '../components/MapCanvas'
import BottomSheet from '../components/BottomSheet'
import { Empty, Modal, Thumb } from '../components/ui'
import { PlaceEditorModal } from '../components/common'

export default function HomeScreen({ onSheetExpand }: { onSheetExpand?: (expanded: boolean) => void }) {
  const store = useStore()
  const course = store.draft
  const [editing, setEditing] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sheetFraction, setSheetFraction] = useState(0.44)

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
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <MapCanvas
          places={places}
          showRoute={false}
          showNumbers={false}
          activeIndex={null}
          onSelect={(i) => setEditing(course.places[i]?.uid ?? null)}
          seed={11}
          insetTop={70}
          insetBottom={Math.round(window.innerHeight * sheetFraction)}
        />

        <div className="map-float" style={{ top: 10 }}>
          <button className="searchbar" style={{ flex: 1 }} onClick={() => navigate('/search/' + course.id)}>
            <span className="placeholder">장소·지역 검색</span>
          </button>
        </div>

        <BottomSheet
          snaps={[0.44, 0.86]}
          onSnapChange={(f) => {
            setSheetFraction(f)
            onSheetExpand?.(f > 0.5)
          }}
          header={
            <div style={{ padding: '2px 16px 8px' }}>
              <div className="between">
                <div style={{ minWidth: 0 }}>
                  {course.saved && course.title && (
                    <div className="bold truncate" style={{ fontSize: 17, lineHeight: '27px' }}>
                      {course.title}
                    </div>
                  )}
                  <div className="tiny muted">{course.places.length}곳</div>
                </div>
                <button className="btn xs" onClick={() => setPickerOpen(true)}>
                  코스 전환
                </button>
              </div>
            </div>
          }
        >
          {course.places.length === 0 ? (
            <Empty
              title="아직 추가한 장소가 없어요"
              desc="검색하거나 저장 장소에서 불러와 코스를 시작하세요."
              action={
                <div className="stack">
                  <button className="btn primary" onClick={() => navigate('/search/' + course.id)}>
                    장소 검색하기
                  </button>
                  <button className="btn" onClick={() => navigate('/import/' + course.id)}>
                    불러오기
                  </button>
                </div>
              }
            />
          ) : (
            <>
              {course.places.map((cp, i) => {
                const place = PLACE_MAP[cp.placeId]
                const next = course.places[i + 1]
                const nextPlace = next ? PLACE_MAP[next.placeId] : null
                return (
                  <div key={cp.uid}>
                    <div className="card tap" style={{ padding: 12 }} onClick={() => setEditing(cp.uid)}>
                      <div className="list-item">
                        <div className="body">
                          <div className="name truncate">{place?.name}</div>
                          <div className="meta truncate">
                            {place?.category} · 좋아요 {place?.likeCount ?? 0}
                          </div>
                        </div>
                        <Thumb />
                      </div>
                    </div>
                    {nextPlace && place && (
                      <div className="leg-distance">{haversineKm(place, nextPlace).toFixed(1)}km</div>
                    )}
                  </div>
                )
              })}

              <button
                className="btn ghost block"
                style={{ marginTop: 16 }}
                onClick={() => navigate('/import/' + course.id)}
              >
                불러오기
              </button>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn" onClick={() => navigate('/order/' + course.id)}>
                  순서 정하기
                </button>
                <button className="btn" onClick={() => navigate('/summary/' + course.id)}>
                  동선 요약
                </button>
              </div>
              <button className="btn primary block" style={{ marginTop: 10 }} onClick={() => navigate('/save/' + course.id)}>
                코스 저장
              </button>
              <div className="tiny muted" style={{ textAlign: 'center', marginTop: 10 }}>
                순서 정하기에서 방문 순서와 동선을 정할 수 있어요
              </div>
            </>
          )}
        </BottomSheet>
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

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <div className="between" style={{ marginBottom: 12 }}>
          <div className="modal-title" style={{ marginBottom: 0 }}>
            내 코스
          </div>
          <button
            className="btn xs primary"
            onClick={() => {
              const id = store.startNewCourse()
              setPickerOpen(false)
              navigate('/edit/' + id)
            }}
          >
            새 코스
          </button>
        </div>
        <div className="stack">
          {store.myCourses.map((c) => (
            <div
              key={c.id}
              className={`card tap${c.id === course.id ? ' selected' : ''}`}
              onClick={() => {
                store.setDraftId(c.id)
                setPickerOpen(false)
              }}
            >
              <div className="between">
                <div className="bold truncate">{c.saved && c.title ? c.title : '이름 없는 코스'}</div>
                <span className={`pill${c.visibility === 'public' ? ' dark' : ''}`}>
                  {c.visibility === 'public' ? '공개' : '비공개'}
                </span>
              </div>
              <div className="tiny muted">
                {c.places.length}곳
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
