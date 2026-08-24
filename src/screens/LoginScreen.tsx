import { useState } from 'react'
import { navigate, useRoute } from '../lib/router'
import { useStore } from '../lib/store'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { AppBar } from '../components/ui'

export default function LoginScreen() {
  const store = useStore()
  const route = useRoute()
  const next = route.query.get('next') || '/me'
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!isSupabaseConfigured) {
      setError('아직 Supabase 연결 정보가 설정되지 않았어요.')
      return
    }
    if (!email.includes('@') || pw.length < 6) {
      setError('이메일과 6자 이상 비밀번호를 확인해주세요.')
      return
    }
    if (mode === 'signup' && !name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }
    setError('')
    setLoading(true)
    const { error: authError } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password: pw, options: { data: { name: name.trim() } } })
        : await supabase.auth.signInWithPassword({ email, password: pw })
    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }
    store.toast(mode === 'signup' ? '회원가입했어요' : '로그인했어요')
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
          <label className="field">
            <span className="label">이름</span>
            <input className="input" value={name} placeholder="닉네임" onChange={(e) => setName(e.target.value)} />
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
