import * as XLSX from 'xlsx'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readFile, writeFile } from '@tauri-apps/plugin-fs'
import type { ApplicationResult, ApplicationStage } from '../types/application'
import { applicationResultLabels, applicationStageLabels } from '../constants/status'
import { listCompanies, saveCompany } from './companyService'
import { execute, select } from './databaseService'
import { excelText as text, parseExcelRows } from './excelImportParser'
import { saveJob } from './jobService'

const stageByLabel = Object.fromEntries(Object.entries(applicationStageLabels).map(([key,value])=>[value,key])) as Record<string,ApplicationStage>
const resultByLabel = Object.fromEntries(Object.entries(applicationResultLabels).map(([key,value])=>[value,key])) as Record<string,ApplicationResult>
const numberValue=(value:string)=>value&&Number.isFinite(Number(value))?Number(value):undefined

export interface ImportReport { fileName:string; rows:number; companiesCreated:number; jobsCreated:number; applicationsUpdated:number; skipped:number; errors:string[] }

export async function importExcel():Promise<ImportReport|null>{
  const selected=await open({multiple:false,filters:[{name:'Excel 工作簿',extensions:['xlsx','xls']}]})
  if(!selected||Array.isArray(selected))return null
  const workbook=XLSX.read(await readFile(selected),{type:'array',cellDates:true})
  const sheet=workbook.Sheets[workbook.SheetNames[0]]
  const rows=parseExcelRows(sheet)
  const report:ImportReport={fileName:selected.split(/[\\/]/).pop()??selected,rows:rows.length,companiesCreated:0,jobsCreated:0,applicationsUpdated:0,skipped:0,errors:[]}
  const companies=await listCompanies()
  const companyMap=new Map(companies.map(i=>[i.companyName.trim().toLowerCase(),i.id]))
  const existingJobs=await select<{id:number;companyId:number;jobName:string;location:string}>('SELECT id,company_id AS "companyId",job_name AS "jobName",COALESCE(location,\'\') AS location FROM jobs')
  const jobMap=new Map(existingJobs.map(i=>[`${i.companyId}|${i.jobName.toLowerCase()}|${i.location.toLowerCase()}`,i.id]))
  let previousCompanyName=''
  for(const {rowNumber,values:row} of rows){
    try{
      const currentCompanyName=text(row,'企业名称','公司名称','企业','companyName')
      if(currentCompanyName)previousCompanyName=currentCompanyName
      const companyName=currentCompanyName||previousCompanyName||'未填写企业'
      const jobName=text(row,'岗位名称','职位名称','岗位','投递岗位','jobName')
      if(!jobName){report.skipped++;report.errors.push(`第 ${rowNumber} 行：岗位名称为空，已跳过`);continue}
      let companyId=companyMap.get(companyName.toLowerCase())
      if(!companyId){companyId=Number(await saveCompany({companyName,companyType:text(row,'企业性质','公司性质'),headquarters:text(row,'总部','总部所在地'),recruitmentBatch:text(row,'招聘批次'),officialWebsite:text(row,'官方网站'),recruitmentWebsite:text(row,'招聘网站'),description:'',notes:text(row,'企业备注')}));companyMap.set(companyName.toLowerCase(),companyId);report.companiesCreated++}
      const location=text(row,'工作地点','地点','location')
      const jobKey=`${companyId}|${jobName.toLowerCase()}|${location.toLowerCase()}`
      let jobId=jobMap.get(jobKey)
      if(!jobId){jobId=Number(await saveJob({companyId,jobName,location,recruitmentBatch:text(row,'招聘批次'),salaryText:text(row,'薪资','薪资原文'),salaryMin:numberValue(text(row,'最低薪资')),salaryMax:numberValue(text(row,'最高薪资')),salaryMonths:numberValue(text(row,'薪资月数')),education:text(row,'学历要求'),majorRequirement:text(row,'专业要求'),jobRequirement:text(row,'岗位要求'),recruitmentCount:numberValue(text(row,'招聘人数'))??0,publishDate:text(row,'发布日期'),deadline:text(row,'截止日期'),jobUrl:text(row,'招聘链接','岗位链接','网址链接'),notes:text(row,'岗位备注','备注')}));jobMap.set(jobKey,jobId);report.jobsCreated++}
      else report.skipped++
      const stageText=text(row,'投递阶段','状态','stage')
      const deliveryText=text(row,'是否已经投递简历','是否投递')
      const resultText=text(row,'投递结果','结果')
      const result=(resultByLabel[resultText]??(resultText in applicationResultLabels?resultText:'PENDING')) as ApplicationResult
      const resultReason=text(row,'未通过原因','投递结果原因')
      let stage=(stageByLabel[stageText]??(stageText in applicationStageLabels?stageText:deliveryText==='已投递'?'APPLIED':'TO_APPLY')) as ApplicationStage
      if(result==='OFFER')stage='OFFER'
      else if(result==='UNSUITABLE')stage='UNSUITABLE'
      else if(['FAILED','JOB_CANCELLED','COMPANY_TERMINATED'].includes(result))stage='REJECTED'
      else if(result==='WITHDRAWN')stage='WITHDRAWN'
      const applicationDate=text(row,'投递日期','企业投递日期')
      if(stage!=='TO_APPLY'||applicationDate||result!=='PENDING'){await execute('UPDATE applications SET stage=?,application_date=?,result=?,result_reason=?,updated_at=CURRENT_TIMESTAMP WHERE job_id=?',[stage,applicationDate||null,result,result==='FAILED'?resultReason||null:null,jobId]);report.applicationsUpdated++}
    }catch(error){report.skipped++;report.errors.push(`第 ${rowNumber} 行：${error instanceof Error?error.message:'导入失败'}`)}
  }
  return report
}

