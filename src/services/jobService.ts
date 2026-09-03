import type { ApplicationStage } from '../types/application'
import type { Job, JobInput } from '../types/job'
import { execute, getDatabase, select } from './databaseService'
import { decorateJobEligibility } from './applicationEligibilityService'

const jobColumns = `j.id, j.company_id AS "companyId", c.company_name AS "companyName", j.job_name AS "jobName",
  j.location, j.recruitment_batch AS "recruitmentBatch", j.salary_text AS "salaryText",
  j.salary_min AS "salaryMin", j.salary_max AS "salaryMax", j.salary_months AS "salaryMonths",
  j.education, j.major_requirement AS "majorRequirement", j.job_requirement AS "jobRequirement",
  j.recruitment_count AS "recruitmentCount", j.publish_date AS "publishDate", j.deadline,
  j.job_url AS "jobUrl", j.notes, j.created_at AS "createdAt", j.updated_at AS "updatedAt",
  COALESCE(a.stage, 'TO_APPLY') AS stage, a.application_date AS "applicationDate"`

export interface JobQuery {
  keyword?: string
  companyId?: number
  stage?: ApplicationStage | ''
  location?: string
  companyType?: string
  recruitmentBatch?: string
  page?: number
  pageSize?: number
  sort?: 'updated' | 'deadline' | 'company'
}

