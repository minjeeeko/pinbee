import React from 'react'
import { useStore } from '../lib/store'

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
  return <span className={`checkbox${on ? ' on' : ''}`}>✓</span>
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
      <button onClick={() => onChange(Math.max(min, value - step))} aria-label="줄이기">
        −
      </button>
      <span>{format ? format(value) : value}</span>
      <button onClick={() => onChange(Math.min(max, value + step))} aria-label="늘리기">
        +
      </button>
    </span>
  )
}

export function AppBar({
  title,
  sub,
  onBack,
  right,
}: {
  title: React.ReactNode
  sub?: React.ReactNode
  onBack?: () => void
  right?: React.ReactNode
}) {
  return (
    <div className="appbar">
      {onBack && (
        <button className="iconbtn" onClick={onBack} aria-label="뒤로">
          ‹
        </button>
      )}
      <div style={{ minWidth: 0 }}>
        <h1 className="truncate">{title}</h1>
        {sub && <div className="sub truncate">{sub}</div>}
      </div>
      <div className="spacer" />
      {right}
    </div>
  )
}

export function Empty({ icon, title, desc, action }: { icon: string; title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="big">{icon}</div>
      <div className="t">{title}</div>
      {desc && <div className="tiny">{desc}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  )
}

export function Thumb({ tone, size = '' }: { tone: string; size?: string }) {
  return <span className={`thumb ${size}`} style={{ background: tone }} />
}
