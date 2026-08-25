import { useEffect, useMemo, useState } from 'react'
import { goBack, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { fetchAdminStats, isSavedCourseId, type AdminStats } from '../lib/db'
import { AppBar, Empty } from '../components/ui'

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="bold" style={{ fontSize: 22 }}>
        {value.toLocaleString('ko-KR')}
      </div>
      <div className="tiny muted" style={{ marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

function BreakdownList({ title, counts }: { title: string; counts: Record<string, number> }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...rows.map(([, n]) => n))
  return (
    <div style={{ marginTop: 20 }}>
      <div className="section-title" style={{ marginTop: 0 }}>
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="tiny muted">데이터가 없어요</div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {rows.map(([label, n]) => (
            <div key={label}>
              <div className="between" style={{ marginBottom: 4 }}>
                <span className="small">{label}</span>
                <span className="tiny muted">{n}명</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--surface)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(n / max) * 100}%`, background: 'var(--ink)', borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminDashboardScreen() {
  const store = useStore()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!store.user?.isAdmin) return
    fetchAdminStats()
      .then(setStats)
      .catch(() => setError('통계를 불러오지 못했어요'))
  }, [store.user?.isAdmin])

  // store.courses에는 아직 저장 안 한 로컬 초안(항상 private)도 섞여 있으므로 실제 저장된 코스만 센다
  const privateCourses = useMemo(
    () => store.courses.filter((c) => c.visibility === 'private' && isSavedCourseId(c.id)),
    [store.courses],
  )

  if (!store.user?.isAdmin) {
    return (
      <div className="screen">
        <AppBar title="관리자 대시보드" onBack={goBack} />
        <div className="scroll pad">
          <Empty title="접근 권한이 없어요" desc="관리자 계정으로 로그인해주세요." />
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <AppBar title="관리자 대시보드" onBack={goBack} />
      <div className="scroll pad">
        {error && <div className="banner alert" style={{ marginBottom: 12 }}>{error}</div>}

        {!stats ? (
          <div className="tiny muted">불러오는 중…</div>
        ) : (
          <>
            <div className="grid2" style={{ gap: 8 }}>
              <StatTile label="총 사용자" value={stats.totalUsers} />
              <StatTile label="최근 7일 신규 가입" value={stats.newUsers7d} />
              <StatTile label="총 코스" value={stats.totalCourses} />
              <StatTile label="공개 코스" value={stats.publicCourses} />
              <StatTile label="비공개 코스" value={stats.privateCourses} />
              <StatTile label="숨김 처리된 코스" value={stats.hiddenCourses} />
            </div>

            <button className="card tap" style={{ marginTop: 12, width: '100%', textAlign: 'left' }} onClick={() => navigate('/reports')}>
              <div className="between">
                <span className="small bold">신고 관리</span>
                <span className="pill">{stats.pendingReports}건 대기</span>
              </div>
            </button>

            <BreakdownList title="연령대 분포" counts={stats.ageGroupCounts} />
            <BreakdownList title="유입 경로 분포" counts={stats.referralSourceCounts} />
            <BreakdownList title="기대하는 기능 분포" counts={stats.expectedFeatureCounts} />
          </>
        )}

        <div className="section-title">전체 비공개 코스 ({privateCourses.length}개)</div>
        {privateCourses.length === 0 ? (
          <div className="tiny muted">비공개 코스가 없어요</div>
        ) : (
          privateCourses.map((c) => (
            <div className="card tap" key={c.id} onClick={() => navigate('/course/' + c.id)}>
              <div className="between">
                <div style={{ minWidth: 0 }}>
                  <div className="small bold truncate">{c.title || '이름 없는 코스'}</div>
                  <div className="tiny muted truncate">
                    {c.authorName || '작성자 불명'} · {c.places.length}곳
                  </div>
                </div>
                {c.hidden && <span className="pill">숨김</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