export async function listJobs(query: JobQuery = {}) {
  const clauses: string[] = ['1=1']
  const values: unknown[] = []
  if (query.keyword?.trim()) {
    const value = `%${query.keyword.trim()}%`
    clauses.push('(j.job_name LIKE ? OR c.company_name LIKE ? OR j.location LIKE ? OR j.notes LIKE ?)')
    values.push(value, value, value, value)
  }
  if (query.companyId) {
    clauses.push('j.company_id = ?')
    values.push(query.companyId)
  }
  if (query.stage) {
    clauses.push("COALESCE(a.stage, 'TO_APPLY') = ?")
    values.push(query.stage)
  }
  if (query.location?.trim()) {
    clauses.push('j.location LIKE ?')
    values.push(`%${query.location.trim()}%`)
  }
  if (query.companyType?.trim()) {
    clauses.push('c.company_type = ?')
    values.push(query.companyType.trim())
  }
  if (query.recruitmentBatch?.trim()) {
    clauses.push('j.recruitment_batch = ?')
    values.push(query.recruitmentBatch.trim())
  }
  const order = query.sort === 'deadline' ? 'j.deadline IS NULL, j.deadline ASC'
    : query.sort === 'company' ? 'c.company_name ASC, j.job_name ASC' : 'j.updated_at DESC'
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20))
  const where = clauses.join(' AND ')
  const countRows = await select<{ count: number }>(`SELECT COUNT(*) AS count FROM jobs j JOIN companies c ON c.id=j.company_id LEFT JOIN applications a ON a.job_id=j.id WHERE ${where}`, values)
  const items = await select<Job>(`SELECT ${jobColumns}, COALESCE(c.application_limit_type,'UNKNOWN') AS "applicationLimitType",
    c.max_applications AS "maxApplications",
    (SELECT COUNT(*) FROM jobs counted_job JOIN applications counted_application ON counted_application.job_id=counted_job.id
      WHERE counted_job.company_id=c.id AND counted_application.application_date IS NOT NULL) AS "companyAppliedCount"
    FROM jobs j JOIN companies c ON c.id=j.company_id LEFT JOIN applications a ON a.job_id=j.id
    WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...values, pageSize, (page - 1) * pageSize])
  return { items: items.map(decorateJobEligibility), total: Number(countRows[0]?.count ?? 0) }
}

export async function listJobLibrary(query: Omit<JobQuery, 'page' | 'pageSize'> = {}) {
  const clauses: string[] = ['1=1']
  const values: unknown[] = []
  if (query.keyword?.trim()) {
    const value = `%${query.keyword.trim()}%`
    clauses.push('(j.job_name LIKE ? OR c.company_name LIKE ? OR j.location LIKE ? OR j.recruitment_batch LIKE ? OR j.notes LIKE ?)')
    values.push(value, value, value, value, value)
  }
  if (query.stage) {
    clauses.push("COALESCE(a.stage, 'TO_APPLY') = ?")
    values.push(query.stage)
  }
  if (query.location?.trim()) {
    clauses.push('(j.location LIKE ? OR c.headquarters LIKE ?)')
    const location = `%${query.location.trim()}%`
    values.push(location, location)
  }
  if (query.companyType?.trim()) {
    clauses.push('c.company_type = ?')
    values.push(query.companyType.trim())
  }
  if (query.recruitmentBatch?.trim()) {
    clauses.push('j.recruitment_batch = ?')
    values.push(query.recruitmentBatch.trim())
  }
  const order = query.sort === 'deadline' ? 'c.company_name ASC, j.deadline IS NULL, j.deadline ASC'
    : query.sort === 'updated' ? 'c.updated_at DESC, j.updated_at DESC' : 'c.company_name ASC, j.job_name ASC'
  const jobs = await select<Job>(`SELECT ${jobColumns}, c.company_type AS "companyType", c.headquarters,
    COALESCE(c.application_limit_type,'UNKNOWN') AS "applicationLimitType", c.max_applications AS "maxApplications",
    (SELECT COUNT(*) FROM jobs counted_job JOIN applications counted_application ON counted_application.job_id=counted_job.id
      WHERE counted_job.company_id=c.id AND counted_application.application_date IS NOT NULL) AS "companyAppliedCount"
    FROM jobs j JOIN companies c ON c.id=j.company_id LEFT JOIN applications a ON a.job_id=j.id
    WHERE ${clauses.join(' AND ')} ORDER BY ${order}`, values)
  const decorated = jobs.map(decorateJobEligibility)
  return query.stage === 'TO_APPLY' ? decorated.filter(job => !job.applicationBlocked) : decorated
}

export async function listJobLibraryOptions() {
  const [locations, companyTypes, batches] = await Promise.all([
    select<{ value: string }>(`SELECT DISTINCT location AS value FROM jobs WHERE TRIM(COALESCE(location, '')) <> '' ORDER BY location`),
    select<{ value: string }>(`SELECT DISTINCT company_type AS value FROM companies WHERE TRIM(COALESCE(company_type, '')) <> '' ORDER BY company_type`),
    select<{ value: string }>(`SELECT DISTINCT recruitment_batch AS value FROM jobs WHERE TRIM(COALESCE(recruitment_batch, '')) <> '' ORDER BY recruitment_batch`),
  ])
  return {
    locations: locations.map(item => item.value),
    companyTypes: companyTypes.map(item => item.value),
    batches: batches.map(item => item.value),
  }
}

export async function getJob(id: number) {
  const rows = await select<Job>(`SELECT ${jobColumns}, COALESCE(c.application_limit_type,'UNKNOWN') AS "applicationLimitType",
    c.max_applications AS "maxApplications",
    (SELECT COUNT(*) FROM jobs counted_job JOIN applications counted_application ON counted_application.job_id=counted_job.id
      WHERE counted_job.company_id=c.id AND counted_application.application_date IS NOT NULL) AS "companyAppliedCount"
    FROM jobs j JOIN companies c ON c.id=j.company_id LEFT JOIN applications a ON a.job_id=j.id WHERE j.id=?`, [id])
  return rows[0] ? decorateJobEligibility(rows[0]) : null
}

export async function saveJob(input: JobInput, id?: number) {
  const values = [input.companyId, input.jobName.trim(), input.location || null, input.recruitmentBatch || null,
    input.salaryText || null, input.salaryMin ?? null, input.salaryMax ?? null, input.salaryMonths ?? null,
    input.education || null, input.majorRequirement || null, input.jobRequirement || null,
    input.recruitmentCount ?? 0, input.publishDate || null, input.deadline || null, input.jobUrl || null, input.notes || null]
  if (id) {
    await execute(`UPDATE jobs SET company_id=?, job_name=?, location=?, recruitment_batch=?, salary_text=?, salary_min=?,
      salary_max=?, salary_months=?, education=?, major_requirement=?, job_requirement=?, recruitment_count=?,
      publish_date=?, deadline=?, job_url=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...values, id])
    return id
  }
  const db = await getDatabase()
  const result = await db.execute(`INSERT INTO jobs(company_id, job_name, location, recruitment_batch, salary_text,
    salary_min, salary_max, salary_months, education, major_requirement, job_requirement, recruitment_count,
    publish_date, deadline, job_url, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, values)
  await db.execute("INSERT INTO applications(job_id, stage, result) VALUES (?, 'TO_APPLY', 'PENDING')", [result.lastInsertId])
  return result.lastInsertId
}

export async function deleteJob(id: number) {
  await execute('DELETE FROM jobs WHERE id=?', [id])
}

export async function listJobOptions() {
  return select<{ id: number; label: string }>(`SELECT j.id, c.company_name || ' · ' || j.job_name AS label FROM jobs j JOIN companies c ON c.id=j.company_id ORDER BY c.company_name, j.job_name`)
}
