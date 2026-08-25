import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { CourseCard } from '../components/common'
import { AppBar, Empty } from '../components/ui'

export default function MyCoursesScreen() {
  const store = useStore()

  if (!store.user) {
    return (
      <div className="screen">
        <AppBar title="내 코스" onBack={goBack} />
        <div className="scroll pad">
          <Empty
            title="로그인하지 않았어요"
            desc="저장한 내 코스를 보려면 로그인해주세요."
            action={
              <button className="btn primary" onClick={() => navigate('/login?next=' + encodeURIComponent('/my-courses'))}>
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
      <AppBar title="내 코스" sub={`${store.myCourses.length}개`} onBack={goBack} />
      <div className="scroll pad">
        {store.myCourses.length === 0 ? (
          <Empty title="저장한 코스가 없어요" desc="장소를 담아 코스를 만들고 저장해보세요." />
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
      </div>
    </div>
  )
}
