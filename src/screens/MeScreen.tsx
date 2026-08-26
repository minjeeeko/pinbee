import { useRef, useState } from 'react'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { AGE_GROUPS, REFERRAL_SOURCES, EXPECTED_FEATURES } from '../data/seed'
import { CATEGORIES } from '../data/places'
import { TRANSPORT_LABEL } from '../lib/geo'
import type { Category, Transport } from '../lib/types'
import { Empty } from '../components/ui'

export default function MeScreen() {
  const store = useStore()
  const user = store.user
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)

  const [editingInfo, setEditingInfo] = useState(false)
  const [ageGroup, setAgeGroup] = useState(user?.ageGroup ?? null)
  const [referralSource, setReferralSource] = useState(user?.referralSource ?? null)
  const [expectedFeatures, setExpectedFeatures] = useState<string[]>(user?.expectedFeatures ?? [])
  const [transport, setTransport] = useState<Transport | 'mixed'>(store.prefs.transport)
  const [categories, setCategories] = useState<Category[]>(store.prefs.categories)
  const [savingInfo, setSavingInfo] = useState(false)

  const openInfoEditor = () => {
    setAgeGroup(user?.ageGroup ?? null)
    setReferralSource(user?.referralSource ?? null)
    setExpectedFeatures(user?.expectedFeatures ?? [])
    setTransport(store.prefs.transport)
    setCategories(store.prefs.categories)
    setEditingInfo(true)
  }

  const toggleFeature = (f: string) =>
    setExpectedFeatures((fs) => (fs.includes(f) ? fs.filter((x) => x !== f) : [...fs, f]))

  const toggleCategory = (c: Category) =>
    setCategories((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]))

  const saveInfo = async () => {
    setSavingInfo(true)
    try {
      await store.updateProfile({ ageGroup, referralSource, expectedFeatures })
      store.setPrefs({ ...store.prefs, transport, categories })
      store.toast('내 정보를 저장했어요')
      setEditingInfo(false)
    } catch {
      store.toast('저장에 실패했어요. 다시 시도해주세요')
    } finally {
      setSavingInfo(false)
    }
  }

  const nameDirty = !!user && name !== user.name

  const save = async () => {
    setSaving(true)
    try {
      await store.updateProfile({ name: name.trim() })
      store.toast('프로필을 저장했어요')
    } catch {
      store.toast('저장에 실패했어요. 다시 시도해주세요')
    } finally {
      setSaving(false)
    }
  }

  const pickAvatar = async (file: File) => {
    setUploading(true)
    try {
      await store.uploadAvatar(file)
      store.toast('프로필 이미지를 바꿨어요')
    } catch {
      store.toast('이미지 업로드에 실패했어요. 다시 시도해주세요')
    } finally {
      setUploading(false)
    }
  }

  if (!user) {
    return (
      <div className="screen">
        <div className="appbar">
          <h1 className="hero logo">내 정보</h1>
        </div>
        <div className="scroll pad">
          <Empty
            title="로그인하지 않았어요"
            desc="프로필을 관리하려면 로그인해주세요."
            action={
              <button className="btn primary" onClick={() => navigate('/login?next=' + encodeURIComponent('/me'))}>
                로그인
              </button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="appbar">
        <h1 className="hero logo">내 정보</h1>
      </div>

      <div className="scroll pad">
        <div className="flexrow" style={{ gap: 14, alignItems: 'center', marginBottom: 20 }}>
          <button
            className="tap"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              border: '1px solid var(--border)',
              background: user.avatarUrl ? `center/cover url(${user.avatarUrl})` : 'var(--surface)',
              flex: 'none',
            }}
            aria-label="프로필 이미지 변경"
          />
          <div style={{ minWidth: 0 }}>
            <div className="bold truncate">{user.name}</div>
            <div className="tiny muted truncate">{user.email}</div>
            <button className="textbtn" style={{ marginTop: 2 }} onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? '업로드 중…' : '사진 바꾸기'}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) pickAvatar(f)
            }}
          />
        </div>

        <label className="field">
          <span className="label">닉네임</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <button className="btn primary block" disabled={!nameDirty || saving} onClick={save} style={{ marginTop: 8 }}>
          {saving ? '저장 중…' : '프로필 저장'}
        </button>

        {editingInfo ? (
          <div className="card" style={{ padding: 14, marginTop: 24 }}>
            <div className="field">
              <span className="label">연령대</span>
              <div className="chips">
                {AGE_GROUPS.map((a) => (
                  <button key={a} className={`chip sm${ageGroup === a ? ' on' : ''}`} onClick={() => setAgeGroup(a)}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="label">어떻게 알고 오셨어요?</span>
              <div className="chips">
                {REFERRAL_SOURCES.map((r) => (
                  <button
                    key={r}
                    className={`chip sm${referralSource === r ? ' on' : ''}`}
                    onClick={() => setReferralSource(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="label">기대하는 기능 (복수 선택)</span>
              <div className="chips">
                {EXPECTED_FEATURES.map((f) => (
                  <button
                    key={f}
                    className={`chip sm${expectedFeatures.includes(f) ? ' on' : ''}`}
                    onClick={() => toggleFeature(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="label">주로 어떻게 이동하세요?</span>
              <div className="chips">
                {(['mixed', 'walk', 'transit', 'car'] as const).map((t) => (
                  <button
                    key={t}
                    className={`chip sm${transport === t ? ' on' : ''}`}
                    onClick={() => setTransport(t)}
                  >
                    {t === 'mixed' ? '혼합' : TRANSPORT_LABEL[t as Transport]}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="label">좋아하는 장소 유형</span>
              <div className="chips">
                {CATEGORIES.map((c) => (
                  <button key={c} className={`chip sm${categories.includes(c) ? ' on' : ''}`} onClick={() => toggleCategory(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="row" style={{ marginTop: 4 }}>
              <button className="btn" onClick={() => setEditingInfo(false)}>
                취소
              </button>
              <button className="btn primary" disabled={savingInfo} onClick={saveInfo}>
                {savingInfo ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn outline block" style={{ marginTop: 24 }} onClick={openInfoEditor}>
            내 정보 수정하기
          </button>
        )}

        <button className="btn block" style={{ marginTop: 10 }} onClick={() => store.logout()}>
          로그아웃
        </button>

        {user.isAdmin && (
          <button className="btn outline block" style={{ marginTop: 24 }} onClick={() => navigate('/admin')}>
            관리자 대시보드
          </button>
        )}
      </div>
    </div>
  )
}
