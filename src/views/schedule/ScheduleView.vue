<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import AppCard from '../../components/common/AppCard.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import type { ScheduleItem } from '../../services/reminderService'
import { listSchedule } from '../../services/reminderService'
import { isTauriRuntime } from '../../services/databaseService'

const router=useRouter(),rows=ref<ScheduleItem[]>([]),loading=ref(false),range=ref(30)
const groups=computed(()=>{const map=new Map<string,ScheduleItem[]>();rows.value.forEach(item=>{const day=item.scheduledAt.slice(0,10);map.set(day,[...(map.get(day)??[]),item])});return Array.from(map,([date,items])=>({date,items}))})
const typeTone=(type:ScheduleItem['eventType'])=>type==='DEADLINE'?'warning':type==='WRITTEN_TEST'?'info':'primary'
async function load(){if(!isTauriRuntime())return;loading.value=true;try{rows.value=await listSchedule(range.value||undefined)}catch(e){ElMessage.error(e instanceof Error?e.message:'读取日程失败')}finally{loading.value=false}}
onMounted(load)
</script>
<template><div class="page-stack">
  <PageHeader title="日程安排" subtitle="岗位截止、笔试与面试按时间统一呈现"><el-segmented v-model="range" :options="[{label:'7 天',value:7},{label:'30 天',value:30},{label:'全部',value:0}]" @change="load"/></PageHeader>
  <el-alert v-if="!isTauriRuntime()" title="当前是界面预览；数据功能仅在 Windows 客户端内启用。" type="info" show-icon :closable="false"/>
  <AppCard v-loading="loading" class="timeline-card">
    <el-timeline v-if="groups.length">
      <el-timeline-item v-for="group in groups" :key="group.date" :timestamp="group.date" placement="top" type="primary">
        <div class="day-events"><button v-for="item in group.items" :key="item.id" class="event-row" type="button" @click="router.push(`/jobs/${item.jobId}`)">
          <span class="event-time">{{ item.scheduledAt.slice(11,16)||'全天' }}</span><StatusTag :type="typeTone(item.eventType)">{{ item.eventLabel }}</StatusTag><strong>{{ item.companyName }} · {{ item.jobName }}</strong><small>{{ item.location }}</small>
        </button></div>
      </el-timeline-item>
    </el-timeline>
    <EmptyState v-else title="近期没有日程" description="岗位截止日期、待进行的笔试和面试会自动出现在这里。"/>
  </AppCard>
</div></template>
<style scoped lang="scss">.page-stack{display:grid;gap:16px}.timeline-card{padding:24px}.day-events{display:grid;gap:8px}.event-row{display:grid;grid-template-columns:54px 76px minmax(220px,1fr) minmax(120px,.5fr);align-items:center;gap:12px;width:100%;padding:12px 14px;border:1px solid var(--border-color);border-radius:7px;background:#fff;color:var(--text-primary);text-align:left;cursor:pointer}.event-row:hover{border-color:rgba(79,110,247,.42);box-shadow:0 7px 18px rgba(17,24,39,.05)}.event-time,.event-row small{color:var(--text-secondary)}</style>
