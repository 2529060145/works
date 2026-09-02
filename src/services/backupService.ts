import { appConfigDir, join } from '@tauri-apps/api/path'
import { open, save } from '@tauri-apps/plugin-dialog'
import { copyFile, readFile, stat } from '@tauri-apps/plugin-fs'
import { getDatabase } from './databaseService'

async function databasePath(){return join(await appConfigDir(),'job_manager.db')}
export async function backupDatabase(){const now=new Date(),stamp=now.toISOString().replace(/[-:T]/g,'').slice(0,14);const destination=await save({defaultPath:`job_manager_${stamp}.db`,filters:[{name:'SQLite 数据库',extensions:['db']}]});if(!destination)return null;const db=await getDatabase();await db.execute('PRAGMA wal_checkpoint(FULL)');await copyFile(await databasePath(),destination);return destination}
export async function restoreDatabase(){const selected=await open({multiple:false,filters:[{name:'SQLite 数据库',extensions:['db']}]});if(!selected||Array.isArray(selected))return null;const info=await stat(selected);if(!info.isFile||info.size<100)throw new Error('选择的备份文件无效');const header=new TextDecoder().decode((await readFile(selected)).slice(0,16));if(header!=='SQLite format 3\u0000')throw new Error('选择的文件不是有效的 SQLite 数据库');const db=await getDatabase();await db.close();await copyFile(selected,await databasePath());return selected}
