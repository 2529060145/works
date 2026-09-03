export type WrittenTestForm = 'ONLINE' | 'OFFLINE' | 'OTHER'
export type WorkflowNodeStatus = 'PENDING_SCHEDULE' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
export type WorkflowNodeResult = 'PENDING' | 'PASSED' | 'FAILED' | 'CANCELLED'
export type WrittenTestStatus = WorkflowNodeStatus
export type WrittenTestResult = WorkflowNodeResult

export interface WrittenTest {
  id: number
  jobId: number
  companyName: string
  jobName: string
  scheduledAt: string
  sequenceNo: number
  timeTbd: boolean
  form: WrittenTestForm
  testType?: string
  location?: string
  meetingUrl?: string
  status: WrittenTestStatus
  result: WrittenTestResult
  notes?: string
}

export type WrittenTestInput = Omit<WrittenTest, 'id' | 'companyName' | 'jobName' | 'sequenceNo'>
