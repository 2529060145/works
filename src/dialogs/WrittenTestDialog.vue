<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import type { WrittenTest, WrittenTestInput } from '../types/writtenTest'
import { listJobOptions } from '../services/jobService'
import { saveWrittenTest } from '../services/writtenTestService'
import { localDateValue } from '../utils/dateTime'

const emit = defineEmits<{ saved: [] }>()
const visible=ref(false),saving=ref(false),editingId=ref<number>(),fixedJob=ref(false)
const jobs=ref<{id:number;label:string}[]>([]),formRef=ref<FormInstance>(),scheduledDate=ref(''),scheduledTime=ref('19:00:00')
const form=reactive<WrittenTestInput>({jobId:0,scheduledAt:'',timeTbd:false,form:'ONLINE',testType:'',location:'',meetingUrl:'',status:'SCHEDULED',result:'PENDING',notes:''})
const rules:FormRules={jobId:[{required:true,message:'请选择岗位',trigger:'change'}]}
const selectedJobLabel=computed(()=>jobs.value.find(item=>item.id===form.jobId)?.label??'正在读取岗位...')

async function open(record?:WrittenTest,jobId?:number){
  editingId.value=record?.id;fixedJob.value=Boolean(jobId||record)
  scheduledDate.value=record?.scheduledAt?.slice(0,10)??localDateValue();scheduledTime.value=record?.scheduledAt?.slice(11,19)||'19:00:00'
  Object.assign(form,{jobId:jobId??record?.jobId??0,scheduledAt:record?.scheduledAt??'',timeTbd:Boolean(record?.timeTbd),form:record?.form??'ONLINE',testType:record?.testType??'',location:record?.location??'',meetingUrl:record?.meetingUrl??'',status:record?.status??'SCHEDULED',result:record?.result??'PENDING',notes:record?.notes??''})
  visible.value=true
  try{jobs.value=await listJobOptions()}catch{jobs.value=[]}
  if(form.jobId&&!jobs.value.some(item=>item.id===form.jobId))jobs.value.unshift({id:form.jobId,label:record?`${record.companyName} · ${record.jobName}`:`岗位 #${form.jobId}`})
  nextTick(()=>formRef.value?.clearValidate())
}
async function submit(){
  if(!(await formRef.value?.validate().catch(()=>false)))return
  if(!scheduledDate.value){ElMessage.warning('请选择笔试日期');return}
  if(!form.timeTbd&&!scheduledTime.value){ElMessage.warning('请选择笔试时间');return}
  form.scheduledAt=`${scheduledDate.value} ${form.timeTbd?'00:00:00':scheduledTime.value}`
  saving.value=true
  try{await saveWrittenTest(form,editingId.value);ElMessage.success('笔试流程已保存');visible.value=false;emit('saved')}
  catch(error){ElMessage.error(error instanceof Error?error.message:'保存笔试失败')}
  finally{saving.value=false}
}
defineExpose({open})
</script>
<template><el-dialog v-model="visible" :title="editingId?'编辑笔试流程':'安排笔试'" width="640px" destroy-on-close><el-form ref="formRef" :model="form" :rules="rules" label-position="top">
  <el-form-item label="企业 / 岗位" prop="jobId"><el-input v-if="fixedJob" :model-value="selectedJobLabel" disabled/><el-select v-else v-model="form.jobId" filterable><el-option v-for="item in jobs" :key="item.id" :label="item.label" :value="item.id"/></el-select></el-form-item>
  <div class="sequence-note">笔试场次按该岗位历史记录自动生成，不会覆盖已有笔试。</div>
  <div class="form-grid"><el-form-item label="笔试日期"><el-date-picker v-model="scheduledDate" type="date" value-format="YYYY-MM-DD"/></el-form-item><el-form-item label="笔试时间"><el-time-picker v-model="scheduledTime" value-format="HH:mm:ss" :disabled="form.timeTbd"/></el-form-item><el-form-item label="笔试形式"><el-select v-model="form.form"><el-option label="线上" value="ONLINE"/><el-option label="线下" value="OFFLINE"/><el-option label="其他" value="OTHER"/></el-select></el-form-item><el-form-item label="笔试类型"><el-input v-model="form.testType" placeholder="例如：统一笔试、在线测评"/></el-form-item></div>
  <el-checkbox v-model="form.timeTbd">时间待定</el-checkbox>
  <div v-if="editingId" class="form-grid state-grid"><el-form-item label="流程状态"><el-select v-model="form.status"><el-option label="待进行" value="SCHEDULED"/><el-option label="已完成" value="COMPLETED"/><el-option label="已取消" value="CANCELLED"/></el-select></el-form-item><el-form-item label="流程结果"><el-select v-model="form.result"><el-option label="等待结果" value="PENDING"/><el-option label="通过" value="PASSED"/><el-option label="未通过" value="FAILED"/><el-option label="取消" value="CANCELLED"/></el-select></el-form-item></div>
  <el-form-item label="地点"><el-input v-model="form.location" placeholder="线下地点，可空缺"/></el-form-item><el-form-item label="考试链接"><el-input v-model="form.meetingUrl" placeholder="https://...，可空缺"/></el-form-item><el-form-item label="备注"><el-input v-model="form.notes" type="textarea" :rows="3"/></el-form-item>
</el-form><template #footer><el-button @click="visible=false">取消</el-button><el-button type="primary" :loading="saving" @click="submit">保存流程</el-button></template></el-dialog></template>
<style scoped>.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}.state-grid{margin-top:12px}.el-select,.el-date-editor{width:100%}.sequence-note{margin:-3px 0 14px;border-left:3px solid var(--purple);padding:8px 10px;color:var(--text-secondary);background:color-mix(in srgb,var(--purple) 7%,var(--bg-card));font-size:12px}</style>
