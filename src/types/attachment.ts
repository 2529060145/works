export type AttachmentType = 'SCREENSHOT' | 'JD' | 'NOTICE' | 'PDF' | 'WORD' | 'IMAGE' | 'OTHER'

export interface Attachment { id:number; jobId:number; fileName:string; storedPath:string; createdAt:string }
