/** 받침 유무에 따라 조사를 고른다 */
export function josa(word: string, withBatchim: string, withoutBatchim: string) {
  const last = word.trim().slice(-1)
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return withoutBatchim
  return (code - 0xac00) % 28 > 0 ? withBatchim : withoutBatchim
}
