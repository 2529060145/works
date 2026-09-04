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

export const REMINDERS_CHANGED_EVENT = 'job-manager:reminders-changed'

export function notifyRemindersChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(REMINDERS_CHANGED_EVENT))
}

const workflowScheduleSql = `SELECT * FROM (
  SELECT 'written-'||w.id AS id,j.id AS "jobId",c.company_name AS "companyName",j.job_name AS "jobName",
    'WRITTEN_TEST' AS "eventType",'第'||w.sequence_no||'次笔试' AS "eventLabel",w.scheduled_at AS "scheduledAt",
    w.location,0 AS "applicationBlocked",w.time_tbd AS "timeTbd"
  FROM written_tests w JOIN jobs j ON j.id=w.job_id JOIN companies c ON c.id=j.company_id
  WHERE w.status IN ('WAITING','SCHEDULED')
  UNION ALL
  SELECT 'interview-'||i.id,j.id,c.company_name,j.job_name,'INTERVIEW',
    CASE i.round WHEN 'FIRST' THEN '一面' WHEN 'SECOND' THEN '二面' WHEN 'THIRD' THEN '三面'
      WHEN 'HR' THEN 'HR 面' WHEN 'FINAL' THEN '终面' ELSE '其他面试' END,
    i.scheduled_at,i.location,0,i.time_tbd
  FROM interviews i JOIN jobs j ON j.id=i.job_id JOIN companies c ON c.id=j.company_id
  WHERE i.status IN ('WAITING','SCHEDULED')
) events`

export async function listScheduleByMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('月份格式无效')
  const start = `${month}-01`
  return select<ScheduleItem>(`${workflowScheduleSql}
    WHERE datetime("scheduledAt")>=datetime(?) AND datetime("scheduledAt")<datetime(?,'+1 month')
    ORDER BY datetime("scheduledAt"),"companyName","jobName"`, [start, start])
}

export async function listSchedule(days?: number) {
  const limit = days ? `AND date("scheduledAt") <= date('now','localtime','+${Math.max(1, Math.min(365, days))} days')` : ''
  return select<ScheduleItem>(`${workflowScheduleSql}
    WHERE date("scheduledAt") >= date('now','localtime') ${limit}
    ORDER BY datetime("scheduledAt"),"companyName","jobName"`)
}

export async function countReminders() { return (await listSchedule(7)).length }
