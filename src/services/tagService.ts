import { execute, select } from './databaseService'

export interface Tag { id:number; name:string; color:string; createdAt:string }
export async function listTags(){return select<Tag>('SELECT id,name,color,created_at AS "createdAt" FROM tags ORDER BY id')}
export async function saveTag(name:string,color:string,id?:number){if(id)await execute('UPDATE tags SET name=?,color=? WHERE id=?',[name.trim(),color,id]);else await execute('INSERT INTO tags(name,color) VALUES (?,?)',[name.trim(),color])}
export async function deleteTag(id:number){await execute('DELETE FROM tags WHERE id=?',[id])}
