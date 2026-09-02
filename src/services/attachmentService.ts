import { appDataDir, basename, join } from '@tauri-apps/api/path'
import { open } from '@tauri-apps/plugin-dialog'
import { mkdir, readFile, remove, writeFile } from '@tauri-apps/plugin-fs'
import { openPath } from '@tauri-apps/plugin-opener'
import type { Attachment } from '../types/attachment'
import { execute, select } from './databaseService'

export async function listAttachments(jobId:number){return select<Attachment>('SELECT id,job_id AS "jobId",file_name AS "fileName",stored_path AS "storedPath",created_at AS "createdAt" FROM attachments WHERE job_id=? ORDER BY created_at DESC',[jobId])}
export async function addAttachment(jobId:number){const selected=await open({multiple:false,filters:[{name:'常用附件',extensions:['png','jpg','jpeg','webp','pdf','doc','docx']} ]});if(!selected||Array.isArray(selected))return null;const fileName=await basename(selected);const directory=await join(await appDataDir(),'attachments',String(jobId));await mkdir(directory,{recursive:true});const safeName=fileName.replace(/[^a-zA-Z0-9._\u4e00-\u9fa5-]/g,'_');const destination=await join(directory,`${crypto.randomUUID()}_${safeName}`);await writeFile(destination,await readFile(selected));await execute('INSERT INTO attachments(job_id,file_name,stored_path) VALUES (?,?,?)',[jobId,fileName,destination]);return destination}
export async function openAttachment(item:Attachment){await openPath(item.storedPath)}
export async function deleteAttachment(item:Attachment){try{await remove(item.storedPath)}finally{await execute('DELETE FROM attachments WHERE id=?',[item.id])}}
