import React, { useEffect, useRef, useState } from 'react'

interface Props {
  /** 화면 높이 대비 스냅 지점 (작은 값부터) */
  snaps?: number[]
  initial?: number
  children: React.ReactNode
  header?: React.ReactNode
  /** 현재 스냅 높이(0~1)를 알려준다 */
  onSnapChange?: (fraction: number) => void
}

export default function BottomSheet({
  snaps = [0.42, 0.84],
  initial = 0,
  children,
  header,
  onSnapChange,
}: Props) {
  const [snap, setSnap] = useState(initial)
  const [dragY, setDragY] = useState(0)
  const start = useRef<number | null>(null)

  useEffect(() => {
    if (start.current === null) return
    const move = (e: PointerEvent) => {
      if (start.current === null) return
      setDragY(e.clientY - start.current)
    }
    const up = () => {
      setDragY((dy) => {
        if (dy < -40) setSnap((s) => Math.min(snaps.length - 1, s + 1))
        else if (dy > 40) setSnap((s) => Math.max(0, s - 1))
        return 0
      })
      start.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  })

  useEffect(() => {
    onSnapChange?.(snaps[snap])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap])

  const height = `calc(${snaps[snap] * 100}% - ${Math.max(-120, Math.min(120, dragY))}px)`

  return (
    <div className="sheet" style={{ height, transition: dragY ? 'none' : undefined }}>
      <div
        className="grab"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          start.current = e.clientY
          setDragY(0)
        }}
        onClick={() => setSnap((s) => (s + 1) % snaps.length)}
      />
      {header}
      <div className="sheet-body">{children}</div>
    </div>
  )
}
