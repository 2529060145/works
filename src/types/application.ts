export type ApplicationStage =
  | 'TO_APPLY'
  | 'APPLIED'
  | 'WRITTEN_TEST'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'UNSUITABLE'

export type ApplicationResult = 'PENDING' | 'PASSED' | 'FAILED' | 'OFFER' | 'WITHDRAWN' | 'UNSUITABLE'

export interface Application {
  id: number
  jobId: number
  companyName: string
  jobName: string
  stage: ApplicationStage
  applicationDate?: string
  result: ApplicationResult
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ApplicationInput {
  jobId: number
  stage: ApplicationStage
  applicationDate?: string
  result: ApplicationResult
  notes?: string
}
