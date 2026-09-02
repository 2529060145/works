<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Plus } from '@element-plus/icons-vue'
import AppCard from '../../components/common/AppCard.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import WrittenTestDialog from '../../dialogs/WrittenTestDialog.vue'
import type { WrittenTest } from '../../types/writtenTest'
import { deleteWrittenTest, listWrittenTests } from '../../services/writtenTestService'
import { isTauriRuntime } from '../../services/databaseService'

const rows=ref<WrittenTest[]>([]), loading=ref(false)
const dialog=ref<InstanceType<typeof WrittenTestDialog>>()
const formLabels={ONLINE:'线上',OFFLINE:'线下',OTHER:'其他'} as const
const statusLabels={WAITING:'待进行',COMPLETED:'已完成',CANCELLED:'已取消'} as const
const resultLabels={PENDING:'待通知',PASSED:'通过',FAILED:'未通过'} as const
async function load(){if(!isTauriRuntime())return;loading.value=true;try{rows.value=await listWrittenTests()}catch(e){ElMessage.error(e instanceof Error?e.message:'读取笔试失败')}finally{loading.value=false}}
async function remove(row:WrittenTest){await ElMessageBox.confirm('确定删除这条笔试记录吗？','删除笔试',{type:'warning'});await deleteWrittenTest(row.id);ElMessage.success('笔试记录已删除');load()}
onMounted(load)
</script>
<template><div class="page-stack">
  <PageHeader title="笔试管理" subtitle="集中记录笔试时间、形式、状态和结果"><el-button :icon="Plus" type="primary" @click="dialog?.open()">新增笔试</el-button></PageHeader>
  <el-alert v-if="!isTauriRuntime()" title="当前是界面预览；数据功能仅在 Windows 客户端内启用。" type="info" show-icon :closable="false" />
  <AppCard class="data-card"><el-table v-if="rows.length" v-loading="loading" :data="rows" stripe>
    <el-table-column prop="companyName" label="企业" min-width="180"/><el-table-column prop="jobName" label="岗位" min-width="180"/><el-table-column prop="scheduledAt" label="笔试时间" width="170"/>
    <el-table-column label="形式" width="90"><template #default="scope">{{ formLabels[scope.row.form as keyof typeof formLabels] }}</template></el-table-column>
    <el-table-column prop="location" label="地点 / 链接" min-width="150" show-overflow-tooltip/>
    <el-table-column label="状态" width="100"><template #default="scope"><StatusTag :type="scope.row.status==='WAITING'?'warning':scope.row.status==='COMPLETED'?'success':'info'">{{ statusLabels[scope.row.status as keyof typeof statusLabels] }}</StatusTag></template></el-table-column>
    <el-table-column label="结果" width="90"><template #default="scope">{{ resultLabels[scope.row.result as keyof typeof resultLabels] }}</template></el-table-column>
    <el-table-column label="操作" width="110"><template #default="scope"><el-button :icon="Edit" link @click="dialog?.open(scope.row)"/><el-button :icon="Delete" link type="danger" @click="remove(scope.row)"/></template></el-table-column>
  </el-table><EmptyState v-else title="暂无笔试安排" description="进入笔试阶段后，在这里记录时间和结果。"/></AppCard>
  <WrittenTestDialog ref="dialog" @saved="load"/>
</div></template>
<style scoped>.page-stack{display:grid;gap:16px}.data-card{padding:18px;overflow:hidden}.empty-state{min-height:360px}</style>
