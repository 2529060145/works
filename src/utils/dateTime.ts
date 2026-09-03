export function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

export function localDateTimeValue(date = new Date()) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`
}

export function localDateValue(date = new Date()) {
  return localDateTimeValue(date).slice(0, 10)
}

export function displayDateTime(value?: string, timeTbd = false) {
  if (!value) return '时间待定'
  if (timeTbd) return `${value.slice(5, 10)} 时间待定`
  return value.slice(5, 16)
}

export function calendarTime(value?: string, timeTbd = false) {
  if (!value || timeTbd) return '待定'
  return value.slice(11, 16) || '全天'
}
