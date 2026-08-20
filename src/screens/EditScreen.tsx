import { useMemo, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { PLACE_MAP } from '../data/places'
import MapCanvas from '../components/MapCanvas'
import SortableList from '../components/SortableList'
import { AppBar, Empty, Thumb } from '../components/ui'
import { PlaceEditorModal } from '../components/common'
import type { CoursePlace } from '../lib/types'

export default function EditScreen({ courseId }: { courseId?: string }) {
  const store = useStore()
  const course = courseId ? store.getCourse(courseId) : store.draft
  const [editing, setEditing] = useState<string | null>(null)
  const stats = useMemo(() => (course ? courseStats(course) : null), [course])

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
        <div style={{ position: 'absolute', left: 16, bottom: 16, zIndex: 3 }}>
          <span className="chip sm outline">지도에 분포만 표시 · 순서 없음</span>
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
          <SortableList
            items={course.places}
            keyOf={(p: CoursePlace) => p.uid}
            onReorder={(next) => store.reorderCourse(course.id, next)}
            renderItem={(cp, i, handle) => {
              const place = PLACE_MAP[cp.placeId]
              return (
                <div className="card" style={{ padding: 12 }}>
                  <div className="list-item">
                    <span className="num">{i + 1}</span>
                    <div className="body" onClick={() => setEditing(cp.uid)}>
                      <div className="name truncate">{place?.name}</div>
                      <div className="meta truncate">
                        {place?.address.replace('서울 ', '')} · {place?.category}
                      </div>
                      <div className="flexrow" style={{ marginTop: 6, gap: 6 }}>
                        <span className="pill">{cp.memo ? '메모 있음' : '메모 없음'}</span>
                      </div>
                    </div>
                    <Thumb size="lg" />
                    <span {...handle}>순서</span>
                  </div>
                </div>
              )
            }}
          />
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
      />
    </div>
  )
}
