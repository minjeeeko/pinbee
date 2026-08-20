import { useState } from 'react'
import { goBack, navigate, useRoute } from '../lib/router'
import { useStore } from '../lib/store'
import { AppBar } from '../components/ui'

export default function LoginScreen() {
  const store = useStore()
  const route = useRoute()
  const next = route.query.get('next') || '/me'
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')

  const finish = (name: string, provider: 'email' | 'kakao' | 'google', mail: string) => {
    store.login({ id: 'u-me', name, email: mail, provider })
    store.toast('로그인했어요')
    navigate(next, true)
  }

  return (
    <div className="screen">
      <AppBar title="로그인" onBack={goBack} />
      <div className="scroll pad">
        <div className="banner" style={{ marginBottom: 16 }}>
          프로토타입이라 실제 인증 없이 세션만 만들어요. 어떤 이메일이든 로그인됩니다.
        </div>

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
            placeholder="비밀번호 입력"
          />
        </label>

        {error && <div className="banner alert" style={{ marginBottom: 12 }}>{error}</div>}

        <button
          className="btn primary block"
          onClick={() => {
            if (!email.includes('@') || pw.length < 4) {
              setError('로그인 정보를 확인해주세요.')
              return
            }
            finish(email.split('@')[0], 'email', email)
          }}
        >
          이메일로 로그인
        </button>

        <div className="divider" />
        <div className="stack">
          <button className="btn block" onClick={() => finish('카카오 사용자', 'kakao', 'kakao@example.com')}>
            카카오로 계속하기
          </button>
          <button className="btn block" onClick={() => finish('구글 사용자', 'google', 'google@example.com')}>
            구글로 계속하기
          </button>
        </div>

        <div className="tiny muted" style={{ textAlign: 'center', marginTop: 18 }}>
          로그인하지 않아도 공개 코스는 볼 수 있어요.
        </div>
      </div>
    </div>
  )
}
