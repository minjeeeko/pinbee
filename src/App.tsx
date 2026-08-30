import { useEffect, useState } from 'react'
import { navigate, useRoute } from './lib/router'
import { useStore } from './lib/store'
import { Toasts } from './components/ui'
import { SplashScreen } from './components/SplashScreen'
import HomeScreen from './screens/HomeScreen'
import EditScreen from './screens/EditScreen'
import OrderScreen from './screens/OrderScreen'
import SummaryScreen from './screens/SummaryScreen'
import SearchScreen from './screens/SearchScreen'
import SaveScreen from './screens/SaveScreen'
import PublicCourseScreen from './screens/PublicCourseScreen'
import ExploreScreen from './screens/ExploreScreen'
import SavedPlacesScreen from './screens/SavedPlacesScreen'
import MeScreen from './screens/MeScreen'
import PrefsScreen from './screens/PrefsScreen'
import LoginScreen from './screens/LoginScreen'
import AdminScreen from './screens/AdminScreen'
import AdminDashboardScreen from './screens/AdminDashboardScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import MyCoursesScreen from './screens/MyCoursesScreen'

const SPLASH_SEEN_KEY = 'routiz.splashSeen.v1'

const TABS = [
  { key: '', label: '내 코스' },
  { key: 'explore', label: '탐색' },
  { key: 'saved', label: '저장 장소' },
  { key: 'me', label: '내 정보' },
]

export default function App() {
  const route = useRoute()
  const store = useStore()
  const [head, param] = route.segments

  // 스플래시는 앱을 처음 실행할 때만 보여준다 — 한 번 보여준 뒤에는 localStorage에 표시를
  // 남겨서, 이후 재실행·새로고침 때는 최소 노출 시간·로그인 확인을 기다리지 않고 바로 화면을 띄운다.
  const [firstLaunch] = useState(() => {
    try {
      return localStorage.getItem(SPLASH_SEEN_KEY) !== '1'
    } catch {
      return true
    }
  })
  const [minTimeDone, setMinTimeDone] = useState(!firstLaunch)
  useEffect(() => {
    if (!firstLaunch) return
    const t = setTimeout(() => {
      setMinTimeDone(true)
      try {
        localStorage.setItem(SPLASH_SEEN_KEY, '1')
      } catch {
        /* 저장 공간을 못 쓰는 환경이면 다음에도 스플래시가 다시 뜨는 정도로 조용히 넘어간다 */
      }
    }, 3000)
    return () => clearTimeout(t)
  }, [firstLaunch])
  const showSplash = firstLaunch && (!minTimeDone || store.authLoading)

  useEffect(() => {
    if (!window.location.hash) navigate('/', true)
  }, [])

  // 편집 화면에 진입할 때 편집 대상 코스를 활성 코스로 맞춘다
  useEffect(() => {
    const editRoutes = ['edit', 'order', 'summary', 'search', 'save', 'prefs']
    if (editRoutes.includes(head) && param && param !== store.draftId) store.setDraftId(param)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [head, param])

  // 로그인은 했는데 선호 조건(온보딩)을 아직 저장한 적 없으면 온보딩으로 보낸다
  useEffect(() => {
    if (store.user && store.onboarded === false && head !== 'onboarding') {
      navigate('/onboarding', true)
    }
  }, [store.user, store.onboarded, head])

  const tabKey = head ?? ''
  const isTab = TABS.some((t) => t.key === tabKey) && !param

  const render = () => {
    switch (head) {
      case undefined:
        return <HomeScreen />
      case 'explore':
        return <ExploreScreen />
      case 'saved':
        return <SavedPlacesScreen />
      case 'me':
        return <MeScreen />
      case 'edit':
        return <EditScreen courseId={param} />
      case 'order':
        return <OrderScreen courseId={param} />
      case 'summary':
        return <SummaryScreen courseId={param} />
      case 'search':
        return <SearchScreen courseId={param} />
      case 'save':
        return <SaveScreen courseId={param} />
      case 'prefs':
        return <PrefsScreen courseId={param} />
      case 'course':
        return <PublicCourseScreen courseId={param} />
      case 's':
        return <PublicCourseScreen token={param} />
      case 'login':
        return <LoginScreen />
      case 'onboarding':
        return <OnboardingScreen />
      case 'my-courses':
        return <MyCoursesScreen />
      case 'admin':
        return <AdminDashboardScreen />
      case 'reports':
        return <AdminScreen />
      default:
        return <HomeScreen />
    }
  }

  return (
    <div className="phone-wrap">
      <div className="phone">
        {render()}
        {isTab && (
          <nav className="tabbar">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={tabKey === t.key ? 'on' : ''}
                onClick={() => navigate('/' + t.key)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
        <Toasts />
        {showSplash && <SplashScreen />}
      </div>
    </div>
  )
}
