import type { ProfileBasic, ProfileEntityTable, ProfileEvaluation, ProfileHobbies, ProfileRecord } from '../types/profile'
import { execute, select, transaction } from './databaseService'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

const tableColumns: Record<ProfileEntityTable, string[]> = {
  education_experiences: ['school_name','start_date','end_date','is_current','duration_years','education_level','degree','degree_detail','study_type','admission_type','college','major','major_category','research_direction','ranking','is_top_up_degree','is_overseas','position','main_courses','failed_course_count','remark'],
  work_experiences: ['company_name','company_type','industry','work_type','position_name','start_date','end_date','is_current','region','monthly_salary','salary_unit','subordinate_count','is_overseas','responsibilities','reference_name','reference_position','reference_phone','remark'],
  project_experiences: ['project_name','start_date','end_date','is_current','role','organization','team_size','description','responsibilities','achievements','tech_stack','remark'],
  academic_achievements: ['achievement_name','achievement_type','author_role','venue','status','accepted_date','published_date','research_field','doi','remark'],
  certificates: ['certificate_name','obtained_date','level','score','certificate_number','validity_type','valid_from','valid_until','remark'],
  language_abilities: ['language','level','score','speaking_ability','reading_ability','remark'],
  honors: ['honor_name','obtained_date','honor_level','award_grade','issuer','description','remark'],
  family_members: ['name','relationship','organization','position','phone','remark'],
  emergency_contacts: ['name','relationship','phone','organization','remark'],
}

const basicColumns = ['name','english_name','gender','birth_date','ethnicity','political_status','marital_status','health_status','height','weight','current_residence','household_location','native_place','student_origin','household_type','mailing_address','phone','email','work_status','work_start_date','current_industry','specialties','student_leader','overseas_work','disciplinary_record','photo_path']

function cleanValues(source: Record<string, unknown>, columns: string[]) {
  return Object.fromEntries(columns.filter(column => column in source).map(column => [column, source[column] === '' ? null : source[column]]))
}

export async function getBasicProfile() {
  return (await select<ProfileBasic>('SELECT * FROM profile_basic ORDER BY id LIMIT 1'))[0] ?? {}
}

export async function saveBasicProfile(profile: ProfileBasic) {
  const values = cleanValues(profile as Record<string, unknown>, basicColumns)
  const current = await getBasicProfile()
  if (current.id) {
    const columns = Object.keys(values)
    await execute(`UPDATE profile_basic SET ${columns.map(column=>`${column}=?`).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...Object.values(values), current.id])
    return current.id
  }
  const columns = Object.keys(values)
  const result = await execute(`INSERT INTO profile_basic(${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`, Object.values(values))
  return result.lastInsertId
}

export async function listProfileRecords(table: ProfileEntityTable) {
  return select<ProfileRecord>(`SELECT * FROM ${table} ORDER BY sort_order,id`)
}

export async function saveProfileRecord(table: ProfileEntityTable, source: Record<string, unknown>, id?: number) {
  const values = cleanValues(source, tableColumns[table])
  const columns = Object.keys(values)
  if (!columns.length) throw new Error('没有可保存的字段')
  if (id) {
    await execute(`UPDATE ${table} SET ${columns.map(column=>`${column}=?`).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...Object.values(values), id])
    return id
  }
  const result = await execute(`INSERT INTO ${table}(${columns.join(',')},sort_order) VALUES (${columns.map(()=>'?').join(',')},(SELECT COALESCE(MAX(sort_order),-1)+1 FROM ${table}))`, Object.values(values))
  return result.lastInsertId
}

export async function deleteProfileRecord(table: ProfileEntityTable, id: number) {
  await execute(`DELETE FROM ${table} WHERE id=?`, [id])
}

export async function moveProfileRecord(table: ProfileEntityTable, id: number, direction: -1 | 1) {
  const rows = await select<{id:number;sort_order:number}>(`SELECT id,sort_order FROM ${table} ORDER BY sort_order,id`)
  const index = rows.findIndex(item=>item.id===id), target = rows[index + direction]
  if (index < 0 || !target) return
  await transaction([
    { query:`UPDATE ${table} SET sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,values:[target.sort_order,id] },
    { query:`UPDATE ${table} SET sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,values:[rows[index].sort_order,target.id] },
  ])
}

export async function getEvaluation() {
  return (await select<ProfileEvaluation>('SELECT id,content FROM profile_evaluation ORDER BY id LIMIT 1'))[0] ?? { content:'' }
}
export async function saveEvaluation(content: string) {
  const current=await getEvaluation()
  if(current.id)await execute('UPDATE profile_evaluation SET content=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[content,current.id])
  else await execute('INSERT INTO profile_evaluation(content) VALUES (?)',[content])
}

export async function getHobbies() {
  return (await select<ProfileHobbies>('SELECT id,tags,description FROM profile_hobbies ORDER BY id LIMIT 1'))[0] ?? { tags:'',description:'' }
}
export async function saveHobbies(tags: string[], description: string) {
  const current=await getHobbies(),serialized=tags.map(item=>item.trim()).filter(Boolean).join('\n')
  if(current.id)await execute('UPDATE profile_hobbies SET tags=?,description=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[serialized,description,current.id])
  else await execute('INSERT INTO profile_hobbies(tags,description) VALUES (?,?)',[serialized,description])
}

export async function chooseProfilePhoto() {
  const selected=await open({multiple:false,filters:[{name:'个人照片',extensions:['jpg','jpeg','png']}]})
  if(!selected||Array.isArray(selected))return null
  return invoke<{storedPath:string}>('copy_profile_file',{source:selected,category:'profile_photo'})
}

export async function replaceProfilePhoto(oldPath?:string) {
  const stored=await chooseProfilePhoto();if(!stored)return null
  try { await saveBasicProfile({photo_path:stored.storedPath}) }
  catch (error) { await invoke('delete_managed_file',{path:stored.storedPath}).catch(()=>undefined);throw error }
  if(oldPath&&oldPath!==stored.storedPath)await invoke('delete_managed_file',{path:oldPath}).catch(()=>undefined)
  return stored.storedPath
}

export async function removeProfilePhoto(path?:string) {
  await saveBasicProfile({photo_path:''})
  if(path)await invoke('delete_managed_file',{path}).catch(()=>undefined)
}
