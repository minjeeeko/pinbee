import { useCallback, useEffect, useRef, useState } from 'react'

export interface HandleProps {
  onPointerDown: (e: React.PointerEvent) => void
  className: string
  role: string
  'aria-label': string
}

interface Props<T> {
  items: T[]
  keyOf: (item: T) => string
  onReorder: (items: T[]) => void
  renderItem: (item: T, index: number, handle: HandleProps, dragging: boolean) => React.ReactNode
  gap?: number
}

/** 포인터 기반 드래그 정렬 목록 (터치·마우스 모두 지원) */
export default function SortableList<T>({ items, keyOf, onReorder, renderItem, gap = 10 }: Props<T>) {
  const [drag, setDrag] = useState<{ index: number; dy: number; height: number; target: number } | null>(null)
  const startY = useRef(0)
  const listRef = useRef<HTMLDivElement>(null)

  const onHandleDown = useCallback(
    (index: number) => (e: React.PointerEvent) => {
      e.preventDefault()
      const row = (e.currentTarget as HTMLElement).closest('[data-sortable-row]') as HTMLElement | null
      const height = row?.offsetHeight ?? 64
      startY.current = e.clientY
      setDrag({ index, dy: 0, height, target: index })
    },
    [],
  )

  useEffect(() => {
    if (!drag) return
    const step = drag.height + gap
    const move = (e: PointerEvent) => {
      const dy = e.clientY - startY.current
      const target = Math.max(0, Math.min(items.length - 1, drag.index + Math.round(dy / step)))
      setDrag((d) => (d ? { ...d, dy, target } : d))
    }
    const up = () => {
      setDrag((d) => {
        if (d && d.target !== d.index) {
          const next = [...items]
          const [moved] = next.splice(d.index, 1)
          next.splice(d.target, 0, moved)
          onReorder(next)
        }
        return null
      })
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [drag, gap, items, onReorder])

  const offsetFor = (i: number) => {
    if (!drag) return 0
    const step = drag.height + gap
    if (i === drag.index) return drag.dy
    if (drag.target > drag.index && i > drag.index && i <= drag.target) return -step
    if (drag.target < drag.index && i < drag.index && i >= drag.target) return step
    return 0
  }

  return (
    <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap }}>
      {items.map((item, i) => {
        const isDragging = drag?.index === i
        return (
          <div
            key={keyOf(item)}
            data-sortable-row
            className={`sortable-item${isDragging ? ' lifted' : ''}`}
            style={{
              transform: `translateY(${offsetFor(i)}px)`,
              transition: isDragging ? 'none' : undefined,
              touchAction: drag ? 'none' : undefined,
            }}
          >
            {renderItem(
              item,
              i,
              {
                onPointerDown: onHandleDown(i),
                className: 'drag-handle',
                role: 'button',
                'aria-label': '드래그해서 순서 변경',
              },
              isDragging,
            )}
          </div>
        )
      })}
    </div>
  )
}
