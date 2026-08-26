/** 앱 첫 실행 시 잠깐 보여주는 로딩 화면. 흰 배경 위 상단 1/3 지점에 아이콘 + 바로 아래 서비스명·슬로건 */
export function SplashScreen() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        background: '#ffffff',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '33%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <img
          src="https://zsvndzfbnlwdsdeyxarj.supabase.co/storage/v1/object/public/service/logo_2.png"
          alt="Routiz"
          style={{ width: 88, height: 88, objectFit: 'contain' }}
        />
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>Routiz</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: '20px' }}>
            가고 싶은 곳을 모아 하나의 루트로
          </div>
        </div>
      </div>
    </div>
  )
}
