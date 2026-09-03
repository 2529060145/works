import { select } from './databaseService'

export interface ScheduleItem {
  id: string
  jobId: number
  companyName: string
  jobName: string
  eventType: 'DEADLINE' | 'APPLICATION' | 'WRITTEN_TEST' | 'INTERVIEW' | 'OFFER' | 'REJECTED'
  eventLabel: string
  scheduledAt: string
  timeTbd?: boolean
  location?: string
  applicationBlocked?: boolean
}

export async function listScheduleByMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('月份格式无效')
  const start = `${month}-01`
  return select<ScheduleItem>(`SELECT * FROM (
    SELECT 'deadline-'||j.id AS id,j.id AS "jobId",c.company_name AS "companyName",j.job_name AS "jobName",
      'DEADLINE' AS "eventType",'岗位截止' AS "eventLabel",j.deadline||' 23:59:59' AS "scheduledAt",j.location,0 AS "applicationBlocked",0 AS "timeTbd"
    FROM jobs j JOIN companies c ON c.id=j.company_id WHERE j.deadline IS NOT NULL
    UNION ALL
    SELECT 'application-'||a.id,j.id,c.company_name,j.job_name,'APPLICATION','已投递',COALESCE(a.submitted_at,a.application_date||' 12:00:00'),j.location,0,0
    FROM applications a JOIN jobs j ON j.id=a.job_id JOIN companies c ON c.id=j.company_id WHERE a.application_date IS NOT NULL
    UNION ALL
    SELECT 'written-'||w.id,j.id,c.company_name,j.job_name,'WRITTEN_TEST','第'||w.sequence_no||'次笔试',w.scheduled_at,w.location,0,w.time_tbd
    FROM written_tests w JOIN jobs j ON j.id=w.job_id JOIN companies c ON c.id=j.company_id
    UNION ALL
    SELECT 'interview-'||i.id,j.id,c.company_name,j.job_name,'INTERVIEW',
      CASE i.round WHEN 'FIRST' THEN '一面' WHEN 'SECOND' THEN '二面' WHEN 'THIRD' THEN '三面' WHEN 'HR' THEN 'HR 面' WHEN 'FINAL' THEN '终面' ELSE '其他面试' END,
      i.scheduled_at,i.location,0,i.time_tbd
    FROM interviews i JOIN jobs j ON j.id=i.job_id JOIN companies c ON c.id=j.company_id
    UNION ALL
    SELECT 'result-'||a.id,j.id,c.company_name,j.job_name,
      CASE a.stage WHEN 'OFFER' THEN 'OFFER' ELSE 'REJECTED' END,
      CASE a.stage WHEN 'OFFER' THEN 'Offer' ELSE '淘汰' END,
      datetime(a.updated_at,'localtime'),j.location,0,0
    FROM applications a JOIN jobs j ON j.id=a.job_id JOIN companies c ON c.id=j.company_id
    WHERE a.stage IN ('OFFER','REJECTED')
  ) events
  WHERE datetime("scheduledAt")>=datetime(?) AND datetime("scheduledAt")<datetime(?,'+1 month')
  ORDER BY datetime("scheduledAt"),"companyName","jobName"`, [start, start])
}

export async function listSchedule(days?: number) {
  const limit = days ? `AND datetime("scheduledAt") <= datetime('now', 'localtime', '+${Math.max(1, Math.min(365, days))} days')` : ''
  return select<ScheduleItem>(`SELECT * FROM (
    SELECT 'deadline-' || j.id AS id, j.id AS "jobId", c.company_name AS "companyName", j.job_name AS "jobName",
      'DEADLINE' AS "eventType", '投递截止' AS "eventLabel", j.deadline || ' 23:59:59' AS "scheduledAt", j.location,
      CASE WHEN COALESCE(a.stage,'TO_APPLY')='TO_APPLY' AND COALESCE(c.application_limit_type,'UNKNOWN')='LIMITED'
        AND (SELECT COUNT(*) FROM jobs counted_job JOIN applications counted_application ON counted_application.job_id=counted_job.id
          WHERE counted_job.company_id=c.id AND (counted_application.application_date IS NOT NULL
            OR COALESCE(counted_application.stage,'TO_APPLY')<>'TO_APPLY')) >= COALESCE(c.max_applications,1)
        THEN 1 ELSE 0 END AS "applicationBlocked",0 AS "timeTbd"
    FROM jobs j JOIN companies c ON c.id=j.company_id LEFT JOIN applications a ON a.job_id=j.id WHERE j.deadline IS NOT NULL
    UNION ALL
    SELECT 'written-' || w.id, j.id, c.company_name, j.job_name, 'WRITTEN_TEST', '第'||w.sequence_no||'次笔试', w.scheduled_at, w.location, 0,w.time_tbd
    FROM written_tests w JOIN jobs j ON j.id=w.job_id JOIN companies c ON c.id=j.company_id WHERE w.status IN ('WAITING','SCHEDULED')
    UNION ALL
    SELECT 'interview-' || i.id, j.id, c.company_name, j.job_name, 'INTERVIEW',
      CASE i.round WHEN 'FIRST' THEN '一面' WHEN 'SECOND' THEN '二面' WHEN 'THIRD' THEN '三面' WHEN 'HR' THEN 'HR 面' WHEN 'FINAL' THEN '终面' ELSE '其他面试' END,
      i.scheduled_at, i.location, 0,i.time_tbd
    FROM interviews i JOIN jobs j ON j.id=i.job_id JOIN companies c ON c.id=j.company_id WHERE i.status IN ('WAITING','SCHEDULED')
  ) events WHERE datetime("scheduledAt") >= datetime('now', 'localtime') ${limit}
  ORDER BY "applicationBlocked" ASC, datetime("scheduledAt") ASC`)
}

export async function countReminders() { return (await listSchedule(7)).length }
