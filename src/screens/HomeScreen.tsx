import { useMemo, useState } from 'react'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { fmtDuration } from '../lib/schedule'
import { PLACE_MAP } from '../data/places'
import MapCanvas from '../components/MapCanvas'
import BottomSheet from '../components/BottomSheet'
import SortableList from '../components/SortableList'
import { Empty, Modal, Thumb } from '../components/ui'
import { LegRow, PlaceEditorModal } from '../components/common'
import type { CoursePlace } from '../lib/types'

export default function HomeScreen() {
  const store = useStore()
  const course = store.draft
  const [showRoute, setShowRoute] = useState(true)
  const [showTimes, setShowTimes] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
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
          showRoute={showRoute}
          legs={showTimes ? stats.legs : undefined}
          activeIndex={null}
          onSelect={(i) => setEditing(course.places[i]?.uid ?? null)}
          seed={11}
          insetTop={70}
          toolsTop={72}
          insetBottom={Math.round(window.innerHeight * sheetFraction)}
        />

        <div className="map-float" style={{ top: 10 }}>
          <button className="searchbar" style={{ flex: 1 }} onClick={() => navigate('/search/' + course.id)}>
            <span className="placeholder">장소·지역 검색</span>
          </button>
          <button className="btn sm primary" style={{ flex: 'none' }} onClick={() => setAddOpen(true)}>
            추가
          </button>
        </div>

        <div className="map-float" style={{ bottom: 12, right: 'auto' }}>
          <button className={`chip sm${showRoute ? ' on' : ' outline'}`} onClick={() => setShowRoute((v) => !v)}>
            동선 보기
          </button>
          <button className={`chip sm${showTimes ? ' on' : ' outline'}`} onClick={() => setShowTimes((v) => !v)}>
            구간 시간
          </button>
        </div>

        <BottomSheet
          snaps={[0.44, 0.86]}
          onSnapChange={setSheetFraction}
          header={
            <div style={{ padding: '2px 16px 8px' }}>
              <div className="between">
                <div style={{ minWidth: 0 }}>
                  <div className="bold truncate" style={{ fontSize: 17, lineHeight: '27px' }}>
                    {course.title || '이름 없는 코스'}
                  </div>
                  <div className="tiny muted">
                    {course.places.length}곳 · 이동 {fmtDuration(stats.travel)} · 총 {fmtDuration(stats.total)}
                  </div>
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
                <button className="btn primary" onClick={() => navigate('/search/' + course.id)}>
                  장소 검색하기
                </button>
              }
            />
          ) : (
            <>
              {stats.uncomputable.length > 0 && (
                <div className="banner alert" style={{ marginBottom: 10 }}>
                  <div className="t">경로를 계산할 수 없는 구간이 {stats.uncomputable.length}개 있어요</div>
                  구간의 이동수단을 바꾸면 다시 계산할 수 있어요.
                </div>
              )}
              <SortableList
                items={course.places}
                keyOf={(p: CoursePlace) => p.uid}
                onReorder={(next) => {
                  store.reorderCourse(course.id, next)
                  store.toast('방문 순서를 변경했어요')
                }}
                renderItem={(cp, i, handle) => {
                  const place = PLACE_MAP[cp.placeId]
                  const leg = stats.legs[i]
                  return (
                    <div>
                      <div className="card" style={{ padding: 12 }}>
                        <div className="list-item">
                          <span className="num">{i + 1}</span>
                          <div className="body" onClick={() => setEditing(cp.uid)}>
                            <div className="name truncate">{place?.name}</div>
                            <div className="meta truncate">
                              {place?.category} · 체류 {fmtDuration(cp.stayMinutes)}
                              {cp.memo ? ` · 메모 있음` : ''}
                            </div>
                          </div>
                          <Thumb />
                          <span {...handle}>순서</span>
                        </div>
                      </div>
                      {leg && (
                        <LegRow
                          leg={leg}
                          onChangeTransport={(t) => store.setLegTransport(course.id, i, t)}
                        />
                      )}
                    </div>
                  )
                }}
              />

              <div className="row" style={{ marginTop: 16 }}>
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
                카드를 드래그하면 방문 순서를 바꿀 수 있어요
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

      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <div className="modal-title">장소 추가</div>
        <div className="stack">
          <button
            className="btn block"
            onClick={() => {
              setAddOpen(false)
              navigate('/search/' + course.id)
            }}
          >
            장소 검색으로 추가
          </button>
          <button
            className="btn block"
            onClick={() => {
              setAddOpen(false)
              navigate('/import/' + course.id)
            }}
          >
            저장 장소·이미지·텍스트 불러오기
          </button>
          <button
            className="btn block"
            onClick={() => {
              setAddOpen(false)
              navigate('/prefs/' + course.id)
            }}
          >
            선호 조건으로 코스 점검
          </button>
        </div>
      </Modal>

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
                <div className="bold truncate">{c.title || '이름 없는 코스'}</div>
                <span className={`pill${c.visibility === 'public' ? ' dark' : ''}`}>
                  {c.visibility === 'public' ? '공개' : '비공개'}
                </span>
              </div>
              <div className="tiny muted">{c.places.length}곳 · {fmtDuration(courseStats(c).total)}</div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
