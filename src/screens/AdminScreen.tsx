import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { AppBar, Empty } from '../components/ui'

const STATUS_LABEL: Record<string, string> = {
  pending: '검토 대기',
  hidden: '숨김 처리',
  deleted: '삭제 처리',
  rejected: '신고 기각',
}

export default function AdminScreen() {
  const store = useStore()

  if (!store.user?.isAdmin) {
    return (
      <div className="screen">
        <AppBar title="신고 관리" onBack={goBack} />
        <div className="scroll pad">
          <Empty title="접근 권한이 없어요" desc="관리자 계정으로 로그인해주세요." />
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <AppBar title="신고 관리" sub="관리자 검토 목록" onBack={goBack} />
      <div className="scroll pad">
        {store.reports.length === 0 ? (
          <Empty title="접수된 신고가 없어요" desc="공개 코스 상세에서 신고하면 여기에 쌓여요." />
        ) : (
          store.reports.map((r) => {
            const course = store.getCourse(r.courseId)
            return (
              <div className="card" key={r.id}>
                <div className="between">
                  <div style={{ minWidth: 0 }}>
                    <div className="bold small truncate">{course?.title ?? '삭제된 코스'}</div>
                    <div className="tiny muted">
                      사유: {r.reason} · {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <span className="pill">{STATUS_LABEL[r.status]}</span>
                </div>

                {course && (
                  <button className="btn xs" style={{ marginTop: 10 }} onClick={() => navigate('/course/' + course.id)}>
                    코스 열어보기
                  </button>
                )}

                {r.status === 'pending' && (
                  <div className="flexrow" style={{ gap: 6, marginTop: 10 }}>
                    <button
                      className="btn xs"
                      onClick={() => {
                        store.resolveReport(r.id, 'hidden')
                        store.toast('코스를 숨김 처리했어요')
                      }}
                    >
                      숨김
                    </button>
                    <button
                      className="btn xs"
                      onClick={() => {
                        store.resolveReport(r.id, 'deleted')
                        store.toast('코스를 삭제했어요')
                      }}
                    >
                      삭제
                    </button>
                    <button
                      className="btn xs"
                      onClick={() => {
                        store.resolveReport(r.id, 'rejected')
                        store.toast('신고를 기각했어요')
                      }}
                    >
                      기각
                    </button>
                  </div>
                )}
                {r.status === 'hidden' && (
                  <div className="banner" style={{ marginTop: 10 }}>
                    숨김 처리된 코스는 공개 목록과 공유 링크에서 이용 불가로 표시돼요.
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
