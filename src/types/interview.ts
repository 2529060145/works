export type InterviewRound = 'FIRST' | 'SECOND' | 'THIRD' | 'HR' | 'FINAL' | 'OTHER'
export type InterviewForm = 'ONLINE' | 'OFFLINE' | 'PHONE' | 'OTHER'
export type InterviewStatus = import('./writtenTest').WorkflowNodeStatus
export type InterviewResult = import('./writtenTest').WorkflowNodeResult

export interface Interview {
  id: number
  jobId: number
  companyName: string
  jobName: string
  round: InterviewRound
  scheduledAt: string
  timeTbd: boolean
  form: InterviewForm
  interviewType?: string
  location?: string
  meetingUrl?: string
  interviewer?: string
  status: InterviewStatus
  result: InterviewResult
  notes?: string
}

export type InterviewInput = Omit<Interview, 'id' | 'companyName' | 'jobName'>
