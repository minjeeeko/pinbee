import type { ImportCandidate, Place } from './types'
import { PLACES } from '../data/places'
import { uid } from './store'

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^가-힣a-z0-9]/g, '')
    .trim()

function bigrams(s: string) {
  const out: string[] = []
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2))
  return out.length ? out : [s]
}

/** 0~1 유사도 (dice 계수) */
export function similarity(a: string, b: string) {
  const A = bigrams(normalize(a))
  const B = bigrams(normalize(b))
  if (!A.length || !B.length) return 0
  const setB = new Map<string, number>()
  B.forEach((g) => setB.set(g, (setB.get(g) ?? 0) + 1))
  let hit = 0
  A.forEach((g) => {
    const n = setB.get(g) ?? 0
    if (n > 0) {
      hit++
      setB.set(g, n - 1)
    }
  })
  return (2 * hit) / (A.length + B.length)
}

export function matchPlaces(query: string, limit = 5): { place: Place; score: number }[] {
  const q = normalize(query)
  if (!q) return []
  return PLACES.map((place) => {
    const name = normalize(place.name)
    let score = similarity(q, place.name)
    if (name.includes(q) || q.includes(name)) score = Math.max(score, 0.82)
    return { place, score }
  })
    .filter((r) => r.score > 0.18)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** 붙여넣은 텍스트에서 장소 후보를 추출한다 */
export function parseText(text: string): ImportCandidate[] {
  return text
    .split(/[\n,·|]/)
    .map((l) => l.replace(/^[\s\-*·•\d.)\]]+/, '').trim())
    .filter((l) => l.length >= 2)
    .slice(0, 12)
    .map((raw) => {
      const best = matchPlaces(raw, 1)[0]
      if (best && best.score >= 0.6) {
        return { id: uid('ic'), raw, status: 'matched' as const, placeId: best.place.id, excluded: false }
      }
      if (best && best.score >= 0.28) {
        return { id: uid('ic'), raw, status: 'ambiguous' as const, placeId: best.place.id, excluded: false }
      }
      return { id: uid('ic'), raw, status: 'failed' as const, placeId: null, excluded: false }
    })
}

export const SUPPORTED_IMAGE = ['image/png', 'image/jpeg', 'image/webp', 'image/heic']

/**
 * 캡처 이미지에서 장소명을 인식한다.
 * 프로토타입에서는 실제 OCR 대신 인식 지연과 결과를 시뮬레이션한다.
 */
export function extractFromImage(file: File): Promise<ImportCandidate[]> {
  return new Promise((resolve, reject) => {
    if (!SUPPORTED_IMAGE.includes(file.type)) {
      reject(new Error('PNG · JPG · WEBP 이미지만 인식할 수 있어요.'))
      return
    }
    setTimeout(() => {
      resolve(parseText(['연남 로스터리 커피', '망원 베이커리', '○○분식', '경의선 책거리'].join('\n')))
    }, 1200)
  })
}
