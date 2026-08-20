import { useEffect, useRef, useState } from 'react'
import type { Leg, Place } from '../lib/types'
import { loadNaverMaps, onNaverMapAuthFail } from '../lib/naverMaps'

interface Props {
  places: Place[]
  /** 순서선 표시 여부 (장소 추가 단계에서는 점만 표시) */
  showRoute?: boolean
  showNumbers?: boolean
  showLabels?: boolean
  activeIndex?: number | null
  legs?: Leg[]
  onSelect?: (index: number) => void
  /** @deprecated 실제 지도로 전환하며 더 이상 쓰이지 않음 */
  seed?: number
  /** 시트·카드에 가려지는 영역 (px) */
  insetTop?: number
  insetBottom?: number
}

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }
const INK = '#123350'

function pinIcon(index: number, showNumbers: boolean, active: boolean) {
  const size = showNumbers ? (active ? 34 : 28) : active ? 22 : 18
  const ring = active ? `box-shadow:0 1px 4px rgba(18,51,80,.35),0 0 0 6px rgba(18,51,80,.18);` : `box-shadow:0 1px 4px rgba(18,51,80,.35);`
  const label = showNumbers
    ? `display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:${active ? 13 : 12}px;font-family:'Suit',sans-serif;`
    : ''
  return `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${INK};border:2px solid #fff;${ring}${label}">${showNumbers ? index + 1 : ''}</div>`
}

export default function MapCanvas({
  places,
  showRoute = true,
  showNumbers = true,
  showLabels = false,
  activeIndex = null,
  legs,
  onSelect,
  insetTop = 0,
  insetBottom = 0,
}: Props) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const legLabelsRef = useRef<any[]>([])
  const polylineRef = useRef<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  // 지도 초기화 (컨테이너당 최초 1회)
  useEffect(() => {
    let cancelled = false
    loadNaverMaps()
      .then(() => {
        if (cancelled || !elRef.current || !window.naver?.maps) return
        mapRef.current = new window.naver.maps.Map(elRef.current, {
          center: new window.naver.maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng),
          zoom: 14,
          zoomControl: false,
        })
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    const off = onNaverMapAuthFail(() => {
      if (!cancelled) setStatus('error')
    })
    return () => {
      cancelled = true
      off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 장소·동선이 바뀔 때마다 마커와 경로선을 다시 그린다
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return
    const naver = window.naver
    const map = mapRef.current

    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    legLabelsRef.current.forEach((m) => m.setMap(null))
    legLabelsRef.current = []
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }

    if (places.length === 0) return

    const positions = places.map((p) => new naver.maps.LatLng(p.lat, p.lng))

    if (showRoute && positions.length > 1) {
      polylineRef.current = new naver.maps.Polyline({
        map,
        path: positions,
        strokeColor: INK,
        strokeWeight: 4,
        strokeOpacity: 0.9,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      })
    }

    places.forEach((place, i) => {
      const active = activeIndex === i
      const dot = pinIcon(i, showNumbers, active)
      const size = showNumbers ? (active ? 34 : 28) : active ? 22 : 18
      const content = showLabels
        ? `<div style="display:flex;flex-direction:column;align-items:center;">
             <span style="margin-bottom:4px;white-space:nowrap;font-size:11px;font-weight:700;color:${INK};background:rgba(255,255,255,.92);padding:1px 5px;border-radius:4px;font-family:'Suit',sans-serif;">${
               place.name.length > 9 ? place.name.slice(0, 8) + '…' : place.name
             }</span>
             ${dot}
           </div>`
        : dot

      const marker = new naver.maps.Marker({
        position: positions[i],
        map,
        icon: {
          content,
          anchor: new naver.maps.Point(size / 2, showLabels ? size + 18 : size / 2),
        },
        zIndex: active ? 200 : 100 - i,
      })
      if (onSelect) {
        naver.maps.Event.addListener(marker, 'click', () => onSelect(i))
      }
      markersRef.current.push(marker)

      const leg = legs?.[i]
      const next = positions[i + 1]
      if (showRoute && leg && next) {
        const midLat = (positions[i].lat() + next.lat()) / 2
        const midLng = (positions[i].lng() + next.lng()) / 2
        const label = leg.minutes === null ? '계산 불가' : `${leg.distanceKm.toFixed(1)}km`
        const overlay = new naver.maps.Marker({
          position: new naver.maps.LatLng(midLat, midLng),
          map,
          icon: {
            content: `<div style="padding:3px 8px;background:#fff;border:1px solid #cfe0ea;border-radius:10px;font-size:11px;font-weight:600;color:#33424e;white-space:nowrap;font-family:'Suit',sans-serif;">${label}</div>`,
            anchor: new naver.maps.Point(-4, 10),
          },
          zIndex: 50,
        })
        legLabelsRef.current.push(overlay)
      }
    })

    if (positions.length === 1) {
      map.setCenter(positions[0])
      map.setZoom(16)
    } else {
      const bounds = new naver.maps.LatLngBounds(positions[0], positions[0])
      positions.forEach((p) => bounds.extend(p))
      try {
        map.fitBounds(bounds, { top: insetTop + 40, right: 40, bottom: insetBottom + 40, left: 40 })
      } catch {
        map.fitBounds(bounds)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, showRoute, showNumbers, showLabels, activeIndex, legs, status])

  const zoom = (delta: number) => {
    const map = mapRef.current
    if (map) map.setZoom(map.getZoom() + delta)
  }

  const fitAll = () => {
    const map = mapRef.current
    const naver = window.naver
    if (!map || !naver || places.length === 0) return
    const positions = places.map((p) => new naver.maps.LatLng(p.lat, p.lng))
    if (positions.length === 1) {
      map.setCenter(positions[0])
      map.setZoom(16)
      return
    }
    const bounds = new naver.maps.LatLngBounds(positions[0], positions[0])
    positions.forEach((p) => bounds.extend(p))
    try {
      map.fitBounds(bounds, { top: insetTop + 40, right: 40, bottom: insetBottom + 40, left: 40 })
    } catch {
      map.fitBounds(bounds)
    }
  }

  return (
    <div className="map">
      <div ref={elRef} style={{ position: 'absolute', inset: 0 }} />

      {status !== 'ready' && (
        <div className="map-status">
          {status === 'loading'
            ? '지도를 불러오는 중이에요…'
            : '네이버 지도를 불러오지 못했어요. Client ID와 등록된 서비스 URL을 확인해주세요.'}
        </div>
      )}

      <div className="map-tools" style={{ bottom: insetBottom + 16 }}>
        <button className="map-tool icon" onClick={() => zoom(1)} aria-label="확대">
          +
        </button>
        <button className="map-tool icon" onClick={() => zoom(-1)} aria-label="축소">
          -
        </button>
        <button className="map-tool icon" onClick={fitAll} aria-label="전체 보기">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
            <ellipse cx="8" cy="8" rx="2.6" ry="6.5" stroke="currentColor" strokeWidth="1.3" />
            <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
      </div>
    </div>
  )
}
