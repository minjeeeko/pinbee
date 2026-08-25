/**
 * 네이버 지도(Dynamic Map) SDK 로더.
 *
 * Client ID는 웹 서비스 URL 제한으로 보호되는 공개 식별자라 번들에 포함해도 안전하다.
 * Client Secret은 서버 간 REST 호출(geocoding 등)에만 쓰이므로 이 클라이언트 코드에서는 사용하지 않는다.
 * .env.local(또는 Vercel 환경변수)의 VITE_NAVER_MAP_CLIENT_ID로 넣는다.
 */
export const NAVER_MAP_CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined
export const isNaverMapConfigured = Boolean(NAVER_MAP_CLIENT_ID)

declare global {
  interface Window {
    naver: any
    navermap_authFailure?: () => void
  }
}

type Listener = () => void

const authFailListeners = new Set<Listener>()
let authFailed = false

/** 인증 실패(잘못된 키 또는 미등록 서비스 URL) 시 알림을 받는다 */
export function onNaverMapAuthFail(listener: Listener) {
  authFailListeners.add(listener)
  if (authFailed) listener()
  return () => authFailListeners.delete(listener)
}

let loadPromise: Promise<void> | null = null

/** SDK 스크립트를 한 번만 로드한다 */
export function loadNaverMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('브라우저 환경이 아니에요.'))
  if (!isNaverMapConfigured) return Promise.reject(new Error('네이버 지도 Client ID(VITE_NAVER_MAP_CLIENT_ID)가 설정되지 않았어요.'))
  if (window.naver?.maps) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    window.navermap_authFailure = () => {
      authFailed = true
      authFailListeners.forEach((fn) => fn())
      reject(new Error('네이버 지도 인증에 실패했어요. Client ID 또는 등록된 서비스 URL을 확인해주세요.'))
    }
    const script = document.createElement('script')
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAP_CLIENT_ID}`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('네이버 지도 스크립트를 불러오지 못했어요.'))
    document.head.appendChild(script)
  })
  return loadPromise
}
