import { useMemo, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { PLACE_MAP } from '../data/places'
import MapCanvas from '../components/MapCanvas'
import { AppBar, Empty, Thumb } from '../components/ui'
import { PlaceEditorModal } from '../components/common'

export default function EditScreen({ courseId }: { courseId?: string }) {
  const store = useStore()
  const course = courseId ? store.getCourse(courseId) : store.draft
  const [editing, setEditing] = useState<string | null>(null)
  const stats = useMemo(
    () => (course ? courseStats(course, { realDriving: true }) : null),
    [course, store.directionsVersion],
  )

  if (!course || !stats) {
    return (
      <div className="screen">
        <AppBar title="코스 편집" onBack={goBack} />
        <Empty title="코스를 찾을 수 없어요" />
      </div>
    )
  }

  return (
    <div className="screen">
      <AppBar
        title="코스 편집"
        onBack={goBack}
        logo
        right={
          <button className="textbtn strong" onClick={() => navigate('/save/' + course.id)}>
            저장
          </button>
        }
      />

      <div style={{ position: 'relative', height: '38%', minHeight: 190, margin: '0 20px', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <MapCanvas places={stats.places} showRoute={false} showNumbers={false} showLabels seed={5} />
        <div style={{ position: 'absolute', left: 16, top: 16, zIndex: 3 }}>
          <span className="chip sm on">추가한 장소 {course.places.length}곳</span>
        </div>
      </div>

      <div className="scroll pad" style={{ marginTop: 12 }}>
        <div className="tiny muted" style={{ marginBottom: 10 }}>
          코스에 담긴 장소
        </div>

        {course.places.length === 0 ? (
          <Empty
            title="장소를 추가해 코스를 시작하세요"
            action={
              <button className="btn primary" onClick={() => navigate('/search/' + course.id)}>
                장소 검색
              </button>
            }
          />
        ) : (
          <div>
            {course.places.map((cp, i) => {
              const place = PLACE_MAP[cp.placeId]
              const isLast = i === course.places.length - 1
              return (
                <div key={cp.uid} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flex: 'none' }}>
                    <span className="num">{i + 1}</span>
                    {!isLast && <div style={{ flex: 1, width: 1, minHeight: 20, background: 'var(--border)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 16 }}>
                    <div className="card tap" style={{ padding: 12, border: 'none' }} onClick={() => setEditing(cp.uid)}>
                      <div className="list-item">
                        <div className="body">
                          <div className="name truncate">{place?.name}</div>
                          <div className="meta truncate">
                            {place?.address.replace('서울 ', '')} · {place?.category}
                          </div>
                          {cp.memo && (
                            <div className="tiny muted truncate" style={{ marginTop: 6 }}>
                              {cp.memo}
                            </div>
                          )}
                        </div>
                        <Thumb size="lg" category={place?.category} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button className="btn ghost block" style={{ marginTop: 12 }} onClick={() => navigate('/search/' + course.id)}>
          장소 추가
        </button>

        <button
          className="btn primary block"
          style={{ marginTop: 14 }}
          disabled={course.places.length < 2}
          onClick={() => navigate('/order/' + course.id)}
        >
          순서 정하기
        </button>
        {course.places.length < 2 && (
          <div className="tiny muted" style={{ textAlign: 'center', marginTop: 8 }}>
            장소를 2곳 이상 추가하면 순서를 정할 수 있어요
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
        onCategoryChange={(category) => {
          const placeId = course.places.find((p) => p.uid === editing)?.placeId
          if (placeId) store.setPlaceCategory(placeId, category)
        }}
      />
    </div>
  )
}
