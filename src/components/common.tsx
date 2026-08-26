import React, { useState } from 'react'
import type { Course, CoursePlace, Leg, Place, Transport } from '../lib/types'
import { TRANSPORT_LABEL } from '../lib/geo'
import { PLACE_MAP } from '../data/places'
import { Modal, Thumb } from './ui'

export function PlaceRow({
  place,
  right,
  onClick,
  index,
  sub,
}: {
  place: Place
  right?: React.ReactNode
  onClick?: () => void
  index?: number
  sub?: React.ReactNode
}) {
  return (
    <div className="list-item" onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      {index !== undefined && <span className="num">{index}</span>}
      <div className="body">
        <div className="name truncate">{place.name}</div>
        <div className="meta truncate">
          {sub ?? `${place.address.replace('서울 ', '')} · ${place.category}`}
        </div>
      </div>
      <Thumb category={place.category} />
      {right}
    </div>
  )
}

export function TransportPicker({
  value,
  onChange,
  size = 'sm',
}: {
  value: Transport
  onChange: (t: Transport) => void
  size?: 'sm' | 'md'
}) {
  const list: Transport[] = ['walk', 'transit', 'car']
  return (
    <div className="flexrow" style={{ gap: 6 }}>
      {list.map((t) => (
        <button
          key={t}
          className={`chip ${size === 'sm' ? 'sm' : ''}${value === t ? ' on' : ''}`}
          onClick={() => onChange(t)}
        >
          {TRANSPORT_LABEL[t]}
        </button>
      ))}
    </div>
  )
}

export function LegRow({
  leg,
  onChangeTransport,
  editable = true,
}: {
  leg: Leg
  onChangeTransport?: (t: Transport) => void
  editable?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className={`leg${leg.minutes === null ? ' error' : ''}`}>
        {editable ? (
          <button className="seg-btn" onClick={() => setOpen((v) => !v)}>
            {TRANSPORT_LABEL[leg.transport]} · 변경
          </button>
        ) : (
          <span className="seg-btn">{TRANSPORT_LABEL[leg.transport]}</span>
        )}
        <span className="tiny">{leg.distanceKm.toFixed(1)}km</span>
      </div>
      {leg.minutes === null && (
        <div className="banner alert" style={{ margin: '4px 0 8px 28px' }}>
          <div className="t">이 구간은 경로를 계산할 수 없어요</div>
          {leg.error}
        </div>
      )}
      {open && editable && onChangeTransport && (
        <div style={{ margin: '2px 0 8px 28px' }}>
          <TransportPicker
            value={leg.transport}
            onChange={(t) => {
              onChangeTransport(t)
              setOpen(false)
            }}
          />
        </div>
      )}
    </>
  )
}

export function PlaceEditorModal({
  open,
  coursePlace,
  onClose,
  onChange,
  onRemove,
}: {
  open: boolean
  coursePlace: CoursePlace | null
  onClose: () => void
  onChange: (patch: Partial<CoursePlace>) => void
  onRemove: () => void
}) {
  if (!coursePlace) return null
  const place = PLACE_MAP[coursePlace.placeId]
  return (
    <Modal open={open} onClose={onClose}>
      <div className="between" style={{ marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div className="modal-title" style={{ marginBottom: 2 }}>
            {place?.name}
          </div>
          <div className="tiny muted truncate">
            {place?.address.replace('서울 ', '')} · {place?.category}
          </div>
        </div>
        <Thumb size="lg" category={place?.category} />
      </div>

      <label className="field">
        <span className="label">메모</span>
        <textarea
          className="textarea"
          placeholder="예약 시간, 준비물 등을 적어두세요"
          value={coursePlace.memo}
          onChange={(e) => onChange({ memo: e.target.value })}
        />
      </label>

      <div className="row">
        <button className="btn outline" onClick={onRemove}>
          코스에서 삭제
        </button>
        <button className="btn primary" onClick={onClose}>
          완료
        </button>
      </div>
    </Modal>
  )
}

export function CourseCard({ course, onClick }: { course: Course; onClick: () => void }) {
  return (
    <div className="card tap" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="bold truncate">{course.title || '이름 없는 코스'}</div>
      <div className="tiny muted" style={{ marginTop: 3 }}>
        {course.authorName} · {course.region ?? '지역 미지정'} · {course.theme}
      </div>
      <div className="tiny muted" style={{ marginTop: 4 }}>
        {course.places.length}곳
      </div>
    </div>
  )
}
