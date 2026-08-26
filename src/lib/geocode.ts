import { loadNaverMaps } from './naverMaps'
import type { Place } from './types'

export interface GeocodeResult {
  /** 도로명 주소 (없을 수 있음) */
  roadAddress: string
  /** 지번 주소 (없을 수 있음) */
  jibunAddress: string
  lat: number
  lng: number
}

/** '서울 마포구 …' 같은 주소에서 앱이 쓰는 지역명 표기('마포')를 뽑아낸다. 상호명 검색 결과에도 재사용한다 */
export function extractRegion(address: string): string {
  const m = address.match(/([가-힣]{2,6}(구|군|시))/)
  return m ? m[1].replace(/(구|군|시)$/, '') : '기타 지역'
}

/**
 * 주소 검색 결과를 코스·저장 장소에 쓸 수 있는 Place로 바꾼다.
 * 좌표를 기준으로 id를 만들어, 같은 곳을 여러 번 검색해도 같은 장소로 취급된다.
 * 업종 정보는 Geocoding으로 알 수 없어 카테고리는 '기타'로 둔다.
 */
export function geocodeResultToPlace(result: GeocodeResult, name: string): Place {
  const address = result.roadAddress || result.jibunAddress
  return {
    id: `p-geo-${result.lat.toFixed(6)}-${result.lng.toFixed(6)}`,
    name: name.trim() || address,
    address,
    region: extractRegion(address),
    category: '기타',
    lat: result.lat,
    lng: result.lng,
    likeCount: 0,
  }
}

/**
 * 지번·도로명 주소나 장소명으로 좌표·상세 주소를 찾는다.
 * naver.maps.Service.geocode(submodules=geocoder)를 쓰므로 지도와 같은 Client ID·도메인
 * 인증만으로 동작하고, Client Secret이 필요한 서버 간 호출은 거치지 않는다.
 */
export function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  return loadNaverMaps().then(
    () =>
      new Promise<GeocodeResult[]>((resolve, reject) => {
        const naver = window.naver
        if (!naver?.maps?.Service) {
          reject(new Error('주소 검색 기능을 불러오지 못했어요.'))
          return
        }
        naver.maps.Service.geocode({ query }, (status: string, response: any) => {
          if (status !== naver.maps.Service.Status.OK) {
            reject(new Error('주소를 찾지 못했어요.'))
            return
          }
          const addresses = response?.v2?.addresses ?? []
          resolve(
            addresses.map((a: any) => ({
              roadAddress: a.roadAddress ?? '',
              jibunAddress: a.jibunAddress ?? '',
              lat: parseFloat(a.y),
              lng: parseFloat(a.x),
            })),
          )
        })
      }),
  )
}
