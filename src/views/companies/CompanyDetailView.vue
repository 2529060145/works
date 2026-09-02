<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Link, Plus } from '@element-plus/icons-vue'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useRoute, useRouter } from 'vue-router'
import AppCard from '../../components/common/AppCard.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import JobDialog from '../../dialogs/JobDialog.vue'
import type { Company } from '../../types/company'
import type { Job } from '../../types/job'
import { getCompany } from '../../services/companyService'
import { listJobs } from '../../services/jobService'
import { applicationStageLabels, stageTone } from '../../constants/status'

const route=useRoute(),router=useRouter(),company=ref<Company|null>(null),jobs=ref<Job[]>([]),loading=ref(false)
const dialog=ref<InstanceType<typeof JobDialog>>()
async function load(){loading.value=true;try{const id=Number(route.params.id);company.value=await getCompany(id);jobs.value=(await listJobs({companyId:id,pageSize:100})).items}catch(e){ElMessage.error(e instanceof Error?e.message:'读取企业详情失败')}finally{loading.value=false}}
function stageLabel(stage: Job['stage']) { return applicationStageLabels[stage ?? 'TO_APPLY'] }
onMounted(load)
</script>
<template><div v-loading="loading" class="page-stack">
  <PageHeader :title="company?.companyName ?? '企业详情'" :subtitle="company?.companyType || '企业资料与岗位汇总'">
    <el-button :icon="ArrowLeft" @click="router.push('/companies')">返回</el-button><el-button :icon="Plus" type="primary" @click="dialog?.open(undefined,company?.id)">新增岗位</el-button>
  </PageHeader>
  <div v-if="company" class="detail-grid"><AppCard class="profile-card"><h2>企业档案</h2><dl><div><dt>总部</dt><dd>{{ company.headquarters||'未填写' }}</dd></div><div><dt>招聘批次</dt><dd>{{ company.recruitmentBatch||'未填写' }}</dd></div><div><dt>企业简介</dt><dd>{{ company.description||'未填写' }}</dd></div><div><dt>备注</dt><dd>{{ company.notes||'未填写' }}</dd></div></dl><div class="links"><el-button v-if="company.officialWebsite" :icon="Link" @click="openUrl(company.officialWebsite)">官方网站</el-button><el-button v-if="company.recruitmentWebsite" :icon="Link" type="primary" @click="openUrl(company.recruitmentWebsite)">招聘网站</el-button></div></AppCard>
  <AppCard class="jobs-card"><div class="section-head"><div><h2>岗位列表</h2><p>共 {{ jobs.length }} 个岗位</p></div></div><el-table v-if="jobs.length" :data="jobs" stripe @row-dblclick="(row:Job)=>router.push(`/jobs/${row.id}`)"><el-table-column prop="jobName" label="岗位" min-width="180"/><el-table-column prop="location" label="地点" width="110"/><el-table-column label="阶段" width="100"><template #default="scope"><StatusTag :type="stageTone(scope.row.stage)">{{ stageLabel(scope.row.stage) }}</StatusTag></template></el-table-column><el-table-column prop="deadline" label="截止日期" width="120"/></el-table><EmptyState v-else title="暂无岗位" description="在该企业下添加第一个岗位。"/></AppCard></div>
  <EmptyState v-else title="未找到企业" description="该企业可能已被删除。"/><JobDialog ref="dialog" @saved="load"/>
</div></template>
<style scoped lang="scss">.page-stack{display:grid;gap:16px}.detail-grid{display:grid;grid-template-columns:320px minmax(0,1fr);gap:16px}.profile-card,.jobs-card{padding:20px}.profile-card h2,.section-head h2{margin:0 0 16px;font-size:16px}.profile-card dl{display:grid;gap:16px;margin:0}.profile-card dl div{display:grid;gap:5px}.profile-card dt{color:var(--text-tertiary);font-size:12px}.profile-card dd{margin:0;line-height:1.7}.links{display:flex;gap:8px;margin-top:20px}.section-head{display:flex;justify-content:space-between}.section-head p{margin:-10px 0 14px;color:var(--text-secondary);font-size:12px}.empty-state{min-height:300px}@media(max-width:1000px){.detail-grid{grid-template-columns:1fr}}</style>
