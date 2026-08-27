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

/**
 * 검색어가 상호명과 얼마나 정확히 맞아떨어지는지 점수를 매긴다(0~1). 완전일치 > 이름 안의
 * 완결된 단어와 일치("야키토리 시오"의 "시오") > 접두어 일치("시오카레") > 부분 포함 > 그 외
 * 유사도 순으로 등급을 나눠서, 상호명 뒤쪽 단어로 검색해도 그 장소가 앞쪽 글자만 우연히 겹치는
 * 다른 장소들보다 먼저 뜨게 한다.
 */
export function nameMatchScore(query: string, name: string): number {
  const q = query.trim()
  const n = name.trim()
  if (!q || !n) return 0
  if (n === q) return 1
  if (n.split(/\s+/).includes(q)) return 0.95
  if (n.startsWith(q)) return 0.85
  if (n.includes(q)) return 0.75
  return similarity(q, n) * 0.6
}
