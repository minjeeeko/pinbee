// Supabase Edge Function: 네이버 지역 검색(상호명 검색) API 프록시.
//
// NCP Maps의 Geocoding은 "주소 -> 좌표"만 되고, "스타벅스 강남점" 같은 상호명 검색은 되지 않는다.
// 상호명 검색은 NCP API HUB(예전 Naver Developers Center의 검색 API가 이관된 것)의 검색 > 지역 API를 쓴다.
// 이 API도 REST 전용이라 Secret이 필요해서, 브라우저에서 직접 부르면 노출된다 — 그래서 directions와
// 같은 방식으로 Edge Function이 대신 호출한다.
//
// 주의: NAVER API HUB는 예전 openapi.naver.com(X-Naver-Client-Id 헤더) 방식과 호출 주소·인증 헤더가
// 다르다. 반드시 NCP 콘솔 > NAVER API HUB > Application에서 발급된 Client ID/Secret을 써야 하고
// (developers.naver.com의 옛 자격증명은 안 먹는다), 헤더도 X-NCP-APIGW-API-KEY-ID / X-NCP-APIGW-API-KEY다.
//
// 배포 전 Supabase 프로젝트에 시크릿을 등록해야 한다:
//   supabase secrets set NAVER_SEARCH_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx NAVER_SEARCH_CLIENT_SECRET=xxxxxxxxxx
// 배포:
//   supabase functions deploy local-search
//
// 요청 바디: { query: string }
// 성공 응답: { items: Array<{ name, address, roadAddress, category, telephone, lat, lng }> }
// 실패 응답: { error: string } (4xx/5xx)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  })
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, '')
}

/**
 * 네이버 지역 검색 응답을 좌표 포함 장소 목록으로 바꾼다.
 * mapx/mapy는 경도·위도에 10^7을 곱한 정수 문자열이다(예: "1270016180" -> 127.001618).
 * 응답 형식이 예상과 다르면 빈 배열을 돌려준다.
 */
export function parseLocalSearchResponse(data: any): Array<{
  name: string
  address: string
  roadAddress: string
  category: string
  telephone: string
  lat: number
  lng: number
}> {
  const items = data?.items
  if (!Array.isArray(items)) return []
  return items
    .map((item: any) => {
      const lng = Number(item.mapx) / 1e7
      const lat = Number(item.mapy) / 1e7
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null
      return {
        name: stripTags(item.title ?? ''),
        address: item.address ?? '',
        roadAddress: item.roadAddress ?? '',
        category: item.category ?? '',
        telephone: item.telephone ?? '',
        lat,
        lng,
      }
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'POST만 지원해요.' }, 405)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: '요청 본문을 읽지 못했어요.' }, 400)
  }

  const query = typeof body?.query === 'string' ? body.query.trim() : ''
  if (!query) return json({ error: '검색어가 비어있어요.' }, 400)

  const clientId = Deno.env.get('NAVER_SEARCH_CLIENT_ID')
  const clientSecret = Deno.env.get('NAVER_SEARCH_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    return json({ error: 'Naver 검색 API Client ID/Secret이 설정되지 않았어요 (supabase secrets set 필요).' }, 500)
  }

  const url = new URL('https://naverapihub.apigw.ntruss.com/search/v1/local')
  url.searchParams.set('query', query)
  url.searchParams.set('display', '7')

  try {
    const res = await fetch(url, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
      },
    })
    if (!res.ok) {
      // 원인 파악이 쉽도록 응답 본문 일부를 에러 메시지에 그대로 담는다
      const bodyText = await res.text().catch(() => '')
      return json({ error: `네이버 검색 API 오류 (${res.status}) ${bodyText.slice(0, 200)}` }, 502)
    }
    const data = await res.json()
    return json({ items: parseLocalSearchResponse(data) }, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
