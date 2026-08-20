import { useMemo, useRef, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseHasPlace } from '../lib/course'
import { PLACE_MAP } from '../data/places'
import { extractFromImage, matchPlaces, parseText } from '../lib/importParse'
import type { ImportCandidate } from '../lib/types'
import { AppBar, Checkbox, Empty, Modal, Thumb } from '../components/ui'

export default function ImportScreen({ courseId }: { courseId?: string }) {
  const store = useStore()
  const course = courseId ? store.getCourse(courseId) : store.draft
  const [tab, setTab] = useState<'saved' | 'import'>('saved')
  const [selected, setSelected] = useState<string[]>([])
  const [candidates, setCandidates] = useState<ImportCandidate[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [relinkFor, setRelinkFor] = useState<ImportCandidate | null>(null)
  const [relinkQuery, setRelinkQuery] = useState('')
  const [dupOpen, setDupOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const savedPlaces = store.savedPlaceIds.map((id) => PLACE_MAP[id]).filter(Boolean)

  const confirmedFromImport = useMemo(
    () => candidates.filter((c) => !c.excluded && c.placeId).map((c) => c.placeId as string),
    [candidates],
  )

  const chosen = useMemo(
    () => Array.from(new Set([...selected, ...confirmedFromImport])),
    [selected, confirmedFromImport],
  )

  const duplicates = useMemo(
    () => (course ? chosen.filter((id) => courseHasPlace(course, id)) : []),
    [chosen, course],
  )

  if (!course) {
    return (
      <div className="screen">
        <AppBar title="장소 불러오기" onBack={goBack} />
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

  const commit = () => {
    chosen.forEach((id) => store.addPlaceToCourse(course.id, id))
    store.toast(`${chosen.length}곳을 코스에 추가했어요`)
    navigate('/edit/' + course.id)
  }

  const onAdd = () => {
    if (chosen.length === 0) return
    if (duplicates.length > 0) {
      setDupOpen(true)
      return
    }
    commit()
  }

  const runText = () => {
    if (!text.trim()) {
      setError('붙여넣은 텍스트가 없어요.')
      return
    }
    setError('')
    const found = parseText(text)
    if (found.length === 0) {
      setError('텍스트에서 장소 후보를 찾지 못했어요. 한 줄에 한 장소씩 입력해보세요.')
      return
    }
    setCandidates((c) => [...c, ...found])
  }

  const runImage = async (file: File) => {
    setBusy(true)
    setError('')
    try {
      const found = await extractFromImage(file)
      setCandidates((c) => [...c, ...found])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="screen">
      <AppBar title="장소 불러오기" onBack={goBack} />

      <div className="tabs">
        <button className={tab === 'saved' ? 'on' : ''} onClick={() => setTab('saved')}>
          저장 장소
        </button>
        <button className={tab === 'import' ? 'on' : ''} onClick={() => setTab('import')}>
          이미지 · 텍스트
        </button>
      </div>

      <div className="scroll pad" style={{ paddingTop: 14 }}>
        {tab === 'saved' &&
          (savedPlaces.length === 0 ? (
            <Empty title="저장한 장소가 없어요" desc="장소 검색 결과에서 저장을 누르면 여기에 모여요." />
          ) : (
            <>
              <div className="between" style={{ marginBottom: 10 }}>
                <span className="tiny muted">{selected.length}개 선택</span>
                <button
                  className="btn xs"
                  onClick={() =>
                    setSelected(selected.length === savedPlaces.length ? [] : savedPlaces.map((p) => p.id))
                  }
                >
                  {selected.length === savedPlaces.length ? '선택 해제' : '전체 선택'}
                </button>
              </div>
              {savedPlaces.map((p) => {
                const on = selected.includes(p.id)
                return (
                  <div
                    className="card"
                    key={p.id}
                    style={{ padding: 12, borderColor: on ? 'var(--ink)' : undefined }}
                    onClick={() => setSelected((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                  >
                    <div className="list-item">
                      <Checkbox on={on} />
                      <Thumb />
                      <div className="body">
                        <div className="name truncate">{p.name}</div>
                        <div className="meta truncate">
                          {p.region} · {p.category}
                        </div>
                      </div>
                      {courseHasPlace(course, p.id) && <span className="pill">코스에 있음</span>}
                    </div>
                  </div>
                )
              })}
            </>
          ))}

        {tab === 'import' && (
          <>
            <div className="grid2">
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

            <label className="field" style={{ marginTop: 14 }}>
              <span className="label">장소 목록 텍스트</span>
              <textarea
                id="paste-area"
                className="textarea"
                placeholder={'연남동 브런치하우스\n망원 베이커리\n한강 나들목 산책로'}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <button className="btn block" onClick={runText} disabled={busy}>
              텍스트에서 장소 인식
            </button>

            {busy && <div className="banner" style={{ marginTop: 12 }}>이미지에서 장소명을 인식하는 중이에요…</div>}
            {error && <div className="banner alert" style={{ marginTop: 12 }}>{error}</div>}

            <div className="section-title">인식 결과 {candidates.length > 0 && `(${candidates.length})`}</div>
            {candidates.length === 0 ? (
              <div className="tiny muted">
                캡처 이미지를 올리거나 텍스트를 붙여넣으면 장소 후보가 여기에 표시돼요. 원본 이미지는 인식 후 보관하지 않아요.
              </div>
            ) : (
              candidates.map((c) => {
                const linked = c.placeId ? PLACE_MAP[c.placeId] : null
                return (
                  <div
                    className="card"
                    key={c.id}
                    style={{ padding: 12, opacity: c.excluded ? 0.5 : 1 }}
                  >
                    <div className="between" style={{ alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="small bold truncate">“{c.raw}”</div>
                        <div className="tiny muted" style={{ marginTop: 3 }}>
                          {c.status === 'matched' && linked && `→ ${linked.name} (${linked.region})`}
                          {c.status === 'ambiguous' && linked && `→ ${linked.name} · 인식이 불확실해요`}
                          {c.status === 'failed' && '인식 불확실 · 직접 검색해서 연결하세요'}
                        </div>
                      </div>
                      <div className="flexrow" style={{ gap: 6 }}>
                        <button
                          className="btn xs"
                          onClick={() => {
                            setRelinkFor(c)
                            setRelinkQuery(c.raw)
                          }}
                        >
                          {c.placeId ? '변경' : '연결'}
                        </button>
                        <button
                          className="btn xs"
                          onClick={() =>
                            setCandidates((list) =>
                              list.map((x) => (x.id === c.id ? { ...x, excluded: !x.excluded } : x)),
                            )
                          }
                        >
                          {c.excluded ? '되돌리기' : '제외'}
                        </button>
                      </div>
                    </div>
                    {c.status === 'ambiguous' && !c.excluded && (
                      <div className="banner alert" style={{ marginTop: 8 }}>
                        인식 결과가 확실하지 않아요. 연결된 장소가 맞는지 확인해주세요.
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </>
        )}
      </div>

      <div style={{ padding: '10px 14px calc(14px + var(--safe-b))', borderTop: '1px solid var(--border)', background: 'var(--canvas)' }}>
        <button className="btn primary block" disabled={chosen.length === 0} onClick={onAdd}>
          선택한 {chosen.length}곳 코스에 추가
        </button>
      </div>

      <Modal
        open={!!relinkFor}
        onClose={() => setRelinkFor(null)}
      >
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

      <Modal open={dupOpen} onClose={() => setDupOpen(false)} center>
        <div className="modal-title">이미 코스에 있는 장소가 있어요</div>
        <div className="small muted" style={{ marginBottom: 14 }}>
          {duplicates.map((id) => PLACE_MAP[id]?.name).join(', ')} · 그대로 추가하면 같은 장소가 두 번 들어가요.
        </div>
        <div className="row">
          <button className="btn" onClick={() => setDupOpen(false)}>
            취소
          </button>
          <button
            className="btn primary"
            onClick={() => {
              setDupOpen(false)
              commit()
            }}
          >
            그래도 추가
          </button>
        </div>
      </Modal>
    </div>
  )
}
