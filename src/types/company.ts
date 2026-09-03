export type ApplicationLimitType = 'UNKNOWN' | 'UNLIMITED' | 'LIMITED'

export interface Company {
  id: number
  companyName: string
  companyType?: string
  officialWebsite?: string
  recruitmentWebsite?: string
  recruitmentBatch?: string
  headquarters?: string
  description?: string
  notes?: string
  applicationLimitType: ApplicationLimitType
  maxApplications?: number
  createdAt: string
  updatedAt: string
}

export type CompanyInput = Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'applicationLimitType'> & {
  applicationLimitType?: ApplicationLimitType
}
