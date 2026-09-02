import { select } from './databaseService'

export interface ScheduleItem {
  id: string
  jobId: number
  companyName: string
  jobName: string
  eventType: 'DEADLINE' | 'WRITTEN_TEST' | 'INTERVIEW'
  eventLabel: string
  scheduledAt: string
  location?: string
}

export async function listSchedule(days?: number) {
  const limit = days ? `AND datetime("scheduledAt") <= datetime('now', 'localtime', '+${Math.max(1, Math.min(365, days))} days')` : ''
  return select<ScheduleItem>(`SELECT * FROM (
    SELECT 'deadline-' || j.id AS id, j.id AS "jobId", c.company_name AS "companyName", j.job_name AS "jobName",
      'DEADLINE' AS "eventType", '投递截止' AS "eventLabel", j.deadline || ' 23:59:59' AS "scheduledAt", j.location
    FROM jobs j JOIN companies c ON c.id=j.company_id WHERE j.deadline IS NOT NULL
    UNION ALL
    SELECT 'written-' || w.id, j.id, c.company_name, j.job_name, 'WRITTEN_TEST', '笔试', w.scheduled_at, w.location
    FROM written_tests w JOIN jobs j ON j.id=w.job_id JOIN companies c ON c.id=j.company_id WHERE w.status='WAITING'
    UNION ALL
    SELECT 'interview-' || i.id, j.id, c.company_name, j.job_name, 'INTERVIEW',
      CASE i.round WHEN 'FIRST' THEN '一面' WHEN 'SECOND' THEN '二面' WHEN 'THIRD' THEN '三面' WHEN 'HR' THEN 'HR 面' ELSE '面试' END,
      i.scheduled_at, i.location
    FROM interviews i JOIN jobs j ON j.id=i.job_id JOIN companies c ON c.id=j.company_id WHERE i.status='WAITING'
  ) events WHERE datetime("scheduledAt") >= datetime('now', 'localtime') ${limit}
  ORDER BY datetime("scheduledAt") ASC`)
}

export async function countReminders() { return (await listSchedule(7)).length }
