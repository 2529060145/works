import type { Company, CompanyInput } from '../types/company'
import { execute, select } from './databaseService'

const companyColumns = `id, company_name AS "companyName", company_type AS "companyType",
  official_website AS "officialWebsite", recruitment_website AS "recruitmentWebsite",
  recruitment_batch AS "recruitmentBatch", headquarters, description, notes,
  application_limit_type AS "applicationLimitType", max_applications AS "maxApplications",
  created_at AS "createdAt", updated_at AS "updatedAt"`

export async function listCompanies(keyword = ''): Promise<(Company & { jobCount: number; appliedCount: number })[]> {
  const value = `%${keyword.trim()}%`
  return select<Company & { jobCount: number; appliedCount: number }>(
    `SELECT ${companyColumns}, (SELECT COUNT(*) FROM jobs j WHERE j.company_id = companies.id) AS "jobCount",
      (SELECT COUNT(*) FROM jobs j JOIN applications a ON a.job_id=j.id
        WHERE j.company_id=companies.id AND (a.application_date IS NOT NULL OR COALESCE(a.stage,'TO_APPLY')<>'TO_APPLY')) AS "appliedCount"
     FROM companies WHERE company_name LIKE ? OR headquarters LIKE ? OR company_type LIKE ?
     ORDER BY updated_at DESC`,
    [value, value, value],
  )
}

export async function getCompany(id: number) {
  const rows = await select<Company>(`SELECT ${companyColumns} FROM companies WHERE id = ?`, [id])
  return rows[0] ?? null
}

export async function findCompanyByName(companyName: string) {
  const rows = await select<Company>(
    `SELECT ${companyColumns} FROM companies WHERE company_name = ? COLLATE NOCASE LIMIT 1`,
    [companyName.trim()],
  )
  return rows[0] ?? null
}

export async function ensureCompany(companyName: string) {
  const normalizedName = companyName.trim()
  if (!normalizedName) throw new Error('请输入企业名称')
  const existing = await findCompanyByName(normalizedName)
  if (existing) return existing
  try {
    const id = Number(await saveCompany({ companyName: normalizedName }))
    const created = await getCompany(id)
    if (!created) throw new Error('企业创建后读取失败')
    return created
  } catch (error) {
    const concurrent = await findCompanyByName(normalizedName)
    if (concurrent) return concurrent
    throw error
  }
}

export async function saveCompany(input: CompanyInput, id?: number) {
  const limitType = input.applicationLimitType ?? 'UNKNOWN'
  const maxApplications = limitType === 'LIMITED' ? input.maxApplications ?? 1 : null
  const values = [input.companyName.trim(), input.companyType || null, input.officialWebsite || null,
    input.recruitmentWebsite || null, input.recruitmentBatch || null, input.headquarters || null,
    input.description || null, input.notes || null, limitType, maxApplications]
  if (id) {
    await execute(`UPDATE companies SET company_name=?, company_type=?, official_website=?, recruitment_website=?,
      recruitment_batch=?, headquarters=?, description=?, notes=?, application_limit_type=?, max_applications=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...values, id])
    return id
  }
  const result = await execute(`INSERT INTO companies(company_name, company_type, official_website, recruitment_website,
    recruitment_batch, headquarters, description, notes, application_limit_type, max_applications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, values)
  return result.lastInsertId
}

export async function deleteCompany(id: number) {
  await execute('DELETE FROM companies WHERE id = ?', [id])
}
