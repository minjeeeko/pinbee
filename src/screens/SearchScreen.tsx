import { useEffect, useMemo, useRef, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseHasPlace } from '../lib/course'
import { PLACES, CATEGORIES, PLACE_MAP, registerPlace } from '../data/places'
import { extractFromImage, matchPlaces, parseText, similarity } from '../lib/importParse'
import { geocodeAddress, geocodeResultToPlace } from '../lib/geocode'
import { searchLocalPlaces } from '../lib/localSearch'
import type { Category, ImportCandidate, Place } from '../lib/types'
import MapCanvas from '../components/MapCanvas'
import { AppBar, Empty, Modal, Thumb } from '../components/ui'
import { josa } from '../lib/text'

export default function SearchScreen({ courseId }: { courseId?: string }) {
  const store = useStore()
  const course = courseId ? store.getCourse(courseId) : store.draft
  const [mode, setMode] = useState<'search' | 'image'>('search')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Category | '전체'>('전체')
  const [dupTarget, setDupTarget] = useState<Place | null>(null)

  const [geoResults, setGeoResults] = useState<Place[]>([])
  const [geoLoading, setGeoLoading] = useState(false)

  const [candidates, setCandidates] = useState<ImportCandidate[]>([])
  const [pasteText, setPasteText] = useState('')
  const [busy, setBusy] = useState(false)
  const [importError, setImportError] = useState('')
  const [relinkFor, setRelinkFor] = useState<ImportCandidate | null>(null)
  const [relinkQuery, setRelinkQuery] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const query = q.trim()
    if (!query) return []
    return PLACES.filter((p) => (cat === '전체' ? true : p.category === cat))
      .map((p) => {
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

  // 내장 40곳에서 못 찾았을 수 있는 실제 상호명·주소를 두 API로 함께 찾아 보완한다.
  // - searchLocalPlaces: 상호명 검색(네이버 지역 검색) — "스타벅스 강남점"처럼 이름으로 찾을 때
  // - geocodeAddress: 주소 검색(NCP 지오코딩) — 지번·도로명 주소를 그대로 입력했을 때
  // 검색어를 잠깐 멈췄을 때만 요청해 타이핑 중 API를 과도하게 호출하지 않는다.
  useEffect(() => {
    const query = q.trim()
    if (mode !== 'search' || !query) {
      setGeoResults([])
      setGeoLoading(false)
      return
    }
    let cancelled = false
    setGeoLoading(true)
    const timer = setTimeout(() => {
      Promise.all([
        searchLocalPlaces(query).catch(() => [] as Place[]),
        geocodeAddress(query)
          .then((found) => found.slice(0, 5).map((r) => geocodeResultToPlace(r, query)))
          .catch(() => [] as Place[]),
      ])
        .then(([local, geocoded]) => {
          if (cancelled) return
          // 상호명 검색 결과를 우선하고, 좌표가 거의 같은(약 11m 이내) 주소 검색 결과는 중복이라 뺀다
          const merged = [...local]
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
  }, [q, mode])

  const candidatePlaces = candidates
    .filter((c) => !c.excluded && c.placeId)
    .map((c) => ({ candidate: c, place: PLACE_MAP[c.placeId as string] }))
    .filter((x): x is { candidate: ImportCandidate; place: Place } => !!x.place)
  const failedCandidates = candidates.filter((c) => !c.excluded && !c.placeId)

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

  const runText = () => {
    if (!pasteText.trim()) {
      setImportError('붙여넣은 텍스트가 없어요.')
      return
    }
    setImportError('')
    const found = parseText(pasteText)
    if (found.length === 0) {
      setImportError('텍스트에서 장소 후보를 찾지 못했어요. 한 줄에 한 장소씩 입력해보세요.')
      return
    }
    setCandidates((c) => [...c, ...found])
    setPasteText('')
  }

  const runImage = async (file: File) => {
    setBusy(true)
    setImportError('')
    try {
      const found = await extractFromImage(file)
      setCandidates((c) => [...c, ...found])
    } catch (e) {
      setImportError((e as Error).message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const resultCard = (place: Place, extra?: React.ReactNode) => {
    // 주소 검색(geocoding) 결과는 내장 40곳과 달리 PLACE_MAP에 없을 수 있어, 카드에 보이는 순간
    // 등록해둔다 — 코스 추가·저장 액션이 항상 PLACE_MAP[placeId]로 장소를 찾기 때문
    if (!PLACE_MAP[place.id]) registerPlace(place)
    const added = courseHasPlace(course, place.id)
    const isGeocoded = place.id.startsWith('p-geo-')
    return (
      <div className="card" key={place.id} style={{ padding: 12 }}>
        <div className="list-item">
          <Thumb size="lg" />
          <div className="body">
            <div className="name truncate">{place.name}</div>
            <div className="meta truncate">
              {place.category} · 좋아요 {place.likeCount}
            </div>
            {isGeocoded && <div className="tiny muted truncate">{place.address}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <button className={`btn xs${added ? '' : ' primary'}`} onClick={() => add(place)}>
              {added ? '추가됨' : '추가'}
            </button>
            <button
              className="btn xs"
              onClick={() => {
                store.toggleSavedPlace(place.id)
                store.toast(
                  store.savedPlaces.some((sp) => sp.placeId === place.id) ? '저장 장소에서 제외했어요' : '저장 장소에 담았어요',
                )
              }}
            >
              {store.savedPlaces.some((sp) => sp.placeId === place.id) ? '저장됨' : '저장'}
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
        <div className="searchbar" style={{ flex: 1 }}>
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setMode('search')
            }}
            placeholder="장소명 · 지역 · 주소 검색"
          />
          {q && (
            <button className="textbtn" onClick={() => setQ('')}>
              지우기
            </button>
          )}
        </div>
      </div>

      {mode === 'search' && q.trim() === '' && (
        <div className="scroll pad">
          <button className="btn block" onClick={() => setMode('image')}>
            이미지 붙여넣기
          </button>
          <div className="tiny muted" style={{ marginTop: 12, textAlign: 'center' }}>
            장소명이나 지역을 검색하거나, 캡처한 이미지를 붙여넣어 장소를 찾아보세요.
          </div>
        </div>
      )}

      {mode === 'search' && q.trim() !== '' && (
        <>
          <div className="chips" style={{ padding: '10px 20px' }}>
            {(['전체', ...CATEGORIES] as const).map((c) => (
              <button key={c} className={`chip sm${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', height: 168, margin: '0 20px', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <MapCanvas places={results.slice(0, 12)} showRoute={false} showNumbers={false} />
            <div style={{ position: 'absolute', left: 16, bottom: 16, zIndex: 3 }}>
              <span className="chip sm outline">검색 결과 {results.length}곳</span>
            </div>
          </div>

          <div className="scroll pad" style={{ marginTop: 12 }}>
            {results.length === 0 && geoResults.length === 0 && !geoLoading ? (
              <Empty
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

      {mode === 'image' && (
        <div className="scroll pad">
          <button className="textbtn" onClick={() => setMode('search')} style={{ marginBottom: 6 }}>
            검색으로 돌아가기
          </button>

          <div className="grid2" style={{ marginBottom: 14 }}>
            <button className="btn ghost" style={{ height: 76, flexDirection: 'column', gap: 2 }} onClick={() => fileRef.current?.click()}>
              <span>캡처 이미지</span>
              <span className="tiny muted">업로드</span>
            </button>
            <button
              className="btn ghost"
              style={{ height: 76, flexDirection: 'column', gap: 2 }}
              onClick={() => document.getElementById('paste-area')?.focus()}
            >
              <span>텍스트</span>
              <span className="tiny muted">붙여넣기</span>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) runImage(f)
            }}
          />

          <label className="field">
            <span className="label">장소 목록 텍스트</span>
            <textarea
              id="paste-area"
              className="textarea"
              placeholder={'연남동 브런치하우스\n망원 베이커리\n한강 나들목 산책로'}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
          </label>
          <button className="btn block" onClick={runText} disabled={busy}>
            텍스트에서 장소 인식
          </button>

          {busy && <div className="banner" style={{ marginTop: 12 }}>이미지에서 장소명을 인식하는 중이에요…</div>}
          {importError && (
            <div className="banner alert" style={{ marginTop: 12 }}>
              {importError}
            </div>
          )}

          {candidatePlaces.length === 0 && failedCandidates.length === 0 ? (
            <div className="tiny muted" style={{ marginTop: 16 }}>
              캡처 이미지를 올리거나 텍스트를 붙여넣으면 장소 후보가 지도와 함께 카드로 표시돼요. 원본 이미지는 인식 후 보관하지 않아요.
            </div>
          ) : (
            <>
              <div
                style={{
                  position: 'relative',
                  height: 168,
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  margin: '16px 0',
                }}
              >
                <MapCanvas places={candidatePlaces.map((c) => c.place)} showRoute={false} showNumbers={false} />
              </div>

              <div className="section-title">인식된 장소 {candidatePlaces.length}곳</div>
              {candidatePlaces.map(({ candidate, place }) =>
                resultCard(
                  place,
                  candidate.status === 'ambiguous' ? (
                    <div className="between" style={{ marginTop: 8 }}>
                      <span className="tiny muted">인식이 불확실해요 · “{candidate.raw}”</span>
                      <button
                        className="btn xs"
                        onClick={() => {
                          setRelinkFor(candidate)
                          setRelinkQuery(candidate.raw)
                        }}
                      >
                        연결 변경
                      </button>
                    </div>
                  ) : undefined,
                ),
              )}

              {failedCandidates.length > 0 && (
                <>
                  <div className="section-title">인식하지 못한 항목</div>
                  {failedCandidates.map((c) => (
                    <div className="card" key={c.id} style={{ padding: 12 }}>
                      <div className="between">
                        <span className="small truncate">“{c.raw}”</span>
                        <button
                          className="btn xs"
                          onClick={() => {
                            setRelinkFor(c)
                            setRelinkQuery(c.raw)
                          }}
                        >
                          직접 연결
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ padding: '10px 20px calc(14px + var(--safe-b))', borderTop: '1px solid var(--border)', background: 'var(--canvas)' }}>
        <div className="between">
          <span className="tiny muted">현재 코스 {course.places.length}곳</span>
          <button className="btn sm primary" onClick={() => navigate('/')}>
            내 코스로
          </button>
        </div>
      </div>

      <Modal open={!!relinkFor} onClose={() => setRelinkFor(null)}>
        <div className="modal-title">연결할 장소 선택</div>
        <div className="searchbar" style={{ marginBottom: 12 }}>
          <input value={relinkQuery} onChange={(e) => setRelinkQuery(e.target.value)} placeholder="장소명 검색" />
        </div>
        <div className="stack">
          {matchPlaces(relinkQuery, 6).map(({ place, score }) => (
            <div
              className="card tap"
              key={place.id}
              style={{ padding: 10 }}
              onClick={() => {
                setCandidates((list) =>
                  list.map((x) =>
                    x.id === relinkFor?.id ? { ...x, placeId: place.id, status: 'matched', excluded: false } : x,
                  ),
                )
                setRelinkFor(null)
              }}
            >
              <div className="list-item">
                <Thumb />
                <div className="body">
                  <div className="name truncate">{place.name}</div>
                  <div className="meta truncate">
                    {place.region} · {place.category}
                  </div>
                </div>
                <span className="pill">{Math.round(score * 100)}%</span>
              </div>
            </div>
          ))}
          {matchPlaces(relinkQuery, 6).length === 0 && (
            <div className="tiny muted">일치하는 장소가 없어요. 다른 검색어를 입력해보세요.</div>
          )}
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
