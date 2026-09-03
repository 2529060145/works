export interface Job {
  id: number
  companyId: number
  companyName: string
  jobName: string
  location?: string
  recruitmentBatch?: string
  salaryText?: string
  salaryMin?: number
  salaryMax?: number
  salaryMonths?: number
  education?: string
  majorRequirement?: string
  jobRequirement?: string
  recruitmentCount?: number
  publishDate?: string
  deadline?: string
  jobUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
  stage?: import('./application').ApplicationStage
  applicationDate?: string
  result?: import('./application').ApplicationResult
  resultReason?: string
  companyType?: string
  headquarters?: string
  applicationLimitType?: import('./company').ApplicationLimitType
  maxApplications?: number
  companyAppliedCount?: number
  remainingSlots?: number
  applicationBlocked?: boolean
}

export type JobInput = Omit<Job, 'id' | 'companyName' | 'companyType' | 'headquarters' | 'applicationLimitType' | 'maxApplications' | 'companyAppliedCount' | 'remainingSlots' | 'applicationBlocked' | 'createdAt' | 'updatedAt' | 'stage' | 'applicationDate' | 'result' | 'resultReason'>
