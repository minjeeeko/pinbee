import { useMemo, useState } from 'react'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { TRANSPORT_LABEL } from '../lib/geo'
import { THEMES } from '../data/seed'
import { REGIONS } from '../data/places'
import type { Transport } from '../lib/types'
import { CourseCard } from '../components/common'
import { Empty } from '../components/ui'

export default function ExploreScreen() {
  const store = useStore()
  const [q, setQ] = useState('')
  const [region, setRegion] = useState<string | null>(null)
  const [theme, setTheme] = useState<string | null>(null)
  const [transport, setTransport] = useState<Transport | null>(null)

  const results = useMemo(() => {
    const query = q.trim()
    return store.publicCourses.filter((c) => {
      const s = courseStats(c)
      if (query && !`${c.title} ${c.description} ${c.theme} ${s.regions.join(' ')}`.includes(query)) return false
      if (region && !s.regions.includes(region)) return false
      if (theme && c.theme !== theme) return false
      if (transport && !s.transports.includes(transport)) return false
      return true
    })
  }, [store.publicCourses, q, region, theme, transport])

  const reset = () => {
    setQ('')
    setRegion(null)
    setTheme(null)
    setTransport(null)
  }

  return (
    <div className="screen">
      <div className="appbar" style={{ paddingBottom: 0 }}>
        <h1 className="hero">탐색</h1>
      </div>

      <div className="appbar" style={{ paddingTop: 12 }}>
        <div className="searchbar" style={{ flex: 1 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="공개 코스 검색 · 코스명, 지역" />
          {q && (
            <button className="textbtn" onClick={() => setQ('')}>
              지우기
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <div className="chips" style={{ marginBottom: 6 }}>
          <span className="tiny muted chips-label">
            지역
          </span>
          {REGIONS.map((r) => (
            <button key={r} className={`chip sm${region === r ? ' on' : ''}`} onClick={() => setRegion(region === r ? null : r)}>
              {r}
            </button>
          ))}
        </div>
        <div className="chips" style={{ marginBottom: 6 }}>
          <span className="tiny muted chips-label">
            테마
          </span>
          {THEMES.map((t) => (
            <button key={t} className={`chip sm${theme === t ? ' on' : ''}`} onClick={() => setTheme(theme === t ? null : t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="chips">
          <span className="tiny muted chips-label">
            이동
          </span>
          {(['walk', 'transit', 'car'] as Transport[]).map((t) => (
            <button
              key={t}
              className={`chip sm${transport === t ? ' on' : ''}`}
              onClick={() => setTransport(transport === t ? null : t)}
            >
              {TRANSPORT_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll pad" style={{ marginTop: 14 }}>
        <div className="between" style={{ marginBottom: 10 }}>
          <span className="tiny muted">공개 코스 {results.length}개</span>
          {(region || theme || transport || q) && (
            <button className="btn xs" onClick={reset}>
              조건 초기화
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <Empty
            title="조건에 맞는 공개 코스가 없어요"
            desc="지역이나 테마 조건을 바꾸면 더 많은 코스를 볼 수 있어요."
            action={
              <button className="btn" onClick={reset}>
                조건 초기화
              </button>
            }
          />
        ) : (
          results.map((c) => <CourseCard key={c.id} course={c} onClick={() => navigate('/course/' + c.id)} />)
        )}
      </div>
    </div>
  )
}
