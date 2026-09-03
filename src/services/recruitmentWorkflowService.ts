import type { ApplicationStage } from '../types/application'
import type { InterviewForm, InterviewRound } from '../types/interview'
import type { WorkflowNodeResult, WorkflowNodeStatus, WrittenTestForm } from '../types/writtenTest'
import { select, transaction, type TransactionStatement } from './databaseService'

export type WorkflowNodeType = 'WRITTEN_TEST' | 'INTERVIEW'

export interface WorkflowNode {
  key: string
  id: number
  jobId: number
  nodeType: WorkflowNodeType
  label: string
  sequenceNo?: number
  round?: InterviewRound
  scheduledAt: string
  timeTbd: boolean
  form: WrittenTestForm | InterviewForm
  location?: string
  meetingUrl?: string
  interviewer?: string
  status: WorkflowNodeStatus
  result: WorkflowNodeResult
  notes?: string
  createdAt: string
}

export interface WorkflowJob {
  jobId: number
  companyName: string
  jobName: string
  location?: string
  stage: ApplicationStage
  applicationDate?: string
  submittedAt?: string
  result?: string
  history: WorkflowNode[]
  currentNode?: WorkflowNode
  canAddNext: boolean
  nextBlockedReason?: string
}

export interface WrittenWorkflowInput {
  jobId: number
  scheduledAt: string
  timeTbd: boolean
  form: WrittenTestForm
  testType?: string
  location?: string
  meetingUrl?: string
  notes?: string
}

export interface InterviewWorkflowInput {
  jobId: number
  round: InterviewRound
  scheduledAt: string
  timeTbd: boolean
  form: InterviewForm
  interviewType?: string
  location?: string
  meetingUrl?: string
  interviewer?: string
  notes?: string
}

export const workflowStatusLabels: Record<WorkflowNodeStatus, string> = {
  PENDING_SCHEDULE: '待安排', SCHEDULED: '待进行', COMPLETED: '已完成', CANCELLED: '已取消',
}
export const workflowResultLabels: Record<WorkflowNodeResult, string> = {
  PENDING: '等待结果', PASSED: '通过', FAILED: '未通过', CANCELLED: '取消',
}
export const interviewRoundLabels: Record<InterviewRound, string> = {
  FIRST: '一面', SECOND: '二面', THIRD: '三面', HR: 'HR 面', FINAL: '终面', OTHER: '其他面试',
}

const historySql = `SELECT * FROM (
  SELECT 'written-'||w.id AS key,w.id,w.job_id AS "jobId",'WRITTEN_TEST' AS "nodeType",
    '第'||w.sequence_no||'次笔试' AS label,w.sequence_no AS "sequenceNo",NULL AS round,
    w.scheduled_at AS "scheduledAt",w.time_tbd AS "timeTbd",w.form,w.location,w.meeting_url AS "meetingUrl",
    NULL AS interviewer,CASE w.status WHEN 'WAITING' THEN 'SCHEDULED' ELSE w.status END AS status,
    w.result,w.notes,w.created_at AS "createdAt"
  FROM written_tests w
  UNION ALL
  SELECT 'interview-'||i.id,i.id,i.job_id,'INTERVIEW',
    CASE i.round WHEN 'FIRST' THEN '一面' WHEN 'SECOND' THEN '二面' WHEN 'THIRD' THEN '三面'
      WHEN 'HR' THEN 'HR 面' WHEN 'FINAL' THEN '终面' ELSE '其他面试' END,
    NULL,i.round,i.scheduled_at,i.time_tbd,i.form,i.location,i.meeting_url,i.interviewer,
    CASE i.status WHEN 'WAITING' THEN 'SCHEDULED' ELSE i.status END,i.result,i.notes,i.created_at
  FROM interviews i
) nodes`

function normalizeNode(node: WorkflowNode): WorkflowNode {
  return { ...node, timeTbd: Boolean(node.timeTbd) }
}

