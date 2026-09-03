import type { Interview, InterviewInput } from '../types/interview'
import { execute, select, transaction } from './databaseService'
import { createInterview } from './recruitmentWorkflowService'

export async function listInterviews() {
  return select<Interview>(`SELECT i.id, i.job_id AS "jobId", c.company_name AS "companyName", j.job_name AS "jobName",
    i.round,i.scheduled_at AS "scheduledAt",i.time_tbd AS "timeTbd",i.form,i.interview_type AS "interviewType",i.location,i.meeting_url AS "meetingUrl",i.interviewer,CASE i.status WHEN 'WAITING' THEN 'SCHEDULED' ELSE i.status END AS status,i.result,i.notes
    FROM interviews i JOIN jobs j ON j.id=i.job_id JOIN companies c ON c.id=j.company_id ORDER BY i.scheduled_at DESC`)
}

export async function saveInterview(input: InterviewInput, id?: number) {
  if (!id) return createInterview(input)
  const statements = [{ query: `UPDATE interviews SET round=?,scheduled_at=?,time_tbd=?,form=?,interview_type=?,location=?,meeting_url=?,interviewer=?,status=?,result=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, values: [input.round,input.scheduledAt,input.timeTbd?1:0,input.form,input.interviewType||null,input.location||null,input.meetingUrl||null,input.interviewer||null,input.status,input.result,input.notes||null,id] }]
  if (input.result === 'FAILED') statements.push({ query: "UPDATE applications SET stage='REJECTED',result='FAILED',result_reason='面试未通过',updated_at=CURRENT_TIMESTAMP WHERE job_id=?", values: [input.jobId] })
  await transaction(statements)
}

export async function deleteInterview(id: number) { await execute('DELETE FROM interviews WHERE id=?', [id]) }
