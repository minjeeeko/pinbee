import { navigate } from '../lib/router'
import { resetStore, useStore } from '../lib/store'
import { CourseCard } from '../components/common'
import { Empty } from '../components/ui'

export default function MeScreen() {
  const store = useStore()
  const pending = store.reports.filter((r) => r.status === 'pending').length

  return (
    <div className="screen">
      <div className="appbar">
        <h1 className="hero">내 정보</h1>
      </div>

      <div className="scroll pad">
        <div className="card">
          {store.user ? (
            <div className="between">
              <div>
                <div className="bold">{store.user.name}</div>
                <div className="tiny muted">{store.user.email} · 이메일 로그인</div>
              </div>
              <button className="btn xs" onClick={() => store.logout()}>
                로그아웃
              </button>
            </div>
          ) : (
            <div className="between">
              <div>
                <div className="bold">로그인하지 않았어요</div>
                <div className="tiny muted">공개 코스는 그대로 볼 수 있어요. 저장에는 로그인이 필요해요.</div>
              </div>
              <button className="btn xs primary" onClick={() => navigate('/login')}>
                로그인
              </button>
            </div>
          )}
        </div>

        <div className="section-title">내 코스 {store.myCourses.length}개</div>
        {store.myCourses.length === 0 ? (
          <Empty title="저장한 코스가 없어요" />
        ) : (
          store.myCourses.map((c) => (
            <div key={c.id}>
              <CourseCard course={c} onClick={() => navigate('/edit/' + c.id)} />
              <div className="flexrow" style={{ gap: 6, margin: '6px 0 4px' }}>
                <button className="btn xs" onClick={() => navigate('/summary/' + c.id)}>
                  동선 보기
                </button>
                <button
                  className="btn xs"
                  onClick={() => {
                    store.setVisibility(c.id, c.visibility === 'public' ? 'private' : 'public')
                    store.toast(c.visibility === 'public' ? '비공개로 전환했어요' : '공개로 전환했어요')
                  }}
                >
                  {c.visibility === 'public' ? '비공개 전환' : '공개 전환'}
                </button>
                <button className="btn xs" onClick={() => navigate('/s/' + c.shareToken)}>
                  공유 화면
                </button>
                <button
                  className="btn xs"
                  onClick={() => {
                    store.deleteCourse(c.id)
                    store.toast('코스를 삭제했어요')
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}

        <div className="section-title">설정</div>
        <div className="card tap" onClick={() => navigate('/prefs/' + (store.draft?.id ?? ''))}>
          <div className="between">
            <span className="small bold">선호 조건 설정</span>
            <span className="textbtn">설정</span>
          </div>
          <div className="tiny muted" style={{ marginTop: 3 }}>
            이동수단 · 최대 이동시간 · 선호 장소 유형
          </div>
        </div>
        <div className="card tap" onClick={() => navigate('/admin')}>
          <div className="between">
            <span className="small bold">신고 관리 (관리자)</span>
            <span className="pill">{pending}건 대기</span>
          </div>
        </div>
        <div className="card tap" onClick={() => resetStore()}>
          <div className="between">
            <span className="small bold">프로토타입 데이터 초기화</span>
            <span className="textbtn">초기화</span>
          </div>
          <div className="tiny muted" style={{ marginTop: 3 }}>
            저장된 코스와 설정을 처음 상태로 되돌려요
          </div>
        </div>
      </div>
    </div>
  )
}
