export type WrittenTestForm = 'ONLINE' | 'OFFLINE' | 'OTHER'
export type WrittenTestStatus = 'WAITING' | 'COMPLETED' | 'CANCELLED'
export type WrittenTestResult = 'PENDING' | 'PASSED' | 'FAILED'

export interface WrittenTest {
  id: number
  jobId: number
  companyName: string
  jobName: string
  scheduledAt: string
  form: WrittenTestForm
  location?: string
  status: WrittenTestStatus
  result: WrittenTestResult
  notes?: string
}

export type WrittenTestInput = Omit<WrittenTest, 'id' | 'companyName' | 'jobName'>
