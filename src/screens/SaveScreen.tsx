import { useMemo, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { THEMES } from '../data/seed'
import { PLACE_MAP } from '../data/places'
import { AppBar, Empty, Modal, Switch, Thumb } from '../components/ui'

function shareUrl(token: string) {
  return `${window.location.origin}${window.location.pathname}#/s/${token}`
}

export default function SaveScreen({ courseId }: { courseId?: string }) {
  const store = useStore()
  const course = courseId ? store.getCourse(courseId) : store.draft
  const [copied, setCopied] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const stats = useMemo(
    () => (course ? courseStats(course, { realDriving: true }) : null),
    [course, store.directionsVersion],
  )

  if (!course || !stats) {
    return (
      <div className="screen">
        <AppBar title="코스 저장" onBack={goBack} />
        <Empty title="코스를 찾을 수 없어요" />
      </div>
    )
  }

  const isPublic = course.visibility === 'public'

  const copy = async () => {
    const url = shareUrl(course.shareToken)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    store.toast('링크가 복사되었습니다')
  }

  const save = async () => {
    if (!store.user) {
      setLoginOpen(true)
      return
    }
    if (!course.title.trim()) {
      setSaveError('코스 이름을 입력해주세요. 입력한 내용은 그대로 유지돼요.')
      return
    }
    setSaveError('')
    setSaving(true)
    const result = await store.saveCourse(course.id)
    setSaving(false)
    if (!result.ok) {
      setSaveError(result.error)
      return
    }
    store.toast('코스를 저장했어요')
    navigate('/me')
  }

  return (
    <div className="screen">
      <AppBar
        title="코스 저장"
        onBack={goBack}
        right={<span className="pill">{course.places.length}곳</span>}
      />

      <div className="scroll pad">
        <label className="field">
          <span className="label">코스 이름</span>
          <input
            className="input"
            value={course.title}
            placeholder="예: 연남 → 한강 데이트"
            onChange={(e) => store.updateCourse(course.id, { title: e.target.value })}
          />
        </label>

        <label className="field">
          <span className="label">설명</span>
          <textarea
            className="textarea"
            value={course.description}
            placeholder="어떤 코스인지 짧게 적어주세요"
            onChange={(e) => store.updateCourse(course.id, { description: e.target.value })}
          />
        </label>

        <div className="field">
          <span className="label">테마</span>
          <div className="chips">
            {THEMES.map((t) => (
              <button
                key={t}
                className={`chip sm${course.theme === t ? ' on' : ''}`}
                onClick={() => store.updateCourse(course.id, { theme: t })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="label">대표 이미지</span>
          <div className="tiny muted" style={{ marginBottom: 8 }}>
            코스 장소 사진 중 선택하거나 직접 업로드할 수 있어요
          </div>
          <div className="chips">
            {course.places.map((cp) => {
              const p = PLACE_MAP[cp.placeId]
              const on = course.coverPlaceId === cp.placeId
              return (
                <button
                  key={cp.uid}
                  onClick={() => store.updateCourse(course.id, { coverPlaceId: cp.placeId })}
                  style={{
                    border: `1px solid ${on ? 'var(--ink)' : 'var(--border)'}`,
                    borderRadius: 16,
                    padding: 6,
                    background: 'var(--canvas)',
                    flex: 'none',
                  }}
                >
                  <Thumb size="lg" category={p?.category} />
                  <div className="tiny truncate" style={{ width: 60, marginTop: 4 }}>
                    {p?.name}
                  </div>
                </button>
              )
            })}
            {course.places.length === 0 && <span className="tiny muted">추가된 장소가 없어요</span>}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="between">
            <div style={{ minWidth: 0 }}>
              <div className="bold small">공개 코스로 게시</div>
              <div className="tiny muted" style={{ marginTop: 3 }}>
                공개해도 작성자 개인정보는 노출되지 않아요. 언제든 비공개로 전환할 수 있어요.
              </div>
            </div>
            <Switch
              on={isPublic}
              onChange={(v) => {
                store.setVisibility(course.id, v ? 'public' : 'private')
                store.toast(v ? '공개 코스로 전환했어요' : '비공개로 전환했어요')
              }}
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="label" style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
            공유 링크
          </div>
          <div className="between">
            <span className="small truncate muted" style={{ flex: 1 }}>
              {shareUrl(course.shareToken).replace(/^https?:\/\//, '')}
            </span>
            <button className="btn xs primary" onClick={copy}>
              복사
            </button>
          </div>
          {copied && <div className="tiny muted" style={{ marginTop: 8 }}>링크가 복사되었습니다</div>}
          {!isPublic && (
            <div className="banner" style={{ marginTop: 10 }}>
              비공개 코스의 링크는 열람할 수 없어요. 공유하려면 공개로 전환해주세요.
            </div>
          )}
        </div>

        {saveError && <div className="banner alert" style={{ marginBottom: 12 }}>{saveError}</div>}

        <button className="btn primary block" disabled={saving} onClick={save}>
          {saving ? '저장 중…' : '저장'}
        </button>
        <div className="tiny muted" style={{ textAlign: 'center', marginTop: 10 }}>
          {store.user ? `${store.user.name}님 계정에 저장돼요` : '저장에는 로그인이 필요해요 · 이메일 / 소셜 로그인'}
        </div>

        <button className="btn outline block" style={{ marginTop: 18 }} onClick={() => {
          store.deleteCourse(course.id)
          store.toast('코스를 삭제했어요')
          navigate('/')
        }}>
          코스 삭제
        </button>
      </div>

      <Modal open={loginOpen} onClose={() => setLoginOpen(false)} center>
        <div className="modal-title">로그인이 필요해요</div>
        <div className="small muted" style={{ marginBottom: 14 }}>
          코스를 저장하고 내 계정에서 다시 열어보려면 로그인해주세요. 편집 중인 내용은 그대로 유지돼요.
        </div>
        <div className="row">
          <button className="btn" onClick={() => setLoginOpen(false)}>
            나중에
          </button>
          <button className="btn primary" onClick={() => navigate('/login?next=' + encodeURIComponent('/save/' + course.id))}>
            로그인하기
          </button>
        </div>
      </Modal>
    </div>
  )
}
