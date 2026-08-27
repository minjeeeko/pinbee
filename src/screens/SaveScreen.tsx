import { useMemo, useRef, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { courseStats } from '../lib/course'
import { THEMES } from '../data/seed'
import { REGIONS } from '../data/places'
import { AppBar, Empty, Modal, Switch } from '../components/ui'

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
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverError, setCoverError] = useState('')
  const coverFileRef = useRef<HTMLInputElement>(null)
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
    if (!course.region) {
      setSaveError('지역을 선택해주세요. 탐색 카드에 표시돼요.')
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

  const pickCover = () => {
    if (!store.user) {
      setLoginOpen(true)
      return
    }
    coverFileRef.current?.click()
  }

  const uploadCover = async (file: File) => {
    setCoverError('')
    setCoverUploading(true)
    try {
      await store.uploadCourseCover(course.id, file)
    } catch (e) {
      setCoverError((e as Error).message || '사진을 올리지 못했어요.')
    } finally {
      setCoverUploading(false)
      if (coverFileRef.current) coverFileRef.current.value = ''
    }
  }

  return (
    <div className="screen">
      <AppBar
        title="코스 저장"
        onBack={goBack}
        right={<span className="pill">{course.places.length}곳</span>}
        logo
      />

      <div className="scroll pad">
        <div className="field">
          <span className="label">대표 사진</span>
          <button
            className="tap"
            onClick={pickCover}
            disabled={coverUploading}
            style={{
              width: '100%',
              height: 140,
              borderRadius: 'var(--r-card)',
              border: '1px solid var(--border)',
              background: course.coverImageUrl ? `url(${course.coverImageUrl}) center/cover` : 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {coverUploading ? (
              <span className="tiny muted">올리는 중…</span>
            ) : !course.coverImageUrl ? (
              <span className="tiny muted">탭해서 사진 올리기</span>
            ) : (
              <span className="pill dark">사진 변경</span>
            )}
          </button>
          <input
            ref={coverFileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadCover(f)
            }}
          />
          {coverError && <div className="banner alert" style={{ marginTop: 8 }}>{coverError}</div>}
        </div>

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
          <span className="label">지역</span>
          <div className="chips">
            {REGIONS.map((r) => (
              <button
                key={r}
                className={`chip sm${course.region === r ? ' on' : ''}`}
                onClick={() => store.updateCourse(course.id, { region: r })}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

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
