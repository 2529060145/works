export type InterviewRound = 'FIRST' | 'SECOND' | 'THIRD' | 'HR' | 'OTHER'
export type InterviewForm = 'ONLINE' | 'OFFLINE' | 'PHONE' | 'OTHER'
export type InterviewStatus = 'WAITING' | 'COMPLETED' | 'CANCELLED'
export type InterviewResult = 'PENDING' | 'PASSED' | 'FAILED' | 'OFFER'

export interface Interview {
  id: number
  jobId: number
  companyName: string
  jobName: string
  round: InterviewRound
  scheduledAt: string
  form: InterviewForm
  location?: string
  status: InterviewStatus
  result: InterviewResult
  notes?: string
}

export type InterviewInput = Omit<Interview, 'id' | 'companyName' | 'jobName'>
