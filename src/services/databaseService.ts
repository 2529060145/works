import { invoke } from '@tauri-apps/api/core'

export interface ExecuteResult {
  rowsAffected: number
  lastInsertId: number
}

interface DatabaseClient {
  execute(query: string, values?: unknown[]): Promise<ExecuteResult>
  select<T>(query: string, values?: unknown[]): Promise<T>
}

export interface TransactionStatement {
  query: string
  values?: unknown[]
}

export interface PortableDataPaths {
  dataDirectory: string
  databasePath: string
  attachmentDirectory: string
}

const database: DatabaseClient = {
  execute: (query, values = []) => invoke('database_execute', { query, values }),
  select: (query, values = []) => invoke('database_select', { query, values }),
}
let initialized = false

const migrations = [
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    company_type TEXT,
    official_website TEXT,
    recruitment_website TEXT,
    recruitment_batch TEXT,
    headquarters TEXT,
    application_limit_type TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(application_limit_type IN ('UNKNOWN','UNLIMITED','LIMITED')),
    max_applications INTEGER CHECK(max_applications IS NULL OR max_applications >= 1),
    description TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    job_name TEXT NOT NULL,
    location TEXT,
    recruitment_batch TEXT,
    salary_text TEXT,
    salary_min REAL,
    salary_max REAL,
    salary_months INTEGER,
    education TEXT,
    major_requirement TEXT,
    job_requirement TEXT,
    recruitment_count INTEGER NOT NULL DEFAULT 0 CHECK(recruitment_count >= 0),
    publish_date TEXT,
    deadline TEXT,
    job_url TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL UNIQUE,
    stage TEXT NOT NULL DEFAULT 'TO_APPLY',
    application_date TEXT,
    submitted_at TEXT,
    result TEXT NOT NULL DEFAULT 'PENDING',
    result_reason TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS written_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    scheduled_at TEXT NOT NULL,
    sequence_no INTEGER NOT NULL DEFAULT 1,
    time_tbd INTEGER NOT NULL DEFAULT 0,
    form TEXT NOT NULL DEFAULT 'ONLINE',
    test_type TEXT,
    location TEXT,
    meeting_url TEXT,
    status TEXT NOT NULL DEFAULT 'WAITING',
    result TEXT NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS interviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    round TEXT NOT NULL DEFAULT 'FIRST',
    scheduled_at TEXT NOT NULL,
    time_tbd INTEGER NOT NULL DEFAULT 0,
    form TEXT NOT NULL DEFAULT 'ONLINE',
    interview_type TEXT,
    location TEXT,
    meeting_url TEXT,
    interviewer TEXT,
    status TEXT NOT NULL DEFAULT 'WAITING',
    result TEXT NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    color TEXT NOT NULL DEFAULT '#4f6ef7',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS job_tags (
    job_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY(job_id, tag_id),
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS profile_basic (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, english_name TEXT, gender TEXT, birth_date TEXT, ethnicity TEXT,
    political_status TEXT, marital_status TEXT, health_status TEXT, height TEXT, weight TEXT, current_residence TEXT,
    household_location TEXT, native_place TEXT, student_origin TEXT, household_type TEXT, mailing_address TEXT,
    phone TEXT, email TEXT, work_status TEXT, work_start_date TEXT, current_industry TEXT, specialties TEXT, student_leader TEXT,
    overseas_work TEXT, disciplinary_record TEXT, photo_path TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS education_experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT, school_name TEXT NOT NULL, start_date TEXT, end_date TEXT, is_current INTEGER NOT NULL DEFAULT 0,
    duration_years TEXT, education_level TEXT, degree TEXT, degree_detail TEXT, study_type TEXT, admission_type TEXT,
    college TEXT, major TEXT, major_category TEXT, research_direction TEXT, ranking TEXT, is_top_up_degree INTEGER NOT NULL DEFAULT 0,
    is_overseas INTEGER NOT NULL DEFAULT 0, position TEXT, main_courses TEXT, failed_course_count INTEGER, remark TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS work_experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT, company_name TEXT NOT NULL, company_type TEXT, industry TEXT, work_type TEXT,
    position_name TEXT, start_date TEXT, end_date TEXT, is_current INTEGER NOT NULL DEFAULT 0, region TEXT, monthly_salary TEXT,
    salary_unit TEXT, subordinate_count INTEGER, is_overseas INTEGER NOT NULL DEFAULT 0, responsibilities TEXT, reference_name TEXT,
    reference_position TEXT, reference_phone TEXT, remark TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS project_experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT, project_name TEXT NOT NULL, start_date TEXT, end_date TEXT, is_current INTEGER NOT NULL DEFAULT 0,
    role TEXT, organization TEXT, team_size INTEGER, description TEXT, responsibilities TEXT, achievements TEXT, tech_stack TEXT,
    remark TEXT, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS academic_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT, achievement_name TEXT NOT NULL, achievement_type TEXT, author_role TEXT, venue TEXT,
    status TEXT, accepted_date TEXT, published_date TEXT, research_field TEXT, doi TEXT, remark TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT, certificate_name TEXT NOT NULL, obtained_date TEXT, level TEXT, score TEXT,
    certificate_number TEXT, validity_type TEXT, valid_from TEXT, valid_until TEXT, remark TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS language_abilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT, language TEXT NOT NULL, level TEXT, score TEXT, speaking_ability TEXT,
    reading_ability TEXT, remark TEXT, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS honors (
    id INTEGER PRIMARY KEY AUTOINCREMENT, honor_name TEXT NOT NULL, obtained_date TEXT, honor_level TEXT, award_grade TEXT,
    issuer TEXT, description TEXT, remark TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS family_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, relationship TEXT, organization TEXT, position TEXT, phone TEXT,
    remark TEXT, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS emergency_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, relationship TEXT, phone TEXT, organization TEXT, remark TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS profile_evaluation (
    id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS profile_hobbies (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tags TEXT, description TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS proof_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT, display_name TEXT NOT NULL, original_name TEXT NOT NULL, file_path TEXT NOT NULL,
    file_extension TEXT NOT NULL, file_size INTEGER NOT NULL DEFAULT 0, category TEXT NOT NULL DEFAULT (char(26410,20998,31867)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  'CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id)',
  'CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs(deadline)',
  'CREATE INDEX IF NOT EXISTS idx_applications_stage ON applications(stage)',
  'CREATE INDEX IF NOT EXISTS idx_written_tests_time ON written_tests(scheduled_at)',
  'CREATE INDEX IF NOT EXISTS idx_interviews_time ON interviews(scheduled_at)',
]

export function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function initializeDatabase() {
  if (initialized || !isTauriRuntime()) return
  await database.execute('PRAGMA foreign_keys = ON')
  for (const statement of migrations) await database.execute(statement)
  const companyColumns = await database.select<{ name: string }[]>('PRAGMA table_info(companies)')
  const existingCompanyColumns = new Set(companyColumns.map(column => column.name))
  if (!existingCompanyColumns.has('application_limit_type')) {
    await database.execute("ALTER TABLE companies ADD COLUMN application_limit_type TEXT NOT NULL DEFAULT 'UNKNOWN'")
  }
  if (!existingCompanyColumns.has('max_applications')) {
    await database.execute('ALTER TABLE companies ADD COLUMN max_applications INTEGER')
  }
  const applicationColumns = await database.select<{ name: string }[]>('PRAGMA table_info(applications)')
  if (!applicationColumns.some(column => column.name === 'result_reason')) {
    await database.execute('ALTER TABLE applications ADD COLUMN result_reason TEXT')
  }
  if (!applicationColumns.some(column => column.name === 'submitted_at')) {
    await database.execute('ALTER TABLE applications ADD COLUMN submitted_at TEXT')
    await database.execute("UPDATE applications SET submitted_at=application_date||' 12:00:00' WHERE application_date IS NOT NULL")
  }
  const profileColumns = new Set((await database.select<{ name: string }[]>('PRAGMA table_info(profile_basic)')).map(column => column.name))
  if (!profileColumns.has('work_status')) await database.execute('ALTER TABLE profile_basic ADD COLUMN work_status TEXT')
  const certificateColumns = new Set((await database.select<{ name: string }[]>('PRAGMA table_info(certificates)')).map(column => column.name))
  if (!certificateColumns.has('validity_type')) await database.execute('ALTER TABLE certificates ADD COLUMN validity_type TEXT')
  if (!certificateColumns.has('valid_from')) await database.execute('ALTER TABLE certificates ADD COLUMN valid_from TEXT')
  const writtenColumns = new Set((await database.select<{ name: string }[]>('PRAGMA table_info(written_tests)')).map(column => column.name))
  if (!writtenColumns.has('sequence_no')) await database.execute('ALTER TABLE written_tests ADD COLUMN sequence_no INTEGER NOT NULL DEFAULT 1')
  if (!writtenColumns.has('time_tbd')) await database.execute('ALTER TABLE written_tests ADD COLUMN time_tbd INTEGER NOT NULL DEFAULT 0')
  if (!writtenColumns.has('test_type')) await database.execute('ALTER TABLE written_tests ADD COLUMN test_type TEXT')
  if (!writtenColumns.has('meeting_url')) await database.execute('ALTER TABLE written_tests ADD COLUMN meeting_url TEXT')
  await database.execute(`UPDATE written_tests SET sequence_no=(SELECT COUNT(*) FROM written_tests previous
    WHERE previous.job_id=written_tests.job_id AND (previous.created_at<written_tests.created_at
      OR (previous.created_at=written_tests.created_at AND previous.id<=written_tests.id)))`)
  const interviewColumns = new Set((await database.select<{ name: string }[]>('PRAGMA table_info(interviews)')).map(column => column.name))
  if (!interviewColumns.has('time_tbd')) await database.execute('ALTER TABLE interviews ADD COLUMN time_tbd INTEGER NOT NULL DEFAULT 0')
  if (!interviewColumns.has('interview_type')) await database.execute('ALTER TABLE interviews ADD COLUMN interview_type TEXT')
  if (!interviewColumns.has('meeting_url')) await database.execute('ALTER TABLE interviews ADD COLUMN meeting_url TEXT')
  if (!interviewColumns.has('interviewer')) await database.execute('ALTER TABLE interviews ADD COLUMN interviewer TEXT')
  await database.execute("UPDATE written_tests SET status='SCHEDULED' WHERE status='WAITING'")
  await database.execute("UPDATE interviews SET status='SCHEDULED' WHERE status='WAITING'")
  await database.execute("UPDATE applications SET stage='PROCESS' WHERE stage IN ('WRITTEN_TEST','INTERVIEW')")
  await database.execute('INSERT OR IGNORE INTO schema_migrations(version) VALUES (?)', [1])
  for (const [name, color] of [
    ['重点', '#ef5b5b'],
    ['冲刺', '#ff9f43'],
    ['稳妥', '#22b573'],
    ['保底', '#3b82f6'],
    ['优先投递', '#8b5cf6'],
  ]) {
    await database.execute('INSERT OR IGNORE INTO tags(name, color) VALUES (?, ?)', [name, color])
  }
  await database.execute("INSERT OR IGNORE INTO settings(setting_key, setting_value) VALUES ('user_name', '用户')")
  await database.execute("INSERT OR IGNORE INTO settings(setting_key, setting_value) VALUES ('theme', 'light')")
  initialized = true
}

export async function getDatabase() {
  if (!isTauriRuntime()) throw new Error('请在 Windows 客户端中使用数据功能')
  if (!initialized) await initializeDatabase()
  return database
}

export async function getPortableDataPaths() {
  if (!isTauriRuntime()) throw new Error('请在 Windows 客户端中查看数据目录')
  return invoke<PortableDataPaths>('portable_data_paths')
}

export async function select<T>(query: string, values: unknown[] = []) {
  return (await (await getDatabase()).select<T[]>(query, values)) as T[]
}

export async function execute(query: string, values: unknown[] = []) {
  return (await getDatabase()).execute(query, values)
}

export async function transaction(statements: TransactionStatement[]) {
  if (!isTauriRuntime()) throw new Error('请在 Windows 客户端中使用数据功能')
  if (!initialized) await initializeDatabase()
  return invoke<ExecuteResult>('database_transaction', { statements: statements.map(item => ({ query: item.query, values: item.values ?? [] })) })
}
