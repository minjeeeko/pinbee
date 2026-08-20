import { useMemo, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseHasPlace } from '../lib/course'
import { PLACES, CATEGORIES } from '../data/places'
import { similarity } from '../lib/importParse'
import type { Category, Place } from '../lib/types'
import MapCanvas from '../components/MapCanvas'
import { AppBar, Empty, Modal, Thumb } from '../components/ui'
import { josa } from '../lib/text'

export default function SearchScreen({ courseId }: { courseId?: string }) {
  const store = useStore()
  const course = courseId ? store.getCourse(courseId) : store.draft
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Category | '전체'>('전체')
  const [dupTarget, setDupTarget] = useState<Place | null>(null)

  const results = useMemo(() => {
    const query = q.trim()
    return PLACES.filter((p) => (cat === '전체' ? true : p.category === cat))
      .map((p) => {
        if (!query) return { p, score: 1 }
        const hay = `${p.name} ${p.region} ${p.address} ${p.category}`
        const contains = hay.includes(query)
        const score = contains ? 1 : Math.max(similarity(query, p.name), similarity(query, p.region))
        return { p, score }
      })
      .filter((r) => r.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((r) => r.p)
  }, [q, cat])

  if (!course) {
    return (
      <div className="screen">
        <AppBar title="장소 검색" onBack={goBack} />
        <Empty
          icon="🗺"
          title="편집 중인 코스가 없어요"
          action={
            <button className="btn primary" onClick={() => navigate('/edit/' + store.startNewCourse())}>
              새 코스 만들기
            </button>
          }
        />
      </div>
    )
  }

  const add = (place: Place) => {
    if (courseHasPlace(course, place.id)) {
      setDupTarget(place)
      return
    }
    store.addPlaceToCourse(course.id, place.id)
    store.toast(`${place.name}${josa(place.name, '을', '를')} 코스에 추가했어요`)
  }

  return (
    <div className="screen">
      <div className="appbar">
        <button className="iconbtn" onClick={goBack} aria-label="뒤로">
          ‹
        </button>
        <div className="searchbar" style={{ flex: 1 }}>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="장소명 · 지역 · 주소 검색"
          />
          {q && (
            <button className="muted" onClick={() => setQ('')} aria-label="지우기">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="chips" style={{ padding: '0 14px 10px' }}>
        {(['전체', ...CATEGORIES] as const).map((c) => (
          <button key={c} className={`chip sm${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', height: 168, margin: '0 14px', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
        <MapCanvas places={results.slice(0, 12)} showRoute={false} showNumbers={false} seed={3} />
        <div style={{ position: 'absolute', left: 10, bottom: 10, zIndex: 3 }}>
          <span className="chip sm">검색 결과 {results.length}곳</span>
        </div>
      </div>

      <div className="scroll pad" style={{ marginTop: 12 }}>
        {results.length === 0 ? (
          <Empty
            icon="🔍"
            title="검색 결과가 없어요"
            desc="검색어의 철자를 확인하거나 카테고리 조건을 바꿔보세요."
            action={
              <button
                className="btn"
                onClick={() => {
                  setQ('')
                  setCat('전체')
                }}
              >
                조건 초기화
              </button>
            }
          />
        ) : (
          results.map((p) => {
            const added = courseHasPlace(course, p.id)
            return (
              <div className="card" key={p.id} style={{ padding: 12 }}>
                <div className="list-item">
                  <Thumb tone={p.tone} size="lg" />
                  <div className="body">
                    <div className="name truncate">{p.name}</div>
                    <div className="meta truncate">
                      {p.address.replace('서울 ', '')} · {p.category}
                    </div>
                    {p.desc && <div className="meta truncate">{p.desc}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <button className={`btn xs${added ? '' : ' primary'}`} onClick={() => add(p)}>
                      {added ? '추가됨' : '추가'}
                    </button>
                    <button
                      className="btn xs"
                      onClick={() => {
                        store.toggleSavedPlace(p.id)
                        store.toast(store.savedPlaceIds.includes(p.id) ? '저장 장소에서 제외했어요' : '저장 장소에 담았어요')
                      }}
                    >
                      {store.savedPlaceIds.includes(p.id) ? '★ 저장됨' : '☆ 저장'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div style={{ padding: '10px 14px calc(14px + var(--safe-b))', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
        <div className="between">
          <span className="tiny muted">현재 코스 {course.places.length}곳</span>
          <button className="btn sm primary" onClick={() => navigate('/edit/' + course.id)}>
            코스 편집으로
          </button>
        </div>
      </div>

      <Modal open={!!dupTarget} onClose={() => setDupTarget(null)} center>
        <div className="bold" style={{ fontSize: 16, marginBottom: 6 }}>
          이미 코스에 있는 장소입니다
        </div>
        <div className="small muted" style={{ marginBottom: 16 }}>
          {dupTarget?.name}
          {dupTarget ? josa(dupTarget.name, '을', '를') : ''} 한 번 더 추가할까요? 같은 장소를 두 번 방문하는 코스가 돼요.
        </div>
        <div className="row">
          <button className="btn" onClick={() => setDupTarget(null)}>
            취소
          </button>
          <button
            className="btn primary"
            onClick={() => {
              if (dupTarget) {
                store.addPlaceToCourse(course.id, dupTarget.id)
                store.toast('중복 장소를 추가했어요')
              }
              setDupTarget(null)
            }}
          >
            그래도 추가
          </button>
        </div>
      </Modal>
    </div>
  )
}
