<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck, CircleClose, Document, Medal, Promotion, RemoveFilled, User, WarningFilled } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import type { Application } from '../../types/application'
import type { ApplicationStage } from '../../types/application'
import { applicationStageOptions } from '../../constants/status'
import { listApplications, updateApplicationStage } from '../../services/applicationService'
import { isTauriRuntime } from '../../services/databaseService'

const router=useRouter(), rows=ref<Application[]>([]), loading=ref(false)
const activeStages:ApplicationStage[]=['TO_APPLY','APPLIED','WRITTEN_TEST','INTERVIEW','OFFER','REJECTED','WITHDRAWN','UNSUITABLE']
const stageIcons={TO_APPLY:Promotion,APPLIED:CircleCheck,WRITTEN_TEST:Document,INTERVIEW:User,OFFER:Medal,REJECTED:CircleClose,WITHDRAWN:RemoveFilled,UNSUITABLE:WarningFilled} as const
const columns=computed(()=>activeStages.map(stage=>({stage,label:applicationStageOptions.find(i=>i.value===stage)?.label??stage,icon:stageIcons[stage as keyof typeof stageIcons],items:rows.value.filter(i=>i.stage===stage)})))
async function load(){if(!isTauriRuntime())return;loading.value=true;try{rows.value=await listApplications()}catch(e){ElMessage.error(e instanceof Error?e.message:'读取投递进度失败')}finally{loading.value=false}}
async function move(jobId:number,stage:ApplicationStage){await updateApplicationStage(jobId,stage);ElMessage.success('投递阶段已更新');await load()}
onMounted(load)
</script>
<template><div class="page-stack">
  <PageHeader title="投递进度" subtitle="按阶段查看机会，直接修改状态即可推进流程"/>
  <el-alert v-if="!isTauriRuntime()" title="当前是界面预览；数据功能仅在 Windows 客户端内启用。" type="info" show-icon :closable="false"/>
  <div v-loading="loading" class="kanban">
    <section v-for="column in columns" :key="column.stage" class="kanban-column" :class="`stage-${column.stage.toLowerCase()}`">
      <header><span><el-icon><component :is="column.icon"/></el-icon>{{ column.label }}</span><b>{{ column.items.length }}</b></header>
      <div class="column-body">
        <article v-for="item in column.items" :key="item.id" class="job-card" @dblclick="router.push(`/jobs/${item.jobId}`)">
          <strong>{{ item.jobName }}</strong><span>{{ item.companyName }}</span>
          <el-select :model-value="item.stage" size="small" @change="move(item.jobId,$event as ApplicationStage)"><el-option v-for="option in applicationStageOptions" :key="option.value" :label="option.label" :value="option.value"/></el-select>
        </article>
        <div v-if="!column.items.length" class="column-empty">暂无记录</div>
      </div>
    </section>
  </div>
</div></template>
<style scoped lang="scss">
.page-stack{display:grid;gap:16px}
.kanban{display:grid;grid-template-columns:repeat(4,minmax(220px,1fr));gap:12px;min-height:560px;padding-bottom:8px}
.kanban-column{--stage:#4f6ef7;overflow:hidden;border:1px solid color-mix(in srgb,var(--stage) 42%,var(--border-color));border-radius:8px;background:color-mix(in srgb,var(--stage) 5%,var(--bg-card));box-shadow:0 5px 16px rgba(17,24,39,.05)}
.stage-to_apply{--stage:#d97706}.stage-applied{--stage:#2563eb}.stage-written_test{--stage:#7c3aed}.stage-interview{--stage:#0f766e}.stage-offer{--stage:#15803d}.stage-rejected{--stage:#dc2626}
.stage-withdrawn{--stage:#475569}.stage-unsuitable{--stage:#b91c1c}
.kanban-column>header{display:flex;min-height:50px;align-items:center;justify-content:space-between;padding:12px 13px;color:#fff;background:var(--stage);font-weight:700}
.kanban-column>header span{display:flex;align-items:center;gap:8px}.kanban-column>header .el-icon{font-size:17px}
.kanban-column header b{display:grid;min-width:27px;height:27px;place-items:center;border:1px solid rgba(255,255,255,.28);border-radius:6px;color:#fff;background:rgba(0,0,0,.14);font-size:12px}
.column-body{display:grid;align-content:start;gap:9px;padding:10px}
.job-card{display:grid;gap:8px;padding:13px;border:1px solid color-mix(in srgb,var(--stage) 22%,var(--border-color));border-left:4px solid var(--stage);border-radius:7px;background:var(--bg-card);box-shadow:0 4px 14px rgba(17,24,39,.06);cursor:default;transition:transform 150ms ease,box-shadow 150ms ease}
.job-card:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(17,24,39,.1)}.job-card strong{font-size:14px}.job-card span{color:var(--text-secondary);font-size:12px}
.column-empty{display:grid;min-height:110px;place-items:center;border:1px dashed color-mix(in srgb,var(--stage) 42%,var(--border-color));border-radius:7px;color:color-mix(in srgb,var(--stage) 75%,var(--text-primary));background:color-mix(in srgb,var(--stage) 8%,var(--bg-card));font-size:12px}
@media(max-width:1100px){.kanban{grid-template-columns:repeat(3,minmax(220px,1fr));overflow-x:auto}}
</style>
