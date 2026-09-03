import type { ApplicationStage } from '../types/application'
import type { Job } from '../types/job'
import type { ScheduleItem } from './reminderService'
import { select } from './databaseService'
import { decorateJobEligibility, getEffectivePendingCount } from './applicationEligibilityService'

export interface DashboardData {
  totalJobs: number
  effectiveOpportunities: number
  stages: Record<ApplicationStage, number>
  workflow: { writtenTests: number; interviews: number; pending: number }
  recentJobs: Job[]
  deadlineJobs: Job[]
  upcoming: ScheduleItem[]
  locations: { name: string; value: number }[]
  companyTypes: { name: string; value: number }[]
}

export type JobTrendDays = 7 | 30 | 90

export interface JobTrendPoint {
  date: string
  addedJobs: number
  submittedJobs: number
  pendingJobs: number
}

export async function getJobTrend(days: JobTrendDays): Promise<JobTrendPoint[]> {
  const safeDays = [7, 30, 90].includes(days) ? days : 30
  const rows = await select<JobTrendPoint>(`WITH RECURSIVE dates(date) AS (
      SELECT date('now','localtime','-${safeDays - 1} day')
      UNION ALL SELECT date(date,'+1 day') FROM dates WHERE date < date('now','localtime')
    ), company_daily AS (
      SELECT dates.date, c.id,
        COALESCE(c.application_limit_type,'UNKNOWN') AS limit_type,
        COALESCE(c.max_applications,1) AS max_applications,
        SUM(CASE WHEN j.id IS NOT NULL AND date(j.created_at)<=dates.date
          AND COALESCE(a.stage,'TO_APPLY')='TO_APPLY'
          AND (a.application_date IS NULL OR date(a.application_date)>dates.date) THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN j.id IS NOT NULL AND date(j.created_at)<=dates.date
          AND ((a.application_date IS NOT NULL AND date(a.application_date)<=dates.date)
            OR (a.application_date IS NULL AND COALESCE(a.stage,'TO_APPLY')<>'TO_APPLY')) THEN 1 ELSE 0 END) AS applied_count
      FROM dates CROSS JOIN companies c
      LEFT JOIN jobs j ON j.company_id=c.id
      LEFT JOIN applications a ON a.job_id=j.id
      GROUP BY dates.date,c.id,c.application_limit_type,c.max_applications
    ), daily_opportunities AS (
      SELECT date, COALESCE(SUM(CASE WHEN limit_type='LIMITED'
        THEN MIN(pending_count,MAX(0,max_applications-applied_count))
        ELSE pending_count END),0) AS pending_jobs
      FROM company_daily GROUP BY date
    )
    SELECT dates.date,
      (SELECT COUNT(*) FROM jobs WHERE date(created_at)=dates.date) AS "addedJobs",
      (SELECT COUNT(*) FROM applications WHERE application_date=dates.date) AS "submittedJobs",
      COALESCE(daily_opportunities.pending_jobs,0) AS "pendingJobs"
    FROM dates LEFT JOIN daily_opportunities ON daily_opportunities.date=dates.date ORDER BY dates.date`)
  const normalized = rows.map(item => ({
    date: item.date,
    addedJobs: Number(item.addedJobs),
    submittedJobs: Number(item.submittedJobs),
    pendingJobs: Number(item.pendingJobs),
  }))
  return normalized.some(item => item.addedJobs || item.submittedJobs || item.pendingJobs) ? normalized : []
}

