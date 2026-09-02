<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Plus } from '@element-plus/icons-vue'
import AppCard from '../../components/common/AppCard.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import InterviewDialog from '../../dialogs/InterviewDialog.vue'
import type { Interview } from '../../types/interview'
import { deleteInterview, listInterviews } from '../../services/interviewService'
import { isTauriRuntime } from '../../services/databaseService'

const rows=ref<Interview[]>([]),loading=ref(false),dialog=ref<InstanceType<typeof InterviewDialog>>()
const roundLabels={FIRST:'一面',SECOND:'二面',THIRD:'三面',HR:'HR 面',OTHER:'其他'} as const
const formLabels={ONLINE:'线上',OFFLINE:'线下',PHONE:'电话',OTHER:'其他'} as const
const resultLabels={PENDING:'待通知',PASSED:'通过',FAILED:'未通过',OFFER:'Offer'} as const
async function load(){if(!isTauriRuntime())return;loading.value=true;try{rows.value=await listInterviews()}catch(e){ElMessage.error(e instanceof Error?e.message:'读取面试失败')}finally{loading.value=false}}
async function remove(row:Interview){await ElMessageBox.confirm('确定删除这条面试记录吗？','删除面试',{type:'warning'});await deleteInterview(row.id);ElMessage.success('面试记录已删除');load()}
onMounted(load)
</script>
<template><div class="page-stack">
  <PageHeader title="面试管理" subtitle="跟踪多轮面试安排和结果"><el-button :icon="Plus" type="primary" @click="dialog?.open()">新增面试</el-button></PageHeader>
  <el-alert v-if="!isTauriRuntime()" title="当前是界面预览；数据功能仅在 Windows 客户端内启用。" type="info" show-icon :closable="false"/>
  <AppCard class="data-card"><el-table v-if="rows.length" v-loading="loading" :data="rows" stripe>
    <el-table-column prop="companyName" label="企业" min-width="180"/><el-table-column prop="jobName" label="岗位" min-width="180"/>
    <el-table-column label="轮次" width="90"><template #default="scope"><StatusTag>{{ roundLabels[scope.row.round as keyof typeof roundLabels] }}</StatusTag></template></el-table-column>
    <el-table-column prop="scheduledAt" label="面试时间" width="170"/><el-table-column label="形式" width="90"><template #default="scope">{{ formLabels[scope.row.form as keyof typeof formLabels] }}</template></el-table-column>
    <el-table-column prop="location" label="地点 / 链接" min-width="150" show-overflow-tooltip/><el-table-column label="结果" width="90"><template #default="scope">{{ resultLabels[scope.row.result as keyof typeof resultLabels] }}</template></el-table-column>
    <el-table-column label="操作" width="110"><template #default="scope"><el-button :icon="Edit" link @click="dialog?.open(scope.row)"/><el-button :icon="Delete" link type="danger" @click="remove(scope.row)"/></template></el-table-column>
  </el-table><EmptyState v-else title="暂无面试安排" description="新增一面、二面或 HR 面，并持续记录结果。"/></AppCard>
  <InterviewDialog ref="dialog" @saved="load"/>
</div></template>
<style scoped>.page-stack{display:grid;gap:16px}.data-card{padding:18px;overflow:hidden}.empty-state{min-height:360px}</style>
