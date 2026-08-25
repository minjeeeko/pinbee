// Supabase Edge Function: NCP Directions 5(자동차 길찾기) API 프록시.
//
// Directions 5는 REST 전용 API라 호출할 때 Client Secret이 꼭 필요하다(X-NCP-APIGW-API-KEY 헤더).
// Geocoding과 달리 브라우저에서 도메인 인증만으로는 쓸 수 없어서, 여기(Edge Function)에서만
// Secret을 갖고 대신 호출한다 — 브라우저·Vercel 환경변수에는 Client Secret이 절대 들어가지 않는다.
//
// 배포 전 Supabase 프로젝트에 시크릿을 등록해야 한다 (Supabase CLI):
//   supabase secrets set NAVER_MAP_CLIENT_ID=xxxxxxxxxx NAVER_MAP_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// 배포:
//   supabase functions deploy directions
//
// 요청 바디: { start: { lat, lng }, goal: { lat, lng } }
// 성공 응답: { distanceMeters: number, durationMs: number }
// 실패 응답: { error: string } (4xx/5xx)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface LatLng {
  lat: number
  lng: number
}

function isValidLatLng(v: unknown): v is LatLng {
  const p = v as LatLng | null
  return !!p && typeof p.lat === 'number' && typeof p.lng === 'number' && Number.isFinite(p.lat) && Number.isFinite(p.lng)
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  })
}

/** NCP Directions 5 응답에서 필요한 값만 뽑아낸다. 응답 형식이 예상과 다르면 null. */
export function parseDirectionsResponse(data: any): { distanceMeters: number; durationMs: number } | null {
  if (!data || data.code !== 0) return null
  const summary = data.route?.trafast?.[0]?.summary
  if (!summary || typeof summary.distance !== 'number' || typeof summary.duration !== 'number') return null
  return { distanceMeters: summary.distance, durationMs: summary.duration }
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

  const { start, goal } = body ?? {}
  if (!isValidLatLng(start) || !isValidLatLng(goal)) {
    return json({ error: 'start·goal 좌표가 올바르지 않아요.' }, 400)
  }

  const clientId = Deno.env.get('NAVER_MAP_CLIENT_ID')
  const clientSecret = Deno.env.get('NAVER_MAP_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    return json({ error: 'NCP Client ID/Secret이 설정되지 않았어요 (supabase secrets set 필요).' }, 500)
  }

  const url = new URL('https://maps.apigw.ntruss.com/map-direction/v1/driving')
  // NCP는 "경도,위도(lng,lat)" 순서로 좌표를 받는다
  url.searchParams.set('start', `${start.lng},${start.lat}`)
  url.searchParams.set('goal', `${goal.lng},${goal.lat}`)
  url.searchParams.set('option', 'trafast')

  try {
    const res = await fetch(url, {
      headers: {
        'x-ncp-apigw-api-key-id': clientId,
        'x-ncp-apigw-api-key': clientSecret,
      },
    })
    const data = await res.json()
    const parsed = parseDirectionsResponse(data)
    if (!parsed) {
      return json({ error: data?.message || '경로를 찾지 못했어요.' }, 502)
    }
    return json(parsed, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
