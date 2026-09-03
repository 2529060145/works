<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, CircleCheck, Edit, Link, Paperclip, RefreshLeft, Right } from '@element-plus/icons-vue'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useRoute, useRouter } from 'vue-router'
import AppCard from '../../components/common/AppCard.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import JobDialog from '../../dialogs/JobDialog.vue'
import AttachmentDialog from '../../dialogs/AttachmentDialog.vue'
import type { Job } from '../../types/job'
import type { Application } from '../../types/application'
import { getJob } from '../../services/jobService'
import { getApplication, markJobApplied, restoreJobToPending } from '../../services/applicationService'
import { getCompanyAppliedJobs } from '../../services/applicationEligibilityService'
import type { WorkflowNode } from '../../services/recruitmentWorkflowService'
import { getWorkflowHistory, workflowResultLabels, workflowStatusLabels } from '../../services/recruitmentWorkflowService'
import { applicationStageLabels, stageTone } from '../../constants/status'
import { isWebLink, openWebLink } from '../../utils/link'
import { displayDateTime } from '../../utils/dateTime'

const route=useRoute(),router=useRouter(),job=ref<Job|null>(null),application=ref<Application|null>(null),events=ref<WorkflowNode[]>([]),loading=ref(false)
const jobDialog=ref<InstanceType<typeof JobDialog>>(),attachmentDialog=ref<InstanceType<typeof AttachmentDialog>>()
const currentNode=computed(()=>[...events.value].reverse().find(item=>item.status==='SCHEDULED'||(item.status==='COMPLETED'&&item.result==='PENDING'))??events.value[events.value.length-1])
async function load(){loading.value=true;try{const id=Number(route.params.id);[job.value,application.value,events.value]=await Promise.all([getJob(id),getApplication(id),getWorkflowHistory(id)])}catch(e){ElMessage.error(e instanceof Error?e.message:'读取岗位详情失败')}finally{loading.value=false}}
async function applyJob(){
  if(!job.value)return
  await ElMessageBox.confirm(`企业：${job.value.companyName}\n岗位：${job.value.jobName}\n\n确认后将记录投递状态和投递日期。`,'确认已经投递该岗位吗？',{type:'info',confirmButtonText:'确认已投递',cancelButtonText:'取消',customClass:'multiline-message-box'})
  const result=await markJobApplied(job.value.id)
  if(!result.updated){await showAppliedJobs();return}
  ElMessage.success('已记录投递状态和日期');await load()
}
async function restorePending(){
  if(!job.value)return
  await ElMessageBox.confirm('该岗位已经记录为已投递。\n\n确认恢复为“待投递”吗？\n\n这将清除当前投递状态，但不会自动删除已经存在的笔试和面试记录。','恢复待投递',{type:'warning',confirmButtonText:'确认恢复',cancelButtonText:'取消',customClass:'multiline-message-box'})
  const result=await restoreJobToPending(job.value.id)
  if(!result.updated){ElMessage.warning('该岗位已经进入后续招聘流程，不能直接修改为待投递。请先处理对应的笔试、面试或结果记录。');return}
  ElMessage.success('已恢复为待投递');await load()
}
async function showAppliedJobs(){
  if(!job.value)return
  const items=await getCompanyAppliedJobs(job.value.companyId)
  const detail=items.length?items.map(item=>`• ${item.jobName}　${item.applicationDate}`).join('\n'):'暂无已投递岗位'
  await ElMessageBox.alert(`${job.value.companyName}最多允许投递 ${job.value.maxApplications??0} 个岗位，当前已经投递 ${job.value.companyAppliedCount??0} 个岗位。\n\n已投递岗位：\n${detail}`,'已达到企业投递上限',{confirmButtonText:'关闭',customClass:'multiline-message-box'})
}
onMounted(load)
</script>
<template><div v-loading="loading" class="page-stack">
  <PageHeader :title="job?.jobName ?? '岗位详情'" :subtitle="job ? `${job.companyName} · ${job.location||'地点未填写'}` : '岗位信息、投递进度与事件时间轴'">
    <el-button :icon="ArrowLeft" @click="router.push('/jobs')">返回</el-button><el-button v-if="job" :icon="Paperclip" @click="attachmentDialog?.open(job.id)">附件</el-button><el-button v-if="job?.jobUrl" :icon="Link" @click="openUrl(job.jobUrl)">招聘链接</el-button><el-button v-if="job" :icon="Edit" type="primary" @click="jobDialog?.open(job)">编辑岗位</el-button>
  </PageHeader>
  <template v-if="job"><div class="summary-strip"><div><span>当前阶段</span><StatusTag :type="stageTone(job.stage)">{{ applicationStageLabels[job.stage??'TO_APPLY'] }}</StatusTag></div><div><span>当前进展</span><strong>{{ currentNode?.label||'尚未安排' }}</strong></div><div><span>投递日期</span><strong>{{ application?.submittedAt||application?.applicationDate||'未投递' }}</strong></div><div><span>截止日期</span><strong>{{ job.deadline||'未填写' }}</strong></div><el-tooltip :disabled="!job.applicationBlocked" content="该企业已经达到最大投递数量"><span><el-button v-if="job.stage==='TO_APPLY'" :icon="CircleCheck" type="primary" :disabled="job.applicationBlocked" @click="applyJob">{{ job.applicationBlocked?'已达投递上限':'标记已投递' }}</el-button><el-button v-else-if="job.stage==='APPLIED'" :icon="RefreshLeft" @click="restorePending">恢复待投递</el-button><el-button v-else-if="job.stage==='PROCESS'" :icon="Right" type="primary" @click="router.push('/workflow')">前往招聘流程</el-button></span></el-tooltip></div>
  <div class="limit-strip" :class="{blocked:job.applicationBlocked}"><div><span>企业投递限制</span><strong>{{ job.applicationLimitType==='LIMITED'? `最多 ${job.maxApplications} 个` : job.applicationLimitType==='UNLIMITED'?'不限制':'未知' }}</strong></div><div><span>已投递</span><strong>{{ job.companyAppliedCount??0 }} 个</strong></div><div><span>剩余名额</span><strong>{{ job.applicationLimitType==='LIMITED'? `${job.remainingSlots??0} 个`:'不限制' }}</strong></div><p v-if="job.applicationBlocked">你已经达到该企业的最大投递数量。</p><el-button v-if="(job.companyAppliedCount??0)>0" link type="primary" @click="showAppliedJobs">查看已投递岗位</el-button></div>
  <div class="detail-grid"><AppCard class="info-card"><div class="section-head"><h2>岗位信息</h2></div><dl><div><dt>招聘批次</dt><dd>{{ job.recruitmentBatch||'未填写' }}</dd></div><div><dt>学历要求</dt><dd>{{ job.education||'未填写' }}</dd></div><div><dt>招聘人数</dt><dd>{{ job.recruitmentCount??0 }}</dd></div><div class="wide"><dt>专业要求</dt><dd>{{ job.majorRequirement||'未填写' }}</dd></div><div class="wide"><dt>岗位要求</dt><dd class="preline">{{ job.jobRequirement||'未填写' }}</dd></div><div class="wide"><dt>备注</dt><dd>{{ job.notes||'未填写' }}</dd></div></dl></AppCard>
  <AppCard class="timeline-card"><div class="section-head"><h2>招聘流程时间轴</h2><el-button v-if="job.stage==='PROCESS'" :icon="Right" link type="primary" @click="router.push('/workflow')">管理流程</el-button></div><el-timeline v-if="events.length"><el-timeline-item v-for="item in events" :key="item.key" :timestamp="displayDateTime(item.scheduledAt,item.timeTbd)" placement="top"><strong>{{ item.label }}</strong><p>{{ workflowStatusLabels[item.status] }} · {{ workflowResultLabels[item.result] }}<template v-if="item.location"> · {{ item.location }}</template><el-button v-if="item.meetingUrl&&isWebLink(item.meetingUrl)" :icon="Link" link type="primary" title="打开流程链接" @click="openWebLink(item.meetingUrl)"/></p></el-timeline-item></el-timeline><EmptyState v-else title="暂无流程记录" description="进入面试/笔试阶段后，请在招聘流程页面安排第一个节点。"/></AppCard></div></template>
  <EmptyState v-else title="未找到岗位" description="该岗位可能已被删除。"/>
  <JobDialog ref="jobDialog" @saved="load"/><AttachmentDialog ref="attachmentDialog"/>
