import { useEffect } from 'react'
import { navigate, useRoute } from './lib/router'
import { useStore } from './lib/store'
import { Toasts } from './components/ui'
import HomeScreen from './screens/HomeScreen'
import EditScreen from './screens/EditScreen'
import OrderScreen from './screens/OrderScreen'
import SummaryScreen from './screens/SummaryScreen'
import TimelineScreen from './screens/TimelineScreen'
import SearchScreen from './screens/SearchScreen'
import ImportScreen from './screens/ImportScreen'
import SaveScreen from './screens/SaveScreen'
import PublicCourseScreen from './screens/PublicCourseScreen'
import ExploreScreen from './screens/ExploreScreen'
import SavedPlacesScreen from './screens/SavedPlacesScreen'
import MeScreen from './screens/MeScreen'
import PrefsScreen from './screens/PrefsScreen'
import LoginScreen from './screens/LoginScreen'
import AdminScreen from './screens/AdminScreen'

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

  useEffect(() => {
    if (!window.location.hash) navigate('/', true)
  }, [])

  // 편집 화면에 진입할 때 편집 대상 코스를 활성 코스로 맞춘다
  useEffect(() => {
    const editRoutes = ['edit', 'order', 'summary', 'search', 'import', 'save', 'prefs', 'timeline']
    if (editRoutes.includes(head) && param && param !== store.draftId) store.setDraftId(param)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [head, param])

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
      case 'timeline':
        return <TimelineScreen courseId={param} />
      case 'search':
        return <SearchScreen courseId={param} />
      case 'import':
        return <ImportScreen courseId={param} />
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
      case 'admin':
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
      </div>
    </div>
  )
}
