import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import type { Attachment } from '../types/attachment'
import { execute, select } from './databaseService'

export async function listAttachments(jobId:number){return select<Attachment>('SELECT id,job_id AS "jobId",file_name AS "fileName",stored_path AS "storedPath",created_at AS "createdAt" FROM attachments WHERE job_id=? ORDER BY created_at DESC',[jobId])}
export async function addAttachment(jobId:number){const selected=await open({multiple:false,filters:[{name:'常用附件',extensions:['png','jpg','jpeg','webp','pdf','doc','docx']} ]});if(!selected||Array.isArray(selected))return null;const stored=await invoke<{fileName:string;storedPath:string}>('copy_attachment',{source:selected,jobId});await execute('INSERT INTO attachments(job_id,file_name,stored_path) VALUES (?,?,?)',[jobId,stored.fileName,stored.storedPath]);return stored.storedPath}
export async function openAttachment(item:Attachment){await invoke('open_portable_path',{path:item.storedPath})}
export async function deleteAttachment(item:Attachment){try{await invoke('delete_portable_file',{path:item.storedPath})}finally{await execute('DELETE FROM attachments WHERE id=?',[item.id])}}
