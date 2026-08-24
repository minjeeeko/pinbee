import { useState } from 'react'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { DEFAULT_PREFS } from '../data/seed'
import { CATEGORIES } from '../data/places'
import { TRANSPORT_LABEL } from '../lib/geo'
import type { Category, Transport } from '../lib/types'

const STEPS = 2

export default function OnboardingScreen() {
  const store = useStore()
  const [step, setStep] = useState(0)
  const [transport, setTransport] = useState<Transport | 'mixed'>(store.prefs.transport)
  const [categories, setCategories] = useState<Category[]>(store.prefs.categories)

  const finish = (p: { transport: Transport | 'mixed'; categories: Category[] }) => {
    store.setPrefs({ ...DEFAULT_PREFS, ...p })
    navigate('/', true)
  }

  const toggleCat = (c: Category) =>
    setCategories((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]))

  if (step === 0) {
    return (
      <div className="screen">
        <div className="scroll pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100%' }}>
          <div className="bold" style={{ fontSize: 28, lineHeight: '38px', marginBottom: 12 }}>
            루티즈에 오신 걸
            <br />
            환영해요
          </div>
          <div className="small muted" style={{ marginBottom: 32 }}>
            지도에서 장소를 담고 순서를 정하면, 나만의 하루 코스가 완성돼요.
            <br />
            시작 전에 몇 가지만 물어볼게요.
          </div>
          <button className="btn primary block" onClick={() => setStep(1)}>
            시작하기
          </button>
          <button className="btn block" style={{ marginTop: 10 }} onClick={() => finish(store.prefs)}>
            건너뛰기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="appbar">
        <button className="textbtn" onClick={() => setStep(step - 1)}>
          뒤로
        </button>
        <div className="spacer" />
        <span className="tiny muted">{step}/{STEPS}</span>
        <button className="textbtn" style={{ marginLeft: 10 }} onClick={() => finish({ transport, categories })}>
          건너뛰기
        </button>
      </div>

      {step === 1 && (
        <div className="scroll pad">
          <div className="bold" style={{ fontSize: 22, marginBottom: 6 }}>
            주로 어떻게 이동하세요?
          </div>
          <div className="small muted" style={{ marginBottom: 20 }}>
            코스를 짤 때 이 이동수단을 우선 추천해드려요.
          </div>
          <div className="chips">
            {(['mixed', 'walk', 'transit', 'car'] as const).map((t) => (
              <button
                key={t}
                className={`chip${transport === t ? ' on' : ''}`}
                onClick={() => setTransport(t)}
              >
                {t === 'mixed' ? '혼합' : TRANSPORT_LABEL[t as Transport]}
              </button>
            ))}
          </div>
          <button className="btn primary block" style={{ marginTop: 32 }} onClick={() => setStep(2)}>
            다음
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="scroll pad">
          <div className="bold" style={{ fontSize: 22, marginBottom: 6 }}>
            좋아하는 장소 유형이 있나요?
          </div>
          <div className="small muted" style={{ marginBottom: 20 }}>
            여러 개 골라도 돼요. 나중에 언제든 바꿀 수 있어요.
          </div>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button key={c} className={`chip sm${categories.includes(c) ? ' on' : ''}`} onClick={() => toggleCat(c)}>
                {c}
              </button>
            ))}
          </div>
          <button className="btn primary block" style={{ marginTop: 32 }} onClick={() => finish({ transport, categories })}>
            완료
          </button>
        </div>
      )}
    </div>
  )
}
