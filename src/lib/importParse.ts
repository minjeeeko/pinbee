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

/** 붙여넣거나 이미지에서 인식한 텍스트를 한 줄당 하나의 장소 후보 문자열로 나눈다 */
export function parseText(text: string): string[] {
  return text
    .split(/[\n,·|]/)
    .map((l) => l.replace(/^[\s\-*·•\d.)\]]+/, '').trim())
    .filter((l) => l.length >= 2)
    .slice(0, 12)
}

export const SUPPORTED_IMAGE = ['image/png', 'image/jpeg', 'image/webp', 'image/heic']
