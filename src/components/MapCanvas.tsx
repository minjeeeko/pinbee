import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Leg, Place } from '../lib/types'
import { curvePath, fitProjection } from '../lib/geo'

interface Props {
  places: Place[]
  /** 순서선 표시 여부 (장소 추가 단계에서는 점만 표시) */
  showRoute?: boolean
  showNumbers?: boolean
  showLabels?: boolean
  activeIndex?: number | null
  legs?: Leg[]
  onSelect?: (index: number) => void
  /** 지도 배경 무늬 시드 */
  seed?: number
  /** 시트·카드에 가려지는 영역 (px) */
  insetTop?: number
  insetBottom?: number
  /** 지도 컨트롤의 상단 여백 (검색바 등과 겹치지 않도록) */
  toolsTop?: number
}

function mulberry(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 지도처럼 보이는 도로/블록 배경을 시드 기반으로 생성 */
function useBackdrop(w: number, h: number, seed: number) {
  return useMemo(() => {
    if (!w || !h) return { roads: [], blocks: [], water: '' }
    const rnd = mulberry(seed)
    const roads: { d: string; width: number }[] = []
    for (let i = 0; i < 7; i++) {
      const y = h * (0.08 + 0.13 * i) + rnd() * 26 - 13
      const bend = (rnd() - 0.5) * 90
      roads.push({ d: `M -40 ${y} Q ${w / 2} ${y + bend} ${w + 40} ${y + (rnd() - 0.5) * 50}`, width: rnd() > 0.7 ? 7 : 3.5 })
    }
    for (let i = 0; i < 6; i++) {
      const x = w * (0.1 + 0.16 * i) + rnd() * 22 - 11
      const bend = (rnd() - 0.5) * 80
      roads.push({ d: `M ${x} -40 Q ${x + bend} ${h / 2} ${x + (rnd() - 0.5) * 40} ${h + 40}`, width: rnd() > 0.75 ? 6 : 3 })
    }
    const blocks: { x: number; y: number; w: number; h: number; r: number }[] = []
    for (let i = 0; i < 26; i++) {
      const bw = 26 + rnd() * 62
      const bh = 22 + rnd() * 54
      blocks.push({ x: rnd() * (w - bw), y: rnd() * (h - bh), w: bw, h: bh, r: 3 + rnd() * 4 })
    }
    const wy = h * (0.62 + rnd() * 0.2)
    const water = `M -40 ${wy} Q ${w * 0.3} ${wy - 46} ${w * 0.6} ${wy + 10} T ${w + 40} ${wy - 18} L ${w + 40} ${h + 40} L -40 ${h + 40} Z`
    return { roads, blocks, water }
  }, [w, h, seed])
}

export default function MapCanvas({
  places,
  showRoute = true,
  showNumbers = true,
  showLabels = false,
  activeIndex = null,
  legs,
  onSelect,
  seed = 7,
  insetTop = 0,
  insetBottom = 0,
  toolsTop = 16,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // 장소 구성이 바뀌면 화면을 다시 맞춘다
  const key = places.map((p) => p.id).join(',')
  useEffect(() => setView({ x: 0, y: 0, k: 1 }), [key])

  const backdrop = useBackdrop(size.w, size.h, seed)
  const proj = useMemo(
    () => fitProjection(places, size.w || 320, size.h || 420, 56, { top: insetTop, bottom: insetBottom }),
    [places, size.w, size.h, insetTop, insetBottom],
  )
  const pts = useMemo(() => places.map((p) => proj.toXY(p)), [places, proj])
  const path = useMemo(() => (showRoute ? curvePath(pts) : ''), [pts, showRoute])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }, [view.x, view.y])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true
    setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }))
  }, [])

  const onPointerUp = useCallback(() => {
    drag.current = null
  }, [])

  const zoom = (factor: number) =>
    setView((v) => ({ ...v, k: Math.min(3.2, Math.max(0.6, v.k * factor)) }))

  // 서로 가까운 핀은 이름표를 생략해 겹침을 줄인다
  const labelVisible = useMemo(() => {
    const shown: { x: number; y: number }[] = []
    return pts.map((p) => {
      const clash = shown.some((s) => Math.abs(s.x - p.x) < 74 && Math.abs(s.y - p.y) < 26)
      if (!clash) shown.push(p)
      return !clash
    })
  }, [pts])

  const legLabel = (i: number) => {
    const l = legs?.[i]
    if (!l) return null
    return l.minutes === null ? '계산 불가' : `${l.minutes}분`
  }

  return (
    <div className="map" ref={ref}>
      <svg
        viewBox={`0 0 ${size.w || 320} ${size.h || 420}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <rect width="100%" height="100%" fill="var(--map-base)" />
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k}) `} style={{ transformOrigin: 'center' }}>
          <g opacity="0.75">
            {backdrop.blocks.map((b, i) => (
              <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={b.r} fill="var(--map-block)" />
            ))}
            {backdrop.water && <path d={backdrop.water} fill="var(--map-water)" />}
            {backdrop.roads.map((r, i) => (
              <path key={i} d={r.d} stroke="var(--map-road)" strokeWidth={r.width} fill="none" strokeLinecap="round" />
            ))}
          </g>

          {showRoute && path && (
            <>
              <path d={path} stroke="rgba(17,17,17,.12)" strokeWidth={11} fill="none" strokeLinecap="round" />
              <path
                d={path}
                stroke="var(--ink)"
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={legs?.some((l) => l.minutes === null) ? '14 8' : undefined}
              />
            </>
          )}

          {showRoute &&
            legs &&
            pts.slice(0, -1).map((p, i) => {
              const n = pts[i + 1]
              const label = legLabel(i)
              if (!label) return null
              const mx = (p.x + n.x) / 2
              const my = (p.y + n.y) / 2
              // 핀과 겹치는 위치의 구간 라벨은 생략
              if (pts.some((q) => Math.abs(q.x - mx) < 34 && Math.abs(q.y - my) < 22)) return null
              const w = label.length * 6.5 + 16
              return (
                <g key={`leg-${i}`} transform={`translate(${mx - w / 2} ${my - 10})`}>
                  <rect width={w} height={20} rx={10} fill="var(--canvas)" stroke="var(--border)" />
                  <text x={w / 2} y={14} textAnchor="middle" fontSize="11" fontWeight="500" fill="var(--fg)">
                    {label}
                  </text>
                </g>
              )
            })}

          {pts.map((p, i) => {
            const active = activeIndex === i
            const place = places[i]
            const r = showNumbers ? (active ? 17 : 14) : 9
            return (
              <g
                key={place.id + i}
                transform={`translate(${p.x} ${p.y})`}
                onClick={() => !drag.current?.moved && onSelect?.(i)}
                style={{ cursor: onSelect ? 'pointer' : 'default' }}
              >
                {active && <circle r={r + 5} fill="none" stroke="var(--ink)" strokeWidth="1" opacity="0.35" />}
                <circle r={r} fill="var(--ink)" stroke="var(--canvas)" strokeWidth="2" />
                {showNumbers && (
                  <text y="4.5" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#fff">
                    {i + 1}
                  </text>
                )}
                {showLabels && labelVisible[i] && (
                  <text className="pin-label" y={-r - 7} textAnchor="middle">
                    {place.name.length > 9 ? place.name.slice(0, 8) + '…' : place.name}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      <div className="map-tools" style={{ top: toolsTop }}>
        <button className="map-tool icon" onClick={() => zoom(1.3)} aria-label="확대">
          +
        </button>
        <button className="map-tool icon" onClick={() => zoom(1 / 1.3)} aria-label="축소">
          -
        </button>
        <button className="map-tool icon" onClick={() => setView({ x: 0, y: 0, k: 1 })} aria-label="전체 보기">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
            <ellipse cx="8" cy="8" rx="2.6" ry="6.5" stroke="currentColor" strokeWidth="1.3" />
            <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
      </div>
    </div>
  )
}
