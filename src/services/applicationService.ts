import type { Application, ApplicationInput, ApplicationResult, ApplicationStage } from '../types/application'
import { execute, select } from './databaseService'
import { canApplyToJob } from './applicationEligibilityService'

const columns = `a.id, a.job_id AS "jobId", c.company_name AS "companyName", j.job_name AS "jobName",
  j.location, j.recruitment_batch AS "recruitmentBatch",
  a.stage, a.application_date AS "applicationDate", a.result, a.result_reason AS "resultReason", a.notes,
  a.created_at AS "createdAt", a.updated_at AS "updatedAt"`

export interface ApplicationQuery {
  keyword?: string
  location?: string
  recruitmentBatch?: string
  stage?: ApplicationStage | ''
}

export async function listApplications(query: ApplicationQuery = {}) {
  const clauses: string[] = ['1=1']
  const values: unknown[] = []
  if (query.keyword?.trim()) {
    const keyword = `%${query.keyword.trim()}%`
    clauses.push('(c.company_name LIKE ? OR j.job_name LIKE ?)')
    values.push(keyword, keyword)
  }
  if (query.location?.trim()) {
    clauses.push('j.location = ?')
    values.push(query.location.trim())
  }
  if (query.recruitmentBatch?.trim()) {
    clauses.push('j.recruitment_batch = ?')
    values.push(query.recruitmentBatch.trim())
  }
  if (query.stage) {
    clauses.push('a.stage = ?')
    values.push(query.stage)
  }
  return select<Application>(`SELECT ${columns} FROM applications a JOIN jobs j ON j.id=a.job_id
    JOIN companies c ON c.id=j.company_id WHERE ${clauses.join(' AND ')} ORDER BY a.updated_at DESC`, values)
}

export async function getApplication(jobId: number) {
  const rows = await select<Application>(`SELECT ${columns} FROM applications a JOIN jobs j ON j.id=a.job_id JOIN companies c ON c.id=j.company_id WHERE a.job_id=?`, [jobId])
  return rows[0] ?? null
}

export async function saveApplication(input: ApplicationInput) {
  if (input.result === 'FAILED' && !input.resultReason?.trim()) throw new Error('请填写未通过原因')
  await execute(`INSERT INTO applications(job_id, stage, application_date, result, result_reason, notes)
    VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(job_id) DO UPDATE SET stage=excluded.stage,
    application_date=excluded.application_date, result=excluded.result, result_reason=excluded.result_reason,
    notes=excluded.notes, updated_at=CURRENT_TIMESTAMP`,
  [input.jobId, input.stage, input.applicationDate || null, input.result, input.result === 'FAILED' ? input.resultReason?.trim() : null, input.notes || null])
}

export async function updateApplicationResult(jobId: number, result: ApplicationResult, resultReason?: string) {
  if (result === 'FAILED' && !resultReason?.trim()) throw new Error('请填写未通过原因')
  const rows = await select<{ stage: ApplicationStage; applicationDate?: string }>(
    'SELECT stage, application_date AS "applicationDate" FROM applications WHERE job_id=?', [jobId],
  )
  if (!rows[0]?.applicationDate) throw new Error('该岗位尚未投递，不能填写投递结果')
  let stage = rows[0].stage
  if (result === 'FAILED' || result === 'JOB_CANCELLED' || result === 'COMPANY_TERMINATED') stage = 'REJECTED'
  else if (result === 'WITHDRAWN') stage = 'WITHDRAWN'
  else if (result === 'UNSUITABLE') stage = 'UNSUITABLE'
  else if (result === 'OFFER') stage = 'OFFER'
  else if (['REJECTED', 'WITHDRAWN', 'UNSUITABLE'].includes(stage)) {
    const progress = await select<{ hasInterview: number; hasWrittenTest: number }>(`SELECT
      EXISTS(SELECT 1 FROM interviews WHERE job_id=?) AS "hasInterview",
      EXISTS(SELECT 1 FROM written_tests WHERE job_id=?) AS "hasWrittenTest"`, [jobId, jobId])
    stage = progress[0]?.hasInterview ? 'INTERVIEW' : progress[0]?.hasWrittenTest ? 'WRITTEN_TEST' : 'APPLIED'
  }
  await execute('UPDATE applications SET result=?, result_reason=?, stage=?, updated_at=CURRENT_TIMESTAMP WHERE job_id=?',
    [result, result === 'FAILED' ? resultReason?.trim() : null, stage, jobId])
}

export async function updateApplicationStage(jobId: number, stage: ApplicationStage) {
  const applicationDate = stage === 'TO_APPLY' ? null : new Date().toISOString().slice(0, 10)
  await execute(`INSERT INTO applications(job_id, stage, application_date, result) VALUES (?, ?, ?, 'PENDING')
    ON CONFLICT(job_id) DO UPDATE SET stage=excluded.stage,
    application_date=COALESCE(applications.application_date, excluded.application_date), updated_at=CURRENT_TIMESTAMP`, [jobId, stage, applicationDate])
}

export async function markJobApplied(jobId: number) {
  const eligibility = await canApplyToJob(jobId)
  if (!eligibility.canApply) return { updated: false as const, eligibility }
  await execute(`INSERT INTO applications(job_id, stage, application_date, result) VALUES (?, 'APPLIED', date('now','localtime'), 'PENDING')
    ON CONFLICT(job_id) DO UPDATE SET stage='APPLIED', application_date=COALESCE(applications.application_date,date('now','localtime')),
    result='PENDING', result_reason=NULL, updated_at=CURRENT_TIMESTAMP`, [jobId])
  return { updated: true as const, eligibility }
}

export async function restoreJobToPending(jobId: number) {
  const rows = await select<{ stage: ApplicationStage }>('SELECT stage FROM applications WHERE job_id=?', [jobId])
  const stage = rows[0]?.stage ?? 'TO_APPLY'
  if (!['TO_APPLY', 'APPLIED'].includes(stage)) {
    return { updated: false as const, blockedByStage: stage }
  }
  await execute(`INSERT INTO applications(job_id, stage, application_date, result) VALUES (?, 'TO_APPLY', NULL, 'PENDING')
    ON CONFLICT(job_id) DO UPDATE SET stage='TO_APPLY', application_date=NULL, result='PENDING', result_reason=NULL, updated_at=CURRENT_TIMESTAMP`, [jobId])
  return { updated: true as const }
}

export async function advanceApplicationStage(jobId: number, stage: ApplicationStage) {
  const rows = await select<{ stage: ApplicationStage }>('SELECT stage FROM applications WHERE job_id=?', [jobId])
  const current = rows[0]?.stage ?? 'TO_APPLY'
  const rank: Record<ApplicationStage, number> = {
    TO_APPLY: 0, APPLIED: 1, WRITTEN_TEST: 2, INTERVIEW: 3, OFFER: 4,
    REJECTED: 4, WITHDRAWN: 4, UNSUITABLE: 4,
  }
  if (!['OFFER', 'REJECTED'].includes(stage) && rank[stage] < rank[current]) return
  const applicationDate = stage === 'TO_APPLY' ? null : new Date().toISOString().slice(0, 10)
  await execute(`INSERT INTO applications(job_id, stage, application_date, result) VALUES (?, ?, ?, 'PENDING')
    ON CONFLICT(job_id) DO UPDATE SET stage=excluded.stage,
    application_date=COALESCE(applications.application_date,excluded.application_date), updated_at=CURRENT_TIMESTAMP`,
  [jobId, stage, applicationDate])
}
