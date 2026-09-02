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
  createdAt: string
  updatedAt: string
}

export type CompanyInput = Omit<Company, 'id' | 'createdAt' | 'updatedAt'>
