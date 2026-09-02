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
}

export type JobInput = Omit<Job, 'id' | 'companyName' | 'createdAt' | 'updatedAt' | 'stage' | 'applicationDate'>
