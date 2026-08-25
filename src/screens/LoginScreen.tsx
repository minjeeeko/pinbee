import { useEffect, useRef, useState } from 'react'
import { navigate, useRoute } from '../lib/router'
import { useStore } from '../lib/store'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { uploadAvatar, updateProfile } from '../lib/db'
import { AGE_GROUPS, REFERRAL_SOURCES, EXPECTED_FEATURES } from '../data/seed'
import { AppBar } from '../components/ui'

export default function LoginScreen() {
  const store = useStore()
  const route = useRoute()
  const next = route.query.get('next') || '/me'
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [ageGroup, setAgeGroup] = useState<string | null>(null)
  const [referralSource, setReferralSource] = useState<string | null>(null)
  const [expectedFeatures, setExpectedFeatures] = useState<string[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!avatarFile) return
    const url = URL.createObjectURL(avatarFile)
    setAvatarPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  const toggleFeature = (f: string) =>
    setExpectedFeatures((fs) => (fs.includes(f) ? fs.filter((x) => x !== f) : [...fs, f]))

  const submit = async () => {
    if (!isSupabaseConfigured) {
      setError('아직 Supabase 연결 정보가 설정되지 않았어요.')
      return
    }
    if (!email.includes('@') || pw.length < 6) {
      setError('이메일과 6자 이상 비밀번호를 확인해주세요.')
      return
    }
    if (mode === 'signup') {
      if (!nickname.trim()) return setError('닉네임을 입력해주세요.')
      if (!ageGroup) return setError('연령대를 선택해주세요.')
      if (!referralSource) return setError('어떻게 알게 되셨는지 선택해주세요.')
      if (expectedFeatures.length === 0) return setError('기대하는 기능을 하나 이상 골라주세요.')
    }
    setError('')
    setLoading(true)

    if (mode === 'login') {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password: pw })
      setLoading(false)
      if (authError) return setError(authError.message)
      store.toast('로그인했어요')
      navigate(next, true)
      return
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password: pw,
      options: {
        data: {
          name: nickname.trim(),
          age_group: ageGroup,
          referral_source: referralSource,
          expected_features: expectedFeatures,
        },
      },
    })
    if (authError) {
      setLoading(false)
      setError(authError.message)
      return
    }
    if (data.session && data.user && avatarFile) {
      try {
        const url = await uploadAvatar(data.user.id, avatarFile)
        await updateProfile(data.user.id, { avatarUrl: url })
      } catch {
        /* 사진 업로드가 실패해도 가입 자체는 끝났으니 내 정보에서 나중에 다시 시도할 수 있다 */
      }
    }
    setLoading(false)
    store.toast('회원가입했어요')
    navigate(next, true)
  }

  return (
    <div className="screen">
      <AppBar title={mode === 'signup' ? '회원가입' : '로그인'} onBack={() => navigate('/')} />
      <div className="scroll pad">
        {!isSupabaseConfigured && (
          <div className="banner alert" style={{ marginBottom: 16 }}>
            Supabase 연결 정보(.env.local)가 없어서 회원가입·로그인을 쓸 수 없어요.
          </div>
        )}

        <div className="chips" style={{ marginBottom: 16 }}>
          <button className={`chip${mode === 'login' ? ' on' : ''}`} onClick={() => setMode('login')}>
            로그인
          </button>
          <button className={`chip${mode === 'signup' ? ' on' : ''}`} onClick={() => setMode('signup')}>
            회원가입
          </button>
        </div>

        {mode === 'signup' && (
          <div className="field">
            <span className="label">프로필 이미지 (선택)</span>
            <div className="flexrow" style={{ gap: 12, alignItems: 'center' }}>
              <button
                className="tap"
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: avatarPreview ? `center/cover url(${avatarPreview})` : 'var(--surface)',
                  flex: 'none',
                }}
                aria-label="프로필 이미지 선택"
              />
              <button className="btn xs" onClick={() => fileRef.current?.click()}>
                {avatarFile ? '사진 변경' : '사진 선택'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="tiny muted" style={{ marginTop: 6 }}>
              이메일 인증이 필요한 경우 로그인 후 내 정보에서 다시 추가할 수 있어요.
            </div>
          </div>
        )}

        {mode === 'signup' && (
          <label className="field">
            <span className="label">닉네임</span>
            <input className="input" value={nickname} placeholder="닉네임" onChange={(e) => setNickname(e.target.value)} />
          </label>
        )}
        <label className="field">
          <span className="label">이메일</span>
          <input
            className="input"
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="label">비밀번호</span>
          <input
            className="input"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="6자 이상"
          />
        </label>

        {mode === 'signup' && (
          <>
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
              <span className="label">어떤 기능을 기대하세요? (복수 선택)</span>
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
          </>
        )}

        {error && <div className="banner alert" style={{ marginBottom: 12 }}>{error}</div>}

        <button className="btn primary block" disabled={loading} onClick={submit}>
          {loading ? '처리 중…' : mode === 'signup' ? '회원가입' : '이메일로 로그인'}
        </button>

        <div className="tiny muted" style={{ textAlign: 'center', marginTop: 18 }}>
          로그인하지 않아도 공개 코스는 볼 수 있어요.
        </div>
      </div>
    </div>
  )
}
