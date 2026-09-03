<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import type { Interview, InterviewInput, InterviewRound } from '../types/interview'
import { listJobOptions } from '../services/jobService'
import { saveInterview } from '../services/interviewService'
import { localDateValue } from '../utils/dateTime'

const emit=defineEmits<{saved:[]}>()
const visible=ref(false),saving=ref(false),editingId=ref<number>(),fixedJob=ref(false)
const jobs=ref<{id:number;label:string}[]>([]),formRef=ref<FormInstance>(),scheduledDate=ref(''),scheduledTime=ref('14:00:00')
const form=reactive<InterviewInput>({jobId:0,round:'FIRST',scheduledAt:'',timeTbd:false,form:'ONLINE',interviewType:'',location:'',meetingUrl:'',interviewer:'',status:'SCHEDULED',result:'PENDING',notes:''})
const rules:FormRules={jobId:[{required:true,message:'请选择岗位',trigger:'change'}]}
const selectedJobLabel=computed(()=>jobs.value.find(item=>item.id===form.jobId)?.label??'正在读取岗位...')
async function open(record?:Interview,jobId?:number,round:InterviewRound='FIRST'){
  editingId.value=record?.id;fixedJob.value=Boolean(jobId||record);scheduledDate.value=record?.scheduledAt?.slice(0,10)??localDateValue();scheduledTime.value=record?.scheduledAt?.slice(11,19)||'14:00:00'
  Object.assign(form,{jobId:jobId??record?.jobId??0,round:record?.round??round,scheduledAt:record?.scheduledAt??'',timeTbd:Boolean(record?.timeTbd),form:record?.form??'ONLINE',interviewType:record?.interviewType??'',location:record?.location??'',meetingUrl:record?.meetingUrl??'',interviewer:record?.interviewer??'',status:record?.status??'SCHEDULED',result:record?.result??'PENDING',notes:record?.notes??''})
  visible.value=true;try{jobs.value=await listJobOptions()}catch{jobs.value=[]};if(form.jobId&&!jobs.value.some(item=>item.id===form.jobId))jobs.value.unshift({id:form.jobId,label:record?`${record.companyName} · ${record.jobName}`:`岗位 #${form.jobId}`});nextTick(()=>formRef.value?.clearValidate())
}
async function submit(){if(!(await formRef.value?.validate().catch(()=>false)))return;if(!scheduledDate.value){ElMessage.warning('请选择面试日期');return}if(!form.timeTbd&&!scheduledTime.value){ElMessage.warning('请选择面试时间');return}form.scheduledAt=`${scheduledDate.value} ${form.timeTbd?'00:00:00':scheduledTime.value}`;saving.value=true;try{await saveInterview(form,editingId.value);ElMessage.success('面试流程已保存');visible.value=false;emit('saved')}catch(error){ElMessage.error(error instanceof Error?error.message:'保存面试失败')}finally{saving.value=false}}
defineExpose({open})
</script>
<template><el-dialog v-model="visible" :title="editingId?'编辑面试流程':'安排面试'" width="660px" destroy-on-close><el-form ref="formRef" :model="form" :rules="rules" label-position="top">
  <el-form-item label="企业 / 岗位" prop="jobId"><el-input v-if="fixedJob" :model-value="selectedJobLabel" disabled/><el-select v-else v-model="form.jobId" filterable><el-option v-for="item in jobs" :key="item.id" :label="item.label" :value="item.id"/></el-select></el-form-item>
  <div class="form-grid"><el-form-item label="面试轮次"><el-select v-model="form.round"><el-option label="一面" value="FIRST"/><el-option label="二面" value="SECOND"/><el-option label="三面" value="THIRD"/><el-option label="HR 面" value="HR"/><el-option label="终面" value="FINAL"/><el-option label="其他面试" value="OTHER"/></el-select></el-form-item><el-form-item label="面试形式"><el-select v-model="form.form"><el-option label="线上" value="ONLINE"/><el-option label="线下" value="OFFLINE"/><el-option label="电话" value="PHONE"/><el-option label="其他" value="OTHER"/></el-select></el-form-item><el-form-item label="面试日期"><el-date-picker v-model="scheduledDate" type="date" value-format="YYYY-MM-DD"/></el-form-item><el-form-item label="面试时间"><el-time-picker v-model="scheduledTime" value-format="HH:mm:ss" :disabled="form.timeTbd"/></el-form-item></div>
  <el-checkbox v-model="form.timeTbd">时间待定</el-checkbox><div v-if="editingId" class="form-grid state-grid"><el-form-item label="流程状态"><el-select v-model="form.status"><el-option label="待进行" value="SCHEDULED"/><el-option label="已完成" value="COMPLETED"/><el-option label="已取消" value="CANCELLED"/></el-select></el-form-item><el-form-item label="流程结果"><el-select v-model="form.result"><el-option label="等待结果" value="PENDING"/><el-option label="通过" value="PASSED"/><el-option label="未通过" value="FAILED"/><el-option label="取消" value="CANCELLED"/></el-select></el-form-item></div>
  <el-form-item label="面试类型"><el-input v-model="form.interviewType" placeholder="例如：技术面、综合面，可空缺"/></el-form-item><el-form-item label="地点"><el-input v-model="form.location" placeholder="线下地点，可空缺"/></el-form-item><el-form-item label="会议链接"><el-input v-model="form.meetingUrl" placeholder="https://...，可空缺"/></el-form-item><el-form-item label="面试官"><el-input v-model="form.interviewer" placeholder="可空缺"/></el-form-item><el-form-item label="备注"><el-input v-model="form.notes" type="textarea" :rows="3"/></el-form-item>
</el-form><template #footer><el-button @click="visible=false">取消</el-button><el-button type="primary" :loading="saving" @click="submit">保存流程</el-button></template></el-dialog></template>
<style scoped>.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}.state-grid{margin-top:12px}.el-select,.el-date-editor{width:100%}</style>
