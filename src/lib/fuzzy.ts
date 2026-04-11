/** fzf 风格子序列匹配：query 的每个字符按顺序出现在 candidate 中即为匹配 */
export function fuzzyMatch(query: string, candidate: string): boolean {
  const q = query.toLowerCase()
  const s = candidate.toLowerCase()
  let qi = 0
  for (let ci = 0; ci < s.length && qi < q.length; ci++) {
    if (s[ci] === q[qi]) qi++
  }
  return qi === q.length
}

export function filterConfigs(query: string, configNames: string[]): string[] {
  return configNames.filter((name) => fuzzyMatch(query, name))
}
