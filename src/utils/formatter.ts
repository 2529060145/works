export function emptyText(value: unknown) {
  return value === null || value === undefined || value === '' ? '-' : String(value)
}
