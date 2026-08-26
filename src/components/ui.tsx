import React from 'react'
import { useStore } from '../lib/store'
import { CATEGORY_COLOR } from '../data/places'
import { CategoryIcon } from './CategoryIcon'
import type { Category } from '../lib/types'

export function Modal({
  open,
  onClose,
  children,
  center = false,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  center?: boolean
}) {
  if (!open) return null
  return (
    <div
      className={`modal-backdrop${center ? ' center' : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`modal${center ? ' center' : ''}`}>{children}</div>
    </div>
  )
}

export function Toasts() {
  const { toasts } = useStore()
  if (!toasts.length) return null
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <button className={`switch${on ? ' on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on} />
}

export function Checkbox({ on }: { on: boolean }) {
  return <span className={`checkbox${on ? ' on' : ''}`} />
}

export function Stepper({
  value,
  onChange,
  step = 10,
  min = 10,
  max = 480,
  format,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  format?: (v: number) => string
}) {
  return (
    <span className="stepper">
      <button onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min}>
        -{step}
      </button>
      <span>{format ? format(value) : value}</span>
      <button onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max}>
        +{step}
      </button>
    </span>
  )
}

export function AppBar({
  title,
  sub,
  onBack,
  right,
  hero = false,
}: {
  title: React.ReactNode
  sub?: React.ReactNode
  onBack?: () => void
  right?: React.ReactNode
  hero?: boolean
}) {
  return (
    <div className="appbar">
      {onBack && (
        <button className="textbtn" onClick={onBack}>
          뒤로
        </button>
      )}
      <div style={{ minWidth: 0 }}>
        <h1 className={`truncate${hero ? ' hero' : ''}`}>{title}</h1>
        {sub && <div className="sub truncate">{sub}</div>}
      </div>
      <div className="spacer" />
      {right}
    </div>
  )
}

export function Empty({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="t">{title}</div>
      {desc && <div className="tiny">{desc}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  )
}

/** 장소 대표 이미지 자리. 이미지가 없으니 카테고리 이모지를 그 카테고리 색 배경으로 보여준다 */
export function Thumb({ size = '', category }: { size?: string; category?: Category }) {
  if (!category) return <span className={`thumb ${size}`} />
  const color = CATEGORY_COLOR[category]
  return (
    <span className={`thumb ${size}`} style={{ background: `${color}1a`, borderColor: `${color}40` }}>
      <CategoryIcon category={category} size={size === 'lg' ? 26 : 20} />
    </span>
  )
}
