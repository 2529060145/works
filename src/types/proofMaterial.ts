export interface ProofMaterial {
  id: number
  displayName: string
  originalName: string
  filePath: string
  fileExtension: 'pdf' | 'doc' | 'docx'
  fileSize: number
  category: string
  createdAt: string
  updatedAt: string
}

export interface SelectedProofFile {
  sourcePath: string
  originalName: string
  extension: 'pdf' | 'doc' | 'docx'
  fileSize: number
}

export const proofCategories = ['未分类','学历学位','成绩单','资格证书','获奖证明','论文材料','实习证明','工作证明','身份证明','其他']
