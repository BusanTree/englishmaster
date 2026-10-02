export function lessonScore(best: Readonly<Record<string, number>>, itemKeys: readonly string[]): number {
  if (itemKeys.length === 0) return 0
  return Math.round(itemKeys.reduce((sum, key) => sum + (best[key] ?? 0), 0) / itemKeys.length)
}