export async function getDashboardData(): Promise<DashboardData> {
  const stageRows = await select<{ stage: ApplicationStage; value: number }>(`SELECT COALESCE(a.stage,'TO_APPLY') AS stage, COUNT(*) AS value FROM jobs j LEFT JOIN applications a ON a.job_id=j.id GROUP BY COALESCE(a.stage,'TO_APPLY')`)
  const stages = { TO_APPLY:0, APPLIED:0, PROCESS:0, OFFER:0, REJECTED:0, WITHDRAWN:0, UNSUITABLE:0 } satisfies Record<ApplicationStage, number>
  stageRows.forEach(item => { stages[item.stage] = Number(item.value) })
  const totalJobs = Object.values(stages).reduce((sum, value) => sum + value, 0)
  const effectiveOpportunities = await getEffectivePendingCount()
  stages.TO_APPLY = effectiveOpportunities
  const workflowRows = await select<{ nodeType: 'WRITTEN_TEST' | 'INTERVIEW'; value: number }>(`WITH nodes AS (
      SELECT w.job_id AS job_id,'WRITTEN_TEST' AS node_type,w.status,w.result,w.created_at,w.id FROM written_tests w
      UNION ALL SELECT i.job_id,'INTERVIEW',i.status,i.result,i.created_at,i.id FROM interviews i
    ), ranked AS (
      SELECT nodes.*,ROW_NUMBER() OVER(PARTITION BY job_id ORDER BY
        CASE WHEN status IN ('WAITING','SCHEDULED','PENDING_SCHEDULE') OR (status='COMPLETED' AND result='PENDING') THEN 0 ELSE 1 END,
        datetime(created_at) DESC,id DESC) AS position
      FROM nodes
    )
    SELECT ranked.node_type AS "nodeType",COUNT(*) AS value FROM ranked
    JOIN applications a ON a.job_id=ranked.job_id
    WHERE ranked.position=1 AND a.stage='PROCESS' AND ranked.status<>'CANCELLED'
    GROUP BY ranked.node_type`)
  const workflow = { writtenTests: 0, interviews: 0, pending: 0 }
  workflowRows.forEach(row => { if (row.nodeType === 'WRITTEN_TEST') workflow.writtenTests = Number(row.value); else workflow.interviews = Number(row.value) })
  workflow.pending = Math.max(0, stages.PROCESS - workflow.writtenTests - workflow.interviews)
  const baseColumns = `j.id, j.company_id AS "companyId", c.company_name AS "companyName", j.job_name AS "jobName", j.location,
    j.recruitment_batch AS "recruitmentBatch", j.salary_text AS "salaryText", j.deadline, j.job_url AS "jobUrl",
    j.created_at AS "createdAt", j.updated_at AS "updatedAt", COALESCE(a.stage,'TO_APPLY') AS stage,
    a.application_date AS "applicationDate",a.submitted_at AS "submittedAt", COALESCE(c.application_limit_type,'UNKNOWN') AS "applicationLimitType",
    c.max_applications AS "maxApplications",
    (SELECT COUNT(*) FROM jobs counted_job JOIN applications counted_application ON counted_application.job_id=counted_job.id
      WHERE counted_job.company_id=c.id AND (counted_application.application_date IS NOT NULL OR COALESCE(counted_application.stage,'TO_APPLY')<>'TO_APPLY')) AS "companyAppliedCount"`
  const recentJobs = (await select<Job>(`SELECT ${baseColumns} FROM jobs j JOIN companies c ON c.id=j.company_id LEFT JOIN applications a ON a.job_id=j.id ORDER BY j.created_at DESC LIMIT 5`)).map(decorateJobEligibility)
  const deadlineJobs = (await select<Job>(`SELECT ${baseColumns} FROM jobs j JOIN companies c ON c.id=j.company_id LEFT JOIN applications a ON a.job_id=j.id WHERE date(j.deadline) BETWEEN date('now','localtime') AND date('now','localtime','+7 day') ORDER BY date(j.deadline) LIMIT 20`))
    .map(decorateJobEligibility).sort((left,right)=>Number(left.applicationBlocked)-Number(right.applicationBlocked)||String(left.deadline).localeCompare(String(right.deadline))).slice(0,5)
  const upcoming = await select<ScheduleItem>(`SELECT * FROM (
    SELECT 'written-'||w.id AS id,j.id AS "jobId",c.company_name AS "companyName",j.job_name AS "jobName",'WRITTEN_TEST' AS "eventType",'第'||w.sequence_no||'次笔试' AS "eventLabel",w.scheduled_at AS "scheduledAt",w.location,w.time_tbd AS "timeTbd" FROM written_tests w JOIN jobs j ON j.id=w.job_id JOIN companies c ON c.id=j.company_id WHERE w.status IN ('WAITING','SCHEDULED')
    UNION ALL SELECT 'interview-'||i.id,j.id,c.company_name,j.job_name,'INTERVIEW',CASE i.round WHEN 'FIRST' THEN '一面' WHEN 'SECOND' THEN '二面' WHEN 'THIRD' THEN '三面' WHEN 'HR' THEN 'HR 面' WHEN 'FINAL' THEN '终面' ELSE '其他面试' END,i.scheduled_at,i.location,i.time_tbd FROM interviews i JOIN jobs j ON j.id=i.job_id JOIN companies c ON c.id=j.company_id WHERE i.status IN ('WAITING','SCHEDULED')
  ) WHERE date("scheduledAt") BETWEEN date('now','localtime') AND date('now','localtime','+14 day') ORDER BY datetime("scheduledAt") LIMIT 5`)
  const locations = await select<{ name: string; value: number }>(`SELECT COALESCE(NULLIF(location,''),'未填写') AS name,COUNT(*) AS value FROM jobs GROUP BY COALESCE(NULLIF(location,''),'未填写') ORDER BY value DESC LIMIT 5`)
  const companyTypes = await select<{ name: string; value: number }>(`SELECT COALESCE(NULLIF(company_type,''),'未填写') AS name,COUNT(*) AS value FROM companies GROUP BY COALESCE(NULLIF(company_type,''),'未填写') ORDER BY value DESC`)
  return { totalJobs, effectiveOpportunities, stages, workflow, recentJobs, deadlineJobs, upcoming, locations, companyTypes }
}
