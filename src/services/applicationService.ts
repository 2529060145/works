import type { Application, ApplicationInput, ApplicationStage } from '../types/application'
import { execute, select } from './databaseService'

const columns = `a.id, a.job_id AS "jobId", c.company_name AS "companyName", j.job_name AS "jobName",
  a.stage, a.application_date AS "applicationDate", a.result, a.notes,
  a.created_at AS "createdAt", a.updated_at AS "updatedAt"`

export async function listApplications(stage?: ApplicationStage) {
  const where = stage ? 'WHERE a.stage=?' : ''
  return select<Application>(`SELECT ${columns} FROM applications a JOIN jobs j ON j.id=a.job_id JOIN companies c ON c.id=j.company_id ${where} ORDER BY a.updated_at DESC`, stage ? [stage] : [])
}

export async function getApplication(jobId: number) {
  const rows = await select<Application>(`SELECT ${columns} FROM applications a JOIN jobs j ON j.id=a.job_id JOIN companies c ON c.id=j.company_id WHERE a.job_id=?`, [jobId])
  return rows[0] ?? null
}

export async function saveApplication(input: ApplicationInput) {
  await execute(`INSERT INTO applications(job_id, stage, application_date, result, notes)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT(job_id) DO UPDATE SET stage=excluded.stage,
    application_date=excluded.application_date, result=excluded.result, notes=excluded.notes,
    updated_at=CURRENT_TIMESTAMP`, [input.jobId, input.stage, input.applicationDate || null, input.result, input.notes || null])
}

export async function updateApplicationStage(jobId: number, stage: ApplicationStage) {
  const applicationDate = stage === 'TO_APPLY' ? null : new Date().toISOString().slice(0, 10)
  await execute(`INSERT INTO applications(job_id, stage, application_date, result) VALUES (?, ?, ?, 'PENDING')
    ON CONFLICT(job_id) DO UPDATE SET stage=excluded.stage,
    application_date=COALESCE(applications.application_date, excluded.application_date), updated_at=CURRENT_TIMESTAMP`, [jobId, stage, applicationDate])
}
