import type { WrittenTest, WrittenTestInput } from '../types/writtenTest'
import { execute, select } from './databaseService'
import { advanceApplicationStage } from './applicationService'

export async function listWrittenTests() {
  return select<WrittenTest>(`SELECT w.id, w.job_id AS "jobId", c.company_name AS "companyName", j.job_name AS "jobName",
    w.scheduled_at AS "scheduledAt", w.form, w.location, w.status, w.result, w.notes
    FROM written_tests w JOIN jobs j ON j.id=w.job_id JOIN companies c ON c.id=j.company_id ORDER BY w.scheduled_at DESC`)
}

export async function saveWrittenTest(input: WrittenTestInput, id?: number) {
  const values = [input.jobId, input.scheduledAt, input.form, input.location || null, input.status, input.result, input.notes || null]
  if (id) await execute(`UPDATE written_tests SET job_id=?, scheduled_at=?, form=?, location=?, status=?, result=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...values, id])
  else await execute(`INSERT INTO written_tests(job_id, scheduled_at, form, location, status, result, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`, values)
  await advanceApplicationStage(input.jobId, input.result === 'FAILED' ? 'REJECTED' : 'WRITTEN_TEST')
}

export async function deleteWrittenTest(id: number) { await execute('DELETE FROM written_tests WHERE id=?', [id]) }
