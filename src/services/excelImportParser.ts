import * as XLSX from 'xlsx'

export interface ParsedExcelRow {
  rowNumber: number
  values: Record<string, unknown>
}

const companyHeaders = ['企业名称', '公司名称', '企业', 'companyName']
const jobHeaders = ['岗位名称', '职位名称', '岗位', '投递岗位', 'jobName']

function valueText(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return value === undefined || value === null ? '' : String(value).trim()
}

export function normalizeExcelHeader(value: unknown) {
  return valueText(value).replace(/[\s：:]+/g, '')
}

export function excelText(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeExcelHeader(key)]
    const result = valueText(value)
    if (result) return result
  }
  return ''
}

export function parseExcelRows(sheet: XLSX.WorkSheet): ParsedExcelRow[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: true,
  })
  const normalizedCompanies = new Set(companyHeaders.map(normalizeExcelHeader))
  const normalizedJobs = new Set(jobHeaders.map(normalizeExcelHeader))
  const headerIndex = matrix.findIndex((row) => {
    const headers = row.map(normalizeExcelHeader)
    return headers.some((item) => normalizedCompanies.has(item))
      && headers.some((item) => normalizedJobs.has(item))
  })

  if (headerIndex < 0) {
    throw new Error('未找到表头，请确认工作表中包含“企业名称”和“岗位”或“岗位名称”列')
  }

  const headers = matrix[headerIndex].map(normalizeExcelHeader)
  return matrix.slice(headerIndex + 1).flatMap((cells, index) => {
    const values: Record<string, unknown> = {}
    let hasValue = false
    headers.forEach((header, columnIndex) => {
      if (!header) return
      const value = cells[columnIndex] ?? ''
      values[header] = value
      if (valueText(value)) hasValue = true
    })
    return hasValue ? [{ rowNumber: headerIndex + index + 2, values }] : []
  })
}
