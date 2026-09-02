import type { ApplicationStage } from '../types/application'
import type { Job } from '../types/job'
import type { ScheduleItem } from './reminderService'
import { select } from './databaseService'

export interface DashboardData {
  totalJobs: number
  stages: Record<ApplicationStage, number>
  recentJobs: Job[]
  deadlineJobs: Job[]
  upcoming: ScheduleItem[]
  locations: { name: string; value: number }[]
  companyTypes: { name: string; value: number }[]
}

export async function getDashboardData(): Promise<DashboardData> {
  const stageRows = await select<{ stage: ApplicationStage; value: number }>(`SELECT COALESCE(a.stage,'TO_APPLY') AS stage, COUNT(*) AS value FROM jobs j LEFT JOIN applications a ON a.job_id=j.id GROUP BY COALESCE(a.stage,'TO_APPLY')`)
  const stages = { TO_APPLY:0, APPLIED:0, WRITTEN_TEST:0, INTERVIEW:0, OFFER:0, REJECTED:0, WITHDRAWN:0, UNSUITABLE:0 } satisfies Record<ApplicationStage, number>
  stageRows.forEach(item => { stages[item.stage] = Number(item.value) })
  const baseColumns = `j.id, j.company_id AS "companyId", c.company_name AS "companyName", j.job_name AS "jobName", j.location,
    j.recruitment_batch AS "recruitmentBatch", j.salary_text AS "salaryText", j.deadline, j.job_url AS "jobUrl",
    j.created_at AS "createdAt", j.updated_at AS "updatedAt", COALESCE(a.stage,'TO_APPLY') AS stage`
  const recentJobs = await select<Job>(`SELECT ${baseColumns} FROM jobs j JOIN companies c ON c.id=j.company_id LEFT JOIN applications a ON a.job_id=j.id ORDER BY j.created_at DESC LIMIT 5`)
  const deadlineJobs = await select<Job>(`SELECT ${baseColumns} FROM jobs j JOIN companies c ON c.id=j.company_id LEFT JOIN applications a ON a.job_id=j.id WHERE date(j.deadline) BETWEEN date('now','localtime') AND date('now','localtime','+7 day') ORDER BY date(j.deadline) LIMIT 5`)
  const upcoming = await select<ScheduleItem>(`SELECT * FROM (
    SELECT 'written-'||w.id AS id,j.id AS "jobId",c.company_name AS "companyName",j.job_name AS "jobName",'WRITTEN_TEST' AS "eventType",'笔试' AS "eventLabel",w.scheduled_at AS "scheduledAt",w.location FROM written_tests w JOIN jobs j ON j.id=w.job_id JOIN companies c ON c.id=j.company_id WHERE w.status='WAITING'
    UNION ALL SELECT 'interview-'||i.id,j.id,c.company_name,j.job_name,'INTERVIEW','面试',i.scheduled_at,i.location FROM interviews i JOIN jobs j ON j.id=i.job_id JOIN companies c ON c.id=j.company_id WHERE i.status='WAITING'
  ) WHERE datetime("scheduledAt") BETWEEN datetime('now','localtime') AND datetime('now','localtime','+14 day') ORDER BY datetime("scheduledAt") LIMIT 5`)
  const locations = await select<{ name: string; value: number }>(`SELECT COALESCE(NULLIF(location,''),'未填写') AS name,COUNT(*) AS value FROM jobs GROUP BY COALESCE(NULLIF(location,''),'未填写') ORDER BY value DESC LIMIT 5`)
  const companyTypes = await select<{ name: string; value: number }>(`SELECT COALESCE(NULLIF(company_type,''),'未填写') AS name,COUNT(*) AS value FROM companies GROUP BY COALESCE(NULLIF(company_type,''),'未填写') ORDER BY value DESC`)
  return { totalJobs: Object.values(stages).reduce((sum, value) => sum + value, 0), stages, recentJobs, deadlineJobs, upcoming, locations, companyTypes }
}
