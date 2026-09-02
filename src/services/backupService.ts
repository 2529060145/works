import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'

export async function backupDatabase(){const now=new Date(),stamp=now.toISOString().replace(/[-:T]/g,'').slice(0,14);const destination=await save({defaultPath:`job_manager_${stamp}.db`,filters:[{name:'SQLite 数据库',extensions:['db']}]});if(!destination)return null;await invoke('backup_database',{destination});return destination}
export async function restoreDatabase(){const selected=await open({multiple:false,filters:[{name:'SQLite 数据库',extensions:['db']}]});if(!selected||Array.isArray(selected))return null;await invoke('restore_database',{source:selected});return selected}