export async function exportExcel(){
  const jobs=await select<Record<string,unknown>>(`SELECT c.company_name AS 企业名称,c.company_type AS 企业性质,c.headquarters AS 总部所在地,j.job_name AS 岗位名称,j.location AS 工作地点,j.recruitment_batch AS 招聘批次,j.salary_text AS 薪资,j.education AS 学历要求,j.major_requirement AS 专业要求,j.job_requirement AS 岗位要求,j.recruitment_count AS 招聘人数,j.publish_date AS 发布日期,j.deadline AS 截止日期,j.job_url AS 招聘链接,COALESCE(a.stage,'TO_APPLY') AS 投递阶段,a.application_date AS 投递日期,COALESCE(a.result,'PENDING') AS 投递结果,a.result_reason AS 未通过原因,j.notes AS 备注 FROM jobs j JOIN companies c ON c.id=j.company_id LEFT JOIN applications a ON a.job_id=j.id ORDER BY c.company_name,j.job_name`)
  const companies=await select<Record<string,unknown>>(`SELECT company_name AS 企业名称,company_type AS 企业性质,headquarters AS 总部所在地,official_website AS 官方网站,recruitment_website AS 招聘网站,recruitment_batch AS 招聘批次,description AS 企业简介,notes AS 备注 FROM companies ORDER BY company_name`)
  jobs.forEach(row=>{
    row['投递阶段']=applicationStageLabels[(row['投递阶段']??'TO_APPLY') as ApplicationStage]
    row['投递结果']=applicationResultLabels[(row['投递结果']??'PENDING') as ApplicationResult]
  })
  const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(jobs),'岗位与投递');XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(companies),'企业')
  const now=new Date(),stamp=`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
  const destination=await save({defaultPath:`求职投递数据_${stamp}.xlsx`,filters:[{name:'Excel 工作簿',extensions:['xlsx']}]})
  if(!destination)return null
  await writeFile(destination,new Uint8Array(XLSX.write(workbook,{type:'array',bookType:'xlsx'})))
  return {destination,count:jobs.length}
}
