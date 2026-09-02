export function formatSalaryRange(min?: number, max?: number, months?: number) {
  if (!min && !max) return ''
  const range = [min, max].filter((item) => typeof item === 'number').join('-')
  return months ? `${range}薪 x ${months}` : range
}
