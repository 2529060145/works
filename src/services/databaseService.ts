import Database from '@tauri-apps/plugin-sql'

export const DATABASE_URL = 'sqlite:job_manager.db'

let database: Database | null = null
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
    result TEXT NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS written_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    scheduled_at TEXT NOT NULL,
    form TEXT NOT NULL DEFAULT 'ONLINE',
    location TEXT,
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
    form TEXT NOT NULL DEFAULT 'ONLINE',
    location TEXT,
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
  database = await Database.load(DATABASE_URL)
  await database.execute('PRAGMA foreign_keys = ON')
  for (const statement of migrations) await database.execute(statement)
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
  if (!database) throw new Error('数据库尚未初始化')
  return database
}

export async function select<T>(query: string, values: unknown[] = []) {
  return (await (await getDatabase()).select<T[]>(query, values)) as T[]
}

export async function execute(query: string, values: unknown[] = []) {
  return (await getDatabase()).execute(query, values)
}
