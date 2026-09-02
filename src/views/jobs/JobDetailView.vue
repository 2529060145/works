<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Edit, Link, Paperclip, Plus } from '@element-plus/icons-vue'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useRoute, useRouter } from 'vue-router'
import AppCard from '../../components/common/AppCard.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import JobDialog from '../../dialogs/JobDialog.vue'
import ApplicationDialog from '../../dialogs/ApplicationDialog.vue'
import WrittenTestDialog from '../../dialogs/WrittenTestDialog.vue'
import InterviewDialog from '../../dialogs/InterviewDialog.vue'
import AttachmentDialog from '../../dialogs/AttachmentDialog.vue'
import type { Job } from '../../types/job'
import type { Application } from '../../types/application'
import type { WrittenTest } from '../../types/writtenTest'
import type { Interview } from '../../types/interview'
import { getJob } from '../../services/jobService'
import { getApplication } from '../../services/applicationService'
import { listWrittenTests } from '../../services/writtenTestService'
import { listInterviews } from '../../services/interviewService'
import { applicationStageLabels, stageTone } from '../../constants/status'
import { isWebLink, openWebLink } from '../../utils/link'

const route=useRoute(),router=useRouter(),job=ref<Job|null>(null),application=ref<Application|null>(null),tests=ref<WrittenTest[]>([]),interviews=ref<Interview[]>([]),loading=ref(false)
const jobDialog=ref<InstanceType<typeof JobDialog>>(),applicationDialog=ref<InstanceType<typeof ApplicationDialog>>(),testDialog=ref<InstanceType<typeof WrittenTestDialog>>(),interviewDialog=ref<InstanceType<typeof InterviewDialog>>(),attachmentDialog=ref<InstanceType<typeof AttachmentDialog>>()
const events=computed(()=>[...tests.value.map(i=>({id:`w${i.id}`,time:i.scheduledAt,title:'笔试',detail:i.location})),...interviews.value.map(i=>({id:`i${i.id}`,time:i.scheduledAt,title:{FIRST:'一面',SECOND:'二面',THIRD:'三面',HR:'HR 面',OTHER:'面试'}[i.round],detail:i.location}))].sort((a,b)=>a.time.localeCompare(b.time)))
async function load(){loading.value=true;try{const id=Number(route.params.id);job.value=await getJob(id);application.value=await getApplication(id);tests.value=(await listWrittenTests()).filter(i=>i.jobId===id);interviews.value=(await listInterviews()).filter(i=>i.jobId===id)}catch(e){ElMessage.error(e instanceof Error?e.message:'读取岗位详情失败')}finally{loading.value=false}}
onMounted(load)
</script>
<template><div v-loading="loading" class="page-stack">
  <PageHeader :title="job?.jobName ?? '岗位详情'" :subtitle="job ? `${job.companyName} · ${job.location||'地点未填写'}` : '岗位信息、投递进度与事件时间轴'">
    <el-button :icon="ArrowLeft" @click="router.push('/jobs')">返回</el-button><el-button v-if="job" :icon="Paperclip" @click="attachmentDialog?.open(job.id)">附件</el-button><el-button v-if="job?.jobUrl" :icon="Link" @click="openUrl(job.jobUrl)">招聘链接</el-button><el-button v-if="job" :icon="Edit" type="primary" @click="jobDialog?.open(job)">编辑岗位</el-button>
  </PageHeader>
  <template v-if="job"><div class="summary-strip"><div><span>当前阶段</span><StatusTag :type="stageTone(job.stage)">{{ applicationStageLabels[job.stage??'TO_APPLY'] }}</StatusTag></div><div><span>投递日期</span><strong>{{ application?.applicationDate||'未投递' }}</strong></div><div><span>截止日期</span><strong>{{ job.deadline||'未填写' }}</strong></div><div><span>薪资</span><strong>{{ job.salaryText||'未填写' }}</strong></div><el-button @click="applicationDialog?.open(application??undefined,job.id)">更新投递</el-button></div>
  <div class="detail-grid"><AppCard class="info-card"><div class="section-head"><h2>岗位信息</h2></div><dl><div><dt>招聘批次</dt><dd>{{ job.recruitmentBatch||'未填写' }}</dd></div><div><dt>学历要求</dt><dd>{{ job.education||'未填写' }}</dd></div><div><dt>招聘人数</dt><dd>{{ job.recruitmentCount??0 }}</dd></div><div class="wide"><dt>专业要求</dt><dd>{{ job.majorRequirement||'未填写' }}</dd></div><div class="wide"><dt>岗位要求</dt><dd class="preline">{{ job.jobRequirement||'未填写' }}</dd></div><div class="wide"><dt>备注</dt><dd>{{ job.notes||'未填写' }}</dd></div></dl></AppCard>
  <AppCard class="timeline-card"><div class="section-head"><h2>流程时间轴</h2><div><el-button :icon="Plus" link type="primary" @click="testDialog?.open(undefined,job.id)">笔试</el-button><el-button :icon="Plus" link type="primary" @click="interviewDialog?.open(undefined,job.id)">面试</el-button></div></div><el-timeline v-if="events.length"><el-timeline-item v-for="item in events" :key="item.id" :timestamp="item.time" placement="top"><strong>{{ item.title }}</strong><p>{{ item.detail||'未填写地点或链接' }}<el-button v-if="isWebLink(item.detail)" :icon="Link" link type="primary" title="打开链接" @click="openWebLink(item.detail)"/></p></el-timeline-item></el-timeline><EmptyState v-else title="暂无流程记录" description="添加笔试或面试后会按时间显示。"/></AppCard></div></template>
  <EmptyState v-else title="未找到岗位" description="该岗位可能已被删除。"/>
  <JobDialog ref="jobDialog" @saved="load"/><ApplicationDialog ref="applicationDialog" @saved="load"/><WrittenTestDialog ref="testDialog" @saved="load"/><InterviewDialog ref="interviewDialog" @saved="load"/><AttachmentDialog ref="attachmentDialog"/>
</div></template>
<style scoped lang="scss">.page-stack{display:grid;gap:16px}.summary-strip{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr)) auto;align-items:center;gap:12px;padding:14px 18px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card);box-shadow:var(--shadow-card)}.summary-strip>div{display:grid;gap:6px}.summary-strip span{color:var(--text-tertiary);font-size:12px}.detail-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(330px,.8fr);gap:16px}.info-card,.timeline-card{padding:20px}.section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.section-head h2{margin:0;font-size:16px}.info-card dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:0}.info-card dl div{display:grid;align-content:start;gap:6px}.info-card .wide{grid-column:1/-1}.info-card dt{color:var(--text-tertiary);font-size:12px}.info-card dd{margin:0;line-height:1.75}.preline{white-space:pre-line}.timeline-card p{margin:5px 0 0;color:var(--text-secondary);font-size:12px}.timeline-card .empty-state{min-height:250px}@media(max-width:1050px){.summary-strip{grid-template-columns:repeat(2,1fr)}.detail-grid{grid-template-columns:1fr}}</style>
