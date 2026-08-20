import { useMemo, useState } from 'react'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseHasPlace } from '../lib/course'
import { PLACE_MAP, CATEGORIES } from '../data/places'
import MapCanvas from '../components/MapCanvas'
import { Empty, Modal, Thumb } from '../components/ui'
import { josa } from '../lib/text'
import type { Category } from '../lib/types'

export default function SavedPlacesScreen() {
  const store = useStore()
  const [cat, setCat] = useState<Category | '전체'>('전체')
  const [dupTarget, setDupTarget] = useState<string | null>(null)
  const course = store.draft

  const allSaved = useMemo(
    () => store.savedPlaceIds.map((id) => PLACE_MAP[id]).filter(Boolean),
    [store.savedPlaceIds],
  )
  const places = allSaved.filter((p) => (cat === '전체' ? true : p.category === cat))

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
          <h1 className="hero">저장 장소</h1>
          <div className="sub">{store.savedPlaceIds.length}곳 저장됨</div>
        </div>
        <div className="spacer" />
        <button className="btn xs" onClick={() => navigate('/import/' + (course?.id ?? ''))}>
          불러오기
        </button>
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
        <MapCanvas places={places} showRoute={false} showNumbers={false} seed={17} />
        <div style={{ position: 'absolute', left: 16, bottom: 16, zIndex: 3 }}>
          <span className="chip sm outline">{places.length}곳 표시 중</span>
        </div>
      </div>

      <div className="chips" style={{ padding: '14px 20px 8px' }}>
        {(['전체', ...CATEGORIES] as const).map((c) => (
          <button key={c} className={`chip sm${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="scroll pad" style={{ marginTop: 6 }}>
        {places.length === 0 ? (
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
          places.map((p) => (
            <div className="card" key={p.id} style={{ padding: 12 }}>
              <div className="list-item">
                <Thumb size="lg" />
                <div className="body">
                  <div className="name truncate">{p.name}</div>
                  <div className="meta truncate">
                    {p.category} · 좋아요 {p.likeCount}
                  </div>
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