export async function getWorkflowHistory(jobId: number) {
  const rows = await select<WorkflowNode>(`${historySql} WHERE "jobId"=?
    ORDER BY datetime("createdAt"),CASE "nodeType" WHEN 'WRITTEN_TEST' THEN 0 ELSE 1 END,id`, [jobId])
  return rows.map(normalizeNode)
}

export function currentWorkflowNode(history: WorkflowNode[]) {
  const active = [...history].reverse().find(node => node.status === 'PENDING_SCHEDULE' || node.status === 'SCHEDULED' || (node.status === 'COMPLETED' && node.result === 'PENDING'))
  return active ?? history[history.length - 1]
}

export function workflowAddState(stage: ApplicationStage, history: WorkflowNode[]) {
  if (stage !== 'PROCESS') return { canAddNext: false, reason: '该岗位当前不在面试/笔试阶段。' }
  if (!history.length) return { canAddNext: true, reason: undefined }
  const current = currentWorkflowNode(history)!
  if (current.status === 'SCHEDULED' || current.status === 'PENDING_SCHEDULE') return { canAddNext: false, reason: '当前流程尚未完成。' }
  if (current.status === 'COMPLETED' && current.result === 'PENDING') return { canAddNext: false, reason: '请先填写当前流程结果。' }
  if (current.result === 'FAILED') return { canAddNext: false, reason: '当前流程未通过，不能新增后续流程。' }
  if (current.status === 'CANCELLED' || current.result === 'CANCELLED') return { canAddNext: false, reason: '当前流程已取消，请先处理岗位阶段。' }
  return { canAddNext: current.status === 'COMPLETED' && current.result === 'PASSED', reason: undefined }
}

export async function getCurrentWorkflowNode(jobId: number) {
  return currentWorkflowNode(await getWorkflowHistory(jobId))
}

export async function getCurrentDetailedStage(jobId: number) {
  const node = await getCurrentWorkflowNode(jobId)
  if (!node) return { label: '尚未安排', status: '待安排' }
  return { label: node.label, scheduledAt: node.scheduledAt, timeTbd: node.timeTbd, status: workflowStatusLabels[node.status], result: workflowResultLabels[node.result] }
}

export async function listWorkflowJobs(): Promise<WorkflowJob[]> {
  const jobs = await select<Omit<WorkflowJob, 'history' | 'currentNode' | 'canAddNext' | 'nextBlockedReason'>>(`SELECT
    j.id AS "jobId",c.company_name AS "companyName",j.job_name AS "jobName",j.location,a.stage,
    a.application_date AS "applicationDate",a.submitted_at AS "submittedAt",a.result
    FROM applications a JOIN jobs j ON j.id=a.job_id JOIN companies c ON c.id=j.company_id
    WHERE a.stage IN ('PROCESS','OFFER','REJECTED','WITHDRAWN','UNSUITABLE') ORDER BY a.updated_at DESC`)
  return Promise.all(jobs.map(async job => {
    const history = await getWorkflowHistory(job.jobId)
    const state = workflowAddState(job.stage, history)
    return { ...job, history, currentNode: currentWorkflowNode(history), canAddNext: state.canAddNext, nextBlockedReason: state.reason }
  }))
}

async function assertCanCreate(jobId: number) {
  const rows = await select<{ stage: ApplicationStage }>('SELECT stage FROM applications WHERE job_id=?', [jobId])
  if (!rows[0] || rows[0].stage !== 'PROCESS') throw new Error('只有“面试/笔试”阶段的岗位才能安排招聘流程')
  const state = workflowAddState(rows[0].stage, await getWorkflowHistory(jobId))
  if (!state.canAddNext) throw new Error(state.reason ?? '当前不能新增下一流程')
}

export async function enterProcess(jobId: number) {
  const rows = await select<{ stage: ApplicationStage }>('SELECT stage FROM applications WHERE job_id=?', [jobId])
  if (!rows[0] || rows[0].stage !== 'APPLIED') throw new Error('只有已投递岗位才能进入面试/笔试阶段')
  await transaction([{ query: `UPDATE applications SET stage='PROCESS',result='PENDING',result_reason=NULL,
    submitted_at=COALESCE(submitted_at,application_date||' 12:00:00'),updated_at=CURRENT_TIMESTAMP WHERE job_id=?`, values: [jobId] }])
}

