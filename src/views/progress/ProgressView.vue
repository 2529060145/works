<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import type { Application } from '../../types/application'
import type { ApplicationStage } from '../../types/application'
import { applicationStageOptions } from '../../constants/status'
import { listApplications, updateApplicationStage } from '../../services/applicationService'
import { isTauriRuntime } from '../../services/databaseService'

const router=useRouter(), rows=ref<Application[]>([]), loading=ref(false)
const activeStages:ApplicationStage[]=['TO_APPLY','APPLIED','WRITTEN_TEST','INTERVIEW','OFFER','REJECTED']
const columns=computed(()=>activeStages.map(stage=>({stage,label:applicationStageOptions.find(i=>i.value===stage)?.label??stage,items:rows.value.filter(i=>i.stage===stage)})))
async function load(){if(!isTauriRuntime())return;loading.value=true;try{rows.value=await listApplications()}catch(e){ElMessage.error(e instanceof Error?e.message:'读取投递进度失败')}finally{loading.value=false}}
async function move(jobId:number,stage:ApplicationStage){await updateApplicationStage(jobId,stage);ElMessage.success('投递阶段已更新');await load()}
onMounted(load)
</script>
<template><div class="page-stack">
  <PageHeader title="投递进度" subtitle="按阶段查看机会，直接修改状态即可推进流程"/>
  <el-alert v-if="!isTauriRuntime()" title="当前是界面预览；数据功能仅在 Windows 客户端内启用。" type="info" show-icon :closable="false"/>
  <div v-loading="loading" class="kanban">
    <section v-for="column in columns" :key="column.stage" class="kanban-column">
      <header><span>{{ column.label }}</span><b>{{ column.items.length }}</b></header>
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
<style scoped lang="scss">.page-stack{display:grid;gap:16px}.kanban{display:grid;grid-template-columns:repeat(6,minmax(190px,1fr));gap:12px;min-height:560px;overflow-x:auto;padding-bottom:8px}.kanban-column{border:1px solid var(--border-color);border-radius:8px;background:#f4f6fa;overflow:hidden}.kanban-column>header{display:flex;align-items:center;justify-content:space-between;padding:14px 14px 12px;font-weight:700}.kanban-column header b{display:grid;place-items:center;min-width:25px;height:25px;border-radius:6px;background:#fff;color:var(--text-secondary);font-size:12px}.column-body{display:grid;align-content:start;gap:9px;padding:0 9px 12px}.job-card{display:grid;gap:7px;padding:13px;border:1px solid var(--border-color);border-radius:7px;background:#fff;box-shadow:0 4px 14px rgba(17,24,39,.04);cursor:default}.job-card strong{font-size:14px}.job-card span{color:var(--text-secondary);font-size:12px}.column-empty{display:grid;min-height:110px;place-items:center;border:1px dashed #d9dee8;border-radius:7px;color:var(--text-tertiary);font-size:12px}</style>
