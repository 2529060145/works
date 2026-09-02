export function isWithinDays(dateText: string, days: number) {
  const target = new Date(dateText).getTime()
  const now = Date.now()
  return Number.isFinite(target) && target >= now && target <= now + days * 24 * 60 * 60 * 1000
}