export async function restoreProcessToApplied(jobId: number) {
  const counts = await select<{ value: number }>(`SELECT
    (SELECT COUNT(*) FROM written_tests WHERE job_id=?)+(SELECT COUNT(*) FROM interviews WHERE job_id=?) AS value`, [jobId, jobId])
  if (Number(counts[0]?.value ?? 0) > 0) throw new Error('该岗位已经存在招聘流程记录，不能直接恢复为“已投递”。请先处理招聘流程记录。')
  await transaction([{ query: "UPDATE applications SET stage='APPLIED',updated_at=CURRENT_TIMESTAMP WHERE job_id=? AND stage='PROCESS'", values: [jobId] }])
}

export async function createWrittenTest(input: WrittenWorkflowInput) {
  await assertCanCreate(input.jobId)
  const sequence = await select<{ value: number }>('SELECT COALESCE(MAX(sequence_no),0)+1 AS value FROM written_tests WHERE job_id=?', [input.jobId])
  await transaction([{ query: `INSERT INTO written_tests(job_id,sequence_no,scheduled_at,time_tbd,form,test_type,location,meeting_url,status,result,notes)
    VALUES (?,?,?,?,?,?,?,?, 'SCHEDULED','PENDING',?)`, values: [input.jobId, Number(sequence[0]?.value ?? 1), input.scheduledAt, input.timeTbd ? 1 : 0, input.form, input.testType || null, input.location || null, input.meetingUrl || null, input.notes || null] }])
}

export async function createInterview(input: InterviewWorkflowInput) {
  await assertCanCreate(input.jobId)
  await transaction([{ query: `INSERT INTO interviews(job_id,round,scheduled_at,time_tbd,form,interview_type,location,meeting_url,interviewer,status,result,notes)
    VALUES (?,?,?,?,?,?,?,?,?,'SCHEDULED','PENDING',?)`, values: [input.jobId, input.round, input.scheduledAt, input.timeTbd ? 1 : 0, input.form, input.interviewType || null, input.location || null, input.meetingUrl || null, input.interviewer || null, input.notes || null] }])
}

export async function updateWorkflowNode(node: WorkflowNode, status: WorkflowNodeStatus, result: WorkflowNodeResult) {
  if (result !== 'PENDING' && status !== 'COMPLETED' && status !== 'CANCELLED') throw new Error('请先将流程状态设为已完成')
  const table = node.nodeType === 'WRITTEN_TEST' ? 'written_tests' : 'interviews'
  const statements: TransactionStatement[] = [{ query: `UPDATE ${table} SET status=?,result=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, values: [status, result, node.id] }]
  if (result === 'FAILED') statements.push({ query: `UPDATE applications SET stage='REJECTED',result='FAILED',result_reason=?,updated_at=CURRENT_TIMESTAMP WHERE job_id=?`, values: [`${node.label}未通过`, node.jobId] })
  await transaction(statements)
}

export async function finishAsOffer(jobId: number) {
  const history = await getWorkflowHistory(jobId)
  if (!history.length) throw new Error('请先完成并通过至少一个招聘流程节点')
  const state = workflowAddState('PROCESS', history)
  if (!state.canAddNext) throw new Error(state.reason ?? '当前不能结束为 Offer')
  await transaction([{ query: "UPDATE applications SET stage='OFFER',result='OFFER',updated_at=CURRENT_TIMESTAMP WHERE job_id=?", values: [jobId] }])
}

export async function finishAsRejected(jobId: number, reason = '招聘流程淘汰') {
  await transaction([{ query: "UPDATE applications SET stage='REJECTED',result='FAILED',result_reason=?,updated_at=CURRENT_TIMESTAMP WHERE job_id=?", values: [reason, jobId] }])
}

export async function finishAsWithdrawn(jobId: number) {
  await transaction([{ query: "UPDATE applications SET stage='WITHDRAWN',result='WITHDRAWN',result_reason=NULL,updated_at=CURRENT_TIMESTAMP WHERE job_id=?", values: [jobId] }])
}
