function parseUtcSystemTime(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized = trimmed.includes("T")
    ? trimmed
    : trimmed.replace(" ", "T");
  const parsed = new Date(hasZone ? normalized : `${normalized}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function normalizeDisplay(value: string) {
  return value.replace(/\//g, "-").replace(/\s+/g, " ");
}

export function formatLocalDateTime(value?: string | null) {
  const parsed = parseUtcSystemTime(value);
  return parsed ? normalizeDisplay(dateTimeFormatter.format(parsed)) : "未填写";
}

export function formatLocalDate(value?: string | null) {
  const parsed = parseUtcSystemTime(value);
  return parsed ? normalizeDisplay(dateFormatter.format(parsed)) : "未填写";
}

export function formatLocalTime(value?: string | null) {
  const parsed = parseUtcSystemTime(value);
  return parsed ? timeFormatter.format(parsed) : "未填写";
}

export function toUtcISOString(value: Date = new Date()) {
  return value.toISOString();
}
