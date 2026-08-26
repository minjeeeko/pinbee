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
  // move/up 핸들러가 항상 최신 값을 보도록 ref로 들고, 드래그 시작 시 이펙트를 한 번만 붙인다.
  // 예전엔 드래그 중 dy·target이 바뀔 때마다(=매 포인터 이동마다) 이펙트가 리스너를 통째로
  // 떼었다 다시 붙였는데, 그 타이밍에 pointerup·pointercancel이 겹쳐 들어오면 onReorder가
  // (그래서 "동선을 다시 계산했어요" 토스트가) 한 번의 드래그에 여러 번 불릴 수 있었다.
  const itemsRef = useRef(items)
  const onReorderRef = useRef(onReorder)
  itemsRef.current = items
  onReorderRef.current = onReorder

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

  const dragging = drag !== null

  useEffect(() => {
    if (!dragging) return
    // 드래그 시작 시점의 index·height만 필요하다 (dy·target은 move 중 state로만 갱신)
    const dragIndex = drag!.index
    const step = drag!.height + gap
    let handled = false
    const move = (e: PointerEvent) => {
      const dy = e.clientY - startY.current
      const target = Math.max(0, Math.min(itemsRef.current.length - 1, dragIndex + Math.round(dy / step)))
      setDrag((d) => (d ? { ...d, dy, target } : d))
    }
    const up = () => {
      if (handled) return
      handled = true
      setDrag((d) => {
        if (d && d.target !== d.index) {
          const next = [...itemsRef.current]
          const [moved] = next.splice(d.index, 1)
          next.splice(d.target, 0, moved)
          onReorderRef.current(next)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, gap])

  const offsetFor = (i: number) => {
    if (!drag) return 0
    const step = drag.height + gap
    if (i === drag.index) return drag.dy
    if (drag.target > drag.index && i > drag.index && i <= drag.target) return -step
    if (drag.target < drag.index && i < drag.index && i >= drag.target) return step
    return 0
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
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
