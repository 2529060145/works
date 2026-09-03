import type { Interview, InterviewInput } from '../types/interview'
import { execute, select } from './databaseService'
import { advanceApplicationStage } from './applicationService'

export async function listInterviews() {
  return select<Interview>(`SELECT i.id, i.job_id AS "jobId", c.company_name AS "companyName", j.job_name AS "jobName",
    i.round, i.scheduled_at AS "scheduledAt", i.form, i.location, i.status, i.result, i.notes
    FROM interviews i JOIN jobs j ON j.id=i.job_id JOIN companies c ON c.id=j.company_id ORDER BY i.scheduled_at DESC`)
}

export async function saveInterview(input: InterviewInput, id?: number) {
  const values = [input.jobId, input.round, input.scheduledAt, input.form, input.location || null, input.status, input.result, input.notes || null]
  if (id) await execute(`UPDATE interviews SET job_id=?, round=?, scheduled_at=?, form=?, location=?, status=?, result=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...values, id])
  else await execute(`INSERT INTO interviews(job_id, round, scheduled_at, form, location, status, result, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, values)
  const stage = input.result === 'OFFER' ? 'OFFER' : input.result === 'FAILED' ? 'REJECTED' : 'INTERVIEW'
  await advanceApplicationStage(input.jobId, stage)
}

export async function deleteInterview(id: number) { await execute('DELETE FROM interviews WHERE id=?', [id]) }
