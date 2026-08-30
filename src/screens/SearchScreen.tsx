import { useEffect, useMemo, useRef, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseHasPlace } from '../lib/course'
import { PLACES, CATEGORIES, PLACE_MAP, CATEGORY_COLOR, registerPlace } from '../data/places'
import { nameMatchScore, similarity } from '../lib/importParse'
import { geocodeAddress, geocodeResultToPlace } from '../lib/geocode'
import { searchLocalPlaces } from '../lib/localSearch'
import type { Category, Place } from '../lib/types'
import MapCanvas from '../components/MapCanvas'
import { AppBar, Empty, Modal, Thumb } from '../components/ui'
import { josa } from '../lib/text'

export default function SearchScreen({ courseId }: { courseId?: string }) {
  const store = useStore()
  const course = courseId ? store.getCourse(courseId) : store.draft
  const [q, setQ] = useState('')
  const [dupTarget, setDupTarget] = useState<Place | null>(null)

  const [geoResults, setGeoResults] = useState<Place[]>([])
  const [geoLoading, setGeoLoading] = useState(false)
  const [categoryPickFor, setCategoryPickFor] = useState<Place | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const query = q.trim()
    if (!query) return []
    return PLACES.map((p) => {
        const hay = `${p.name} ${p.region} ${p.address} ${p.category}`
        const contains = hay.includes(query)
        const score = contains ? 1 : Math.max(similarity(query, p.name), similarity(query, p.region))
        return { p, score }
      })
      .filter((r) => r.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((r) => r.p)
  }, [q])

  // 내장 40곳에서 못 찾았을 수 있는 실제 상호명·주소를 두 API로 함께 찾아 보완한다.
  // - searchLocalPlaces: 상호명 검색(네이버 지역 검색) — "스타벅스 강남점"처럼 이름으로 찾을 때
  // - geocodeAddress: 주소 검색(NCP 지오코딩) — 지번·도로명 주소를 그대로 입력했을 때
  // 검색어를 잠깐 멈췄을 때만 요청해 타이핑 중 API를 과도하게 호출하지 않는다.
  useEffect(() => {
    const query = q.trim()
    if (!query) {
      setGeoResults([])
      setGeoLoading(false)
      return
    }
    let cancelled = false
    setGeoLoading(true)
    const timer = setTimeout(() => {
      inputRef.current?.blur()
      Promise.all([
        searchLocalPlaces(query).catch(() => [] as Place[]),
        geocodeAddress(query)
          .then((found) => found.slice(0, 5).map((r) => geocodeResultToPlace(r, query)))
          .catch(() => [] as Place[]),
      ])
        .then(([local, geocoded]) => {
          if (cancelled) return
          // 네이버가 준 순서를 그대로 믿지 않고, 검색어가 상호명과 얼마나 정확히 맞는지로 다시
          // 정렬한다 — 그래야 "야키토리 시오"처럼 검색어가 뒤쪽 단어인 곳도, 검색어로 시작하기만
          // 하는 다른 상호명들보다 먼저 뜬다.
          const rankedLocal = [...local].sort((a, b) => nameMatchScore(query, b.name) - nameMatchScore(query, a.name))
          // 상호명 검색 결과를 우선하고, 좌표가 거의 같은(약 11m 이내) 주소 검색 결과는 중복이라 뺀다
          const merged = [...rankedLocal]
          for (const g of geocoded) {
            const isDup = merged.some((m) => Math.abs(m.lat - g.lat) < 0.0001 && Math.abs(m.lng - g.lng) < 0.0001)
            if (!isDup) merged.push(g)
          }
          setGeoResults(merged.slice(0, 8))
        })
        .catch(() => {
          if (!cancelled) setGeoResults([])
        })
        .finally(() => {
          if (!cancelled) setGeoLoading(false)
        })
    }, 450)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [q])

  // 지도 미리보기: 이미 코스에 담은 장소는 계속 남아있고(누적), 지금 검색 중인 결과도 함께 보여줘서
  // 검색해서 찾은 장소가 어디인지 바로 지도에서 확인하고(자동으로 그 위치로 이동) 담을 수 있게 한다.
  const searchMapPlaces = useMemo(() => {
    const addedPlaces = (course?.places ?? []).map((cp) => PLACE_MAP[cp.placeId]).filter((p): p is Place => !!p)
    const seen = new Set(addedPlaces.map((p) => p.id))
    const merged = [...addedPlaces]
    for (const p of [...results.slice(0, 12), ...geoResults]) {
      if (!seen.has(p.id)) {
        merged.push(p)
        seen.add(p.id)
      }
    }
    return merged
  }, [course?.places, results, geoResults])

  if (!course) {
    return (
      <div className="screen">
        <AppBar title="장소 검색" onBack={goBack} />
        <Empty
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

  const saveOrPick = (place: Place) => {
    const already = store.savedPlaces.some((sp) => sp.placeId === place.id)
    if (already) {
      store.toggleSavedPlace(place.id)
      store.toast('저장 장소에서 제외했어요')
      return
    }
    // 상호명 검색·지오코딩으로 찾은 장소는 카테고리가 추정값이거나 정보가 없어서, 저장하는
    // 순간 사용자가 직접 7개 카테고리 중 하나로 확정 짓게 한다. 내장 40곳은 이미 정확해서 바로 저장한다.
    if (place.id.startsWith('p-geo-')) {
      setCategoryPickFor(place)
      return
    }
    store.toggleSavedPlace(place.id)
    store.toast('저장 장소에 담았어요')
  }

  const confirmSaveWithCategory = (category: Category) => {
    if (!categoryPickFor) return
    const updated = { ...categoryPickFor, category }
    registerPlace(updated)
    store.toggleSavedPlace(updated.id)
    store.toast('저장 장소에 담았어요')
    setCategoryPickFor(null)
  }

  // 주소·상호명 검색으로 찾은 장소는 이름이 검색어 그대로거나(주소 입력) 네이버가 준 표기라
  // 원하는 상호명과 다를 수 있어, 담기 전에 직접 이름을 바꿀 수 있게 한다.
  const confirmRename = (place: Place) => {
    const name = renameValue.trim()
    if (name && name !== place.name) {
      const updated = { ...place, name }
      registerPlace(updated)
      setGeoResults((list) => list.map((p) => (p.id === place.id ? updated : p)))
    }
    setRenamingId(null)
  }

  const resultCard = (place: Place, extra?: React.ReactNode) => {
    // 주소 검색(geocoding) 결과는 내장 40곳과 달리 PLACE_MAP에 없을 수 있어, 카드에 보이는 순간
    // 등록해둔다 — 코스 추가·저장 액션이 항상 PLACE_MAP[placeId]로 장소를 찾기 때문
    if (!PLACE_MAP[place.id]) registerPlace(place)
    const added = courseHasPlace(course, place.id)
    const isGeocoded = place.id.startsWith('p-geo-')
    const saved = store.savedPlaces.some((sp) => sp.placeId === place.id)
    // 아직 저장 안 한 상태에서는(저장 전엔 우리 7개 카테고리로 확정되지 않았으니) 네이버가 준
    // 원본 업종 문자열을 그대로 보여준다. 저장된 뒤에는 사용자가 고른(또는 내장) 카테고리를 보여준다.
    const categoryLabel = !saved && place.sourceCategory ? place.sourceCategory : place.category
    return (
      <div className="card" key={place.id} style={{ padding: 12 }}>
        <div className="list-item">
          <Thumb size="lg" category={place.category} />
          <div className="body">
            {isGeocoded && renamingId === place.id ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="input"
                  style={{ height: 32, fontSize: 13, flex: 1, minWidth: 0 }}
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmRename(place)}
                  placeholder="상호명 입력"
                />
                <button className="btn xs primary" style={{ flex: 'none' }} onClick={() => confirmRename(place)}>
                  완료
                </button>
              </div>
            ) : (
              <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="truncate" style={{ minWidth: 0 }}>
                  {place.name}
                </span>
                {isGeocoded && (
                  <button
                    className="textbtn"
                    style={{ fontSize: 11, flexShrink: 0 }}
                    onClick={() => {
                      setRenamingId(place.id)
                      setRenameValue(place.name)
                    }}
                  >
                    상호명 수정
                  </button>
                )}
              </div>
            )}
            <div className="meta truncate">{categoryLabel}</div>
            {isGeocoded && <div className="tiny muted truncate">{place.address}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <button className={`btn xs${added ? '' : ' primary'}`} onClick={() => add(place)}>
              {added ? '추가됨' : '추가'}
            </button>
            <button className="btn xs" onClick={() => saveOrPick(place)}>
              {saved ? '저장됨' : '저장'}
            </button>
          </div>
        </div>
        {extra}
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="appbar">
        <button className="textbtn" onClick={goBack}>
          뒤로
        </button>
        <div className="searchbar" style={{ flex: 1, minWidth: 0 }}>
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="장소명 · 지역 · 주소 검색"
          />
          {q && (
            <button className="textbtn" onClick={() => setQ('')}>
              지우기
            </button>
          )}
        </div>
      </div>

      {q.trim() === '' && (
        <div className="scroll pad">
          <div className="tiny muted" style={{ textAlign: 'center' }}>
            장소명이나 지역을 검색해보세요.
          </div>
        </div>
      )}

      {q.trim() !== '' && (
        <>
          <div style={{ position: 'relative', height: 168, margin: '0 20px', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <MapCanvas places={searchMapPlaces} showRoute={false} showNumbers={false} />
          </div>

          <div className="scroll pad" style={{ marginTop: 12 }}>
            {results.length === 0 && geoResults.length === 0 && !geoLoading ? (
              <Empty
                title="검색 결과가 없어요"
                desc="검색어의 철자를 확인하거나 카테고리 조건을 바꿔보세요."
                action={
                  <button className="btn" onClick={() => setQ('')}>
                    조건 초기화
                  </button>
                }
              />
            ) : (
              results.map((p) => resultCard(p))
            )}

            {geoLoading && <div className="tiny muted" style={{ marginTop: 16 }}>상호명·주소로 찾는 중…</div>}
            {geoResults.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 16 }}>
                  실제 장소·주소 검색 결과
                </div>
                {geoResults.map((p) => resultCard(p))}
              </>
            )}
          </div>
        </>
      )}

      <div style={{ padding: '10px 20px calc(14px + var(--safe-b))', borderTop: '1px solid var(--border)', background: 'var(--canvas)' }}>
        <div className="between">
          <span className="tiny muted">현재 코스 {course.places.length}곳</span>
          <button className="btn sm primary" onClick={() => navigate('/')}>
            내 코스로
          </button>
        </div>
      </div>

      <Modal open={!!categoryPickFor} onClose={() => setCategoryPickFor(null)} center>
        <div className="modal-title">어떤 카테고리인가요?</div>
        <div className="small muted" style={{ marginBottom: 16 }}>
          {categoryPickFor?.name}
          {categoryPickFor ? josa(categoryPickFor.name, '을', '를') : ''} 저장 장소에 담으려면 카테고리를 골라주세요.
        </div>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button key={c} className="chip sm" onClick={() => confirmSaveWithCategory(c)}>
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
              {c}
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={!!dupTarget} onClose={() => setDupTarget(null)} center>
        <div className="modal-title">이미 코스에 있는 장소입니다</div>
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
