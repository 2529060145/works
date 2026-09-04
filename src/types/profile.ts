export interface ProfileBasic {
  id?: number
  name?: string
  english_name?: string
  gender?: string
  birth_date?: string
  ethnicity?: string
  political_status?: string
  marital_status?: string
  health_status?: string
  height?: string
  weight?: string
  current_residence?: string
  household_location?: string
  native_place?: string
  student_origin?: string
  household_type?: string
  mailing_address?: string
  phone?: string
  email?: string
  work_start_date?: string
  current_industry?: string
  specialties?: string
  student_leader?: string
  overseas_work?: string
  disciplinary_record?: string
  photo_path?: string
}

export type ProfileEntityTable =
  | 'education_experiences'
  | 'work_experiences'
  | 'project_experiences'
  | 'academic_achievements'
  | 'certificates'
  | 'language_abilities'
  | 'honors'
  | 'family_members'
  | 'emergency_contacts'

export interface ProfileRecord {
  id: number
  sort_order: number
  created_at?: string
  updated_at?: string
  [key: string]: string | number | boolean | null | undefined
}

export interface ProfileEvaluation { id?: number; content: string }
export interface ProfileHobbies { id?: number; tags: string; description: string }

export interface ProfileField {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'date' | 'month' | 'number' | 'select' | 'switch'
  options?: string[]
  required?: boolean
  wide?: boolean
}