</div></template>
<style scoped lang="scss">.page-stack{display:grid;gap:16px}.summary-strip,.limit-strip{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr)) auto;align-items:center;gap:12px;padding:14px 18px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card);box-shadow:var(--shadow-card)}.summary-strip>div,.limit-strip>div{display:grid;gap:6px}.summary-strip span,.limit-strip span{color:var(--text-tertiary);font-size:12px}.limit-strip{grid-template-columns:repeat(3,minmax(130px,1fr)) minmax(220px,1.5fr) auto;border-left:4px solid var(--teal)}.limit-strip.blocked{border-left-color:var(--danger);background:color-mix(in srgb,var(--danger) 5%,var(--bg-card))}.limit-strip p{margin:0;color:var(--danger);font-weight:600}.detail-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(330px,.8fr);gap:16px}.info-card,.timeline-card{padding:20px}.section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.section-head h2{margin:0;font-size:16px}.info-card dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:0}.info-card dl div{display:grid;align-content:start;gap:6px}.info-card .wide{grid-column:1/-1}.info-card dt{color:var(--text-tertiary);font-size:12px}.info-card dd{margin:0;line-height:1.75}.preline{white-space:pre-line}.timeline-card p{margin:5px 0 0;color:var(--text-secondary);font-size:12px}.timeline-card .empty-state{min-height:250px}@media(max-width:1050px){.summary-strip,.limit-strip{grid-template-columns:repeat(2,1fr)}.detail-grid{grid-template-columns:1fr}}</style>
