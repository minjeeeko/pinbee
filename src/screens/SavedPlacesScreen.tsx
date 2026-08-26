import { useMemo, useState } from 'react'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseHasPlace } from '../lib/course'
import { PLACE_MAP, CATEGORIES, CATEGORY_COLOR } from '../data/places'
import MapCanvas from '../components/MapCanvas'
import { Empty, Modal, Thumb } from '../components/ui'
import { josa } from '../lib/text'
import type { Category } from '../lib/types'

export default function SavedPlacesScreen() {
  const store = useStore()
  const [cat, setCat] = useState<Category | '전체'>('전체')
  const [dupTarget, setDupTarget] = useState<string | null>(null)
  const [editingMemo, setEditingMemo] = useState<Set<string>>(new Set())
  const course = store.draft

  const toggleMemoEdit = (placeId: string) =>
    setEditingMemo((s) => {
      const next = new Set(s)
      if (next.has(placeId)) next.delete(placeId)
      else next.add(placeId)
      return next
    })

  const allSaved = useMemo(
    () =>
      store.savedPlaces
        .map((sp) => {
          const place = PLACE_MAP[sp.placeId]
          return place ? { place, memo: sp.memo } : null
        })
        .filter((x): x is { place: (typeof PLACE_MAP)[string]; memo: string } => x !== null),
    [store.savedPlaces],
  )
  const rows = allSaved.filter(({ place }) => (cat === '전체' ? true : place.category === cat))
  const places = rows.map((r) => r.place)

  const add = (placeId: string) => {
    if (!course) {
      store.toast('편집 중인 코스가 없어요')
      return
    }
    if (courseHasPlace(course, placeId)) {
      setDupTarget(placeId)
      return
    }
    store.addPlaceToCourse(course.id, placeId)
    store.toast('코스에 추가했어요')
  }

  return (
    <div className="screen">
      <div className="appbar">
        <div>
          <h1 className="hero logo">저장 장소</h1>
          <div className="sub">{store.savedPlaces.length}곳 저장됨</div>
        </div>
        <div className="spacer" />
        {course && course.places.length > 0 && (
          <button className="btn xs" onClick={() => navigate('/')}>
            담은 장소 {course.places.length}곳
          </button>
        )}
      </div>

      <div
        style={{
          position: 'relative',
          height: 190,
          margin: '0 20px',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        <MapCanvas places={places} showRoute={false} showNumbers={false} />
      </div>

      <div className="chips" style={{ padding: '14px 20px 8px' }}>
        {(['전체', ...CATEGORIES] as const).map((c) => (
          <button key={c} className={`chip sm${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
            {c !== '전체' && (
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: CATEGORY_COLOR[c],
                  marginRight: 5,
                }}
              />
            )}
            {c}
          </button>
        ))}
      </div>

      <div className="scroll pad" style={{ marginTop: 6 }}>
        {rows.length === 0 ? (
          <Empty
            title="저장한 장소가 없어요"
            desc="장소 검색 결과에서 저장을 누르면 여기에 모여요."
            action={
              <button className="btn primary" onClick={() => navigate('/search/' + (course?.id ?? ''))}>
                장소 검색하기
              </button>
            }
          />
        ) : (
          rows.map(({ place: p, memo }) => (
            <div className="card" key={p.id} style={{ padding: 12 }}>
              <div className="list-item">
                <Thumb size="lg" category={p.category} />
                <div className="body">
                  <div className="name truncate">{p.name}</div>
                  <div className="meta truncate">{p.category}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button className="btn xs primary" onClick={() => add(p.id)}>
                    코스에 추가
                  </button>
                  <button
                    className="btn xs"
                    onClick={() => {
                      store.toggleSavedPlace(p.id)
                      store.toast('저장 장소에서 제외했어요')
                    }}
                  >
                    저장 해제
                  </button>
                </div>
              </div>
              {editingMemo.has(p.id) ? (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    className="textarea"
                    style={{ minHeight: 44 }}
                    placeholder="메모를 남겨보세요"
                    autoFocus
                    value={memo}
                    onChange={(e) => store.setSavedPlaceMemo(p.id, e.target.value)}
                  />
                  <button
                    className="btn xs"
                    style={{ marginTop: 6 }}
                    onClick={() => toggleMemoEdit(p.id)}
                  >
                    완료
                  </button>
                </div>
              ) : memo ? (
                <button
                  className="tap"
                  style={{
                    marginTop: 10,
                    width: '100%',
                    textAlign: 'left',
                    background: 'var(--surface)',
                    border: 'none',
                    borderRadius: 'var(--r-card)',
                    padding: '8px 10px',
                  }}
                  onClick={() => toggleMemoEdit(p.id)}
                >
                  <div className="small truncate">{memo}</div>
                </button>
              ) : (
                <button
                  className="tap muted small"
                  style={{ marginTop: 10, background: 'none', border: 'none', padding: 0 }}
                  onClick={() => toggleMemoEdit(p.id)}
                >
                  메모 추가
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <Modal open={!!dupTarget} onClose={() => setDupTarget(null)} center>
        <div className="modal-title">이미 코스에 있는 장소입니다</div>
        <div className="small muted" style={{ marginBottom: 14 }}>
          {dupTarget && PLACE_MAP[dupTarget]?.name}
          {dupTarget ? josa(PLACE_MAP[dupTarget]?.name ?? '', '을', '를') : ''} 한 번 더 추가할까요?
        </div>
        <div className="row">
          <button className="btn" onClick={() => setDupTarget(null)}>
            취소
          </button>
          <button
            className="btn primary"
            onClick={() => {
              if (dupTarget && course) store.addPlaceToCourse(course.id, dupTarget)
              setDupTarget(null)
              store.toast('중복 장소를 추가했어요')
            }}
          >
            그래도 추가
          </button>
        </div>
      </Modal>
    </div>
  )
}
