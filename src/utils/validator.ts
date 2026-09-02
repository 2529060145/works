export function isHttpUrl(value: string) {
  return /^https?:\/\/.+/i.test(value)
}
