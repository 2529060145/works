import type { ApplicationStage } from '../types/application'
import type { ApplicationLimitType } from '../types/company'
import type { Job } from '../types/job'
import { select } from './databaseService'

export interface AppliedJobSummary {
  jobId: number
  jobName: string
  applicationDate: string
}

export interface CompanyApplicationLimit {
  companyId: number
  companyName: string
  applicationLimitType: ApplicationLimitType
  maxApplications?: number
  appliedCount: number
  remainingSlots?: number
  limitReached: boolean
}

export type ApplicationEligibilityReason = 'AVAILABLE' | 'ALREADY_APPLIED' | 'LIMIT_REACHED'

export interface ApplicationEligibility {
  canApply: boolean
  reason: ApplicationEligibilityReason
  limit: CompanyApplicationLimit
  appliedJobs: AppliedJobSummary[]
}

interface LimitRow {
  companyId: number
  companyName: string
  applicationLimitType: ApplicationLimitType
  maxApplications?: number
  appliedCount: number
}

export function deriveCompanyApplicationLimit(row: LimitRow): CompanyApplicationLimit {
  const appliedCount = Number(row.appliedCount ?? 0)
  const maxApplications = row.applicationLimitType === 'LIMITED' ? Number(row.maxApplications ?? 1) : undefined
  const remainingSlots = maxApplications == null ? undefined : Math.max(0, maxApplications - appliedCount)
  return {
    ...row,
    appliedCount,
    maxApplications,
    remainingSlots,
    limitReached: maxApplications != null && appliedCount >= maxApplications,
  }
}

export function decorateJobEligibility(job: Job): Job {
  const limit = deriveCompanyApplicationLimit({
    companyId: job.companyId,
    companyName: job.companyName,
    applicationLimitType: job.applicationLimitType ?? 'UNKNOWN',
    maxApplications: job.maxApplications,
    appliedCount: job.companyAppliedCount ?? 0,
  })
  return {
    ...job,
    companyAppliedCount: limit.appliedCount,
    remainingSlots: limit.remainingSlots,
    applicationBlocked: (job.stage ?? 'TO_APPLY') === 'TO_APPLY' && !job.applicationDate && limit.limitReached,
  }
}

export async function getCompanyApplicationLimit(companyId: number) {
  const rows = await select<LimitRow>(`SELECT c.id AS "companyId", c.company_name AS "companyName",
    COALESCE(c.application_limit_type, 'UNKNOWN') AS "applicationLimitType",
    c.max_applications AS "maxApplications",
    (SELECT COUNT(*) FROM jobs j JOIN applications a ON a.job_id=j.id
      WHERE j.company_id=c.id AND (a.application_date IS NOT NULL OR COALESCE(a.stage,'TO_APPLY')<>'TO_APPLY')) AS "appliedCount"
    FROM companies c WHERE c.id=?`, [companyId])
  return rows[0] ? deriveCompanyApplicationLimit(rows[0]) : null
}

export async function getCompanyAppliedCount(companyId: number) {
  return (await getCompanyApplicationLimit(companyId))?.appliedCount ?? 0
}

export async function getCompanyRemainingSlots(companyId: number) {
  return (await getCompanyApplicationLimit(companyId))?.remainingSlots
}

export async function isCompanyApplicationLimitReached(companyId: number) {
  return (await getCompanyApplicationLimit(companyId))?.limitReached ?? false
}

export async function getCompanyAppliedJobs(companyId: number) {
  return select<AppliedJobSummary>(`SELECT j.id AS "jobId", j.job_name AS "jobName", a.application_date AS "applicationDate"
    FROM jobs j JOIN applications a ON a.job_id=j.id
    WHERE j.company_id=? AND (a.application_date IS NOT NULL OR COALESCE(a.stage,'TO_APPLY')<>'TO_APPLY')
    ORDER BY date(a.application_date) DESC, j.job_name`, [companyId])
}

export async function canApplyToJob(jobId: number): Promise<ApplicationEligibility> {
  const rows = await select<{ companyId: number; applicationDate?: string; stage: ApplicationStage }>(
    `SELECT j.company_id AS "companyId", a.application_date AS "applicationDate", COALESCE(a.stage,'TO_APPLY') AS stage
     FROM jobs j LEFT JOIN applications a ON a.job_id=j.id WHERE j.id=?`, [jobId],
  )
  if (!rows[0]) throw new Error('岗位不存在或已被删除')
  const limit = await getCompanyApplicationLimit(rows[0].companyId)
  if (!limit) throw new Error('所属企业不存在或已被删除')
  const appliedJobs = await getCompanyAppliedJobs(limit.companyId)
  if (rows[0].applicationDate || rows[0].stage !== 'TO_APPLY') return { canApply: true, reason: 'ALREADY_APPLIED', limit, appliedJobs }
  if (limit.limitReached) return { canApply: false, reason: 'LIMIT_REACHED', limit, appliedJobs }
  return { canApply: true, reason: 'AVAILABLE', limit, appliedJobs }
}

export async function getEffectivePendingJobs() {
  return select<{ id: number }>(`SELECT j.id FROM jobs j
    LEFT JOIN applications a ON a.job_id=j.id
    JOIN companies c ON c.id=j.company_id
    WHERE COALESCE(a.stage,'TO_APPLY')='TO_APPLY'
      AND (COALESCE(c.application_limit_type,'UNKNOWN') <> 'LIMITED'
        OR (SELECT COUNT(*) FROM jobs counted_job JOIN applications counted_application ON counted_application.job_id=counted_job.id
            WHERE counted_job.company_id=c.id AND (counted_application.application_date IS NOT NULL
              OR COALESCE(counted_application.stage,'TO_APPLY')<>'TO_APPLY')) < COALESCE(c.max_applications,1))`)
}

export async function getEffectivePendingCount() {
  const rows = await select<{ value: number }>(`SELECT COALESCE(SUM(
      CASE WHEN company."applicationLimitType"='LIMITED'
        THEN MIN(company."pendingCount", MAX(0, company."maxApplications" - company."appliedCount"))
        ELSE company."pendingCount" END
    ), 0) AS value
    FROM (
      SELECT c.id,
        COALESCE(c.application_limit_type,'UNKNOWN') AS "applicationLimitType",
        COALESCE(c.max_applications,1) AS "maxApplications",
        SUM(CASE WHEN j.id IS NOT NULL AND COALESCE(a.stage,'TO_APPLY')='TO_APPLY' THEN 1 ELSE 0 END) AS "pendingCount",
        SUM(CASE WHEN j.id IS NOT NULL AND (a.application_date IS NOT NULL OR COALESCE(a.stage,'TO_APPLY')<>'TO_APPLY') THEN 1 ELSE 0 END) AS "appliedCount"
      FROM companies c
      LEFT JOIN jobs j ON j.company_id=c.id
      LEFT JOIN applications a ON a.job_id=j.id
      GROUP BY c.id, c.application_limit_type, c.max_applications
    ) company`)
  return Number(rows[0]?.value ?? 0)
}
