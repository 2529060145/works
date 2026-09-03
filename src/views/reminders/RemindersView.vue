<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppCard from '../../components/common/AppCard.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import type { ScheduleItem } from '../../services/reminderService'
import { listSchedule } from '../../services/reminderService'
import { isTauriRuntime } from '../../services/databaseService'

const router=useRouter(),rows=ref<ScheduleItem[]>([])
const now=Date.now()
const decorated=computed(()=>rows.value.map(item=>{const hours=(new Date(item.scheduledAt.replace(' ','T')).getTime()-now)/3600000;return{...item,hours,level:item.applicationBlocked?'低优先级':hours<=24?'紧急':hours<=72?'3 天内':'7 天内'}}))
onMounted(async()=>{if(isTauriRuntime())rows.value=await listSchedule(7)})
</script>
<template><div class="page-stack"><PageHeader title="提醒中心" subtitle="未来 7 天的岗位截止、笔试和面试"/><el-alert v-if="!isTauriRuntime()" title="当前是界面预览；数据功能仅在 Windows 客户端内启用。" type="info" show-icon :closable="false"/><AppCard class="reminder-card"><div v-if="decorated.length" class="reminder-list"><button v-for="item in decorated" :key="item.id" :class="{muted:item.applicationBlocked}" type="button" @click="router.push(`/jobs/${item.jobId}`)"><StatusTag :type="item.applicationBlocked?'info':item.hours<=24?'danger':item.hours<=72?'warning':'primary'">{{ item.level }}</StatusTag><span><strong>{{ item.eventLabel }} · {{ item.jobName }}</strong><small>{{ item.companyName }}<template v-if="item.location"> · {{ item.location }}</template><template v-if="item.applicationBlocked"> · 已达企业投递上限</template></small></span><time>{{ item.scheduledAt.slice(0,16) }}</time></button></div><EmptyState v-else title="未来 7 天没有提醒" description="临近截止、笔试和面试会自动出现在这里。"/></AppCard></div></template>
<style scoped lang="scss">.page-stack{display:grid;gap:16px}.reminder-card{padding:18px}.reminder-list{display:grid;gap:8px}.reminder-list button{display:grid;grid-template-columns:78px minmax(0,1fr) 150px;align-items:center;gap:14px;padding:14px;border:1px solid var(--border-color);border-radius:7px;background:var(--bg-card);color:var(--text-primary);text-align:left;cursor:pointer}.reminder-list button.muted{opacity:.68;background:var(--bg-page)}.reminder-list button:hover{border-color:rgba(79,110,247,.4)}.reminder-list span{display:grid;gap:4px}.reminder-list small,.reminder-list time{color:var(--text-secondary)}</style>
