import type { WrittenTest, WrittenTestInput } from '../types/writtenTest'
import { execute, select, transaction } from './databaseService'
import { createWrittenTest } from './recruitmentWorkflowService'

export async function listWrittenTests() {
  return select<WrittenTest>(`SELECT w.id, w.job_id AS "jobId", c.company_name AS "companyName", j.job_name AS "jobName",
    w.scheduled_at AS "scheduledAt",w.sequence_no AS "sequenceNo",w.time_tbd AS "timeTbd",w.form,w.test_type AS "testType",w.location,w.meeting_url AS "meetingUrl",CASE w.status WHEN 'WAITING' THEN 'SCHEDULED' ELSE w.status END AS status,w.result,w.notes
    FROM written_tests w JOIN jobs j ON j.id=w.job_id JOIN companies c ON c.id=j.company_id ORDER BY w.scheduled_at DESC`)
}

export async function saveWrittenTest(input: WrittenTestInput, id?: number) {
  if (!id) return createWrittenTest(input)
  const statements = [{ query: `UPDATE written_tests SET scheduled_at=?,time_tbd=?,form=?,test_type=?,location=?,meeting_url=?,status=?,result=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, values: [input.scheduledAt,input.timeTbd?1:0,input.form,input.testType||null,input.location||null,input.meetingUrl||null,input.status,input.result,input.notes||null,id] }]
  if (input.result === 'FAILED') statements.push({ query: "UPDATE applications SET stage='REJECTED',result='FAILED',result_reason='笔试未通过',updated_at=CURRENT_TIMESTAMP WHERE job_id=?", values: [input.jobId] })
  await transaction(statements)
}

export async function deleteWrittenTest(id: number) { await execute('DELETE FROM written_tests WHERE id=?', [id]) }
