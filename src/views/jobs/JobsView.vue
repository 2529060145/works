<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Link, Plus, Search, View } from '@element-plus/icons-vue'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useRoute, useRouter } from 'vue-router'
import AppCard from '../../components/common/AppCard.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import JobDialog from '../../dialogs/JobDialog.vue'
import type { Job } from '../../types/job'
import type { ApplicationStage } from '../../types/application'
import { applicationStageLabels, applicationStageOptions, stageTone } from '../../constants/status'
import { deleteJob, listJobs } from '../../services/jobService'
import { isTauriRuntime } from '../../services/databaseService'

const router = useRouter()
const route = useRoute()
const rows = ref<Job[]>([])
const total = ref(0)
const loading = ref(false)
const dialog = ref<InstanceType<typeof JobDialog>>()
const query = reactive<{ keyword: string; stage: ApplicationStage | ''; location: string; sort: 'updated' | 'deadline' | 'company'; page: number; pageSize: number }>({ keyword: '', stage: '', location: '', sort: 'updated', page: 1, pageSize: 20 })

async function load() {
  if (!isTauriRuntime()) return
  loading.value = true
  try { const result = await listJobs(query); rows.value = result.items; total.value = result.total }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '读取岗位失败') }
  finally { loading.value = false }
}

function search() { query.page = 1; load() }
async function remove(row: Job) {
  await ElMessageBox.confirm(`确定删除“${row.companyName} · ${row.jobName}”吗？相关投递和日程也会删除。`, '删除岗位', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  await deleteJob(row.id); ElMessage.success('岗位已删除'); await load()
}
async function visit(url?: string) { if (url) await openUrl(url) }
function stageLabel(stage?: ApplicationStage) { return applicationStageLabels[stage ?? 'TO_APPLY'] }

onMounted(() => { query.keyword = typeof route.query.q === 'string' ? route.query.q : ''; load() })
watch(() => route.query.q, value => { query.keyword = typeof value === 'string' ? value : ''; search() })
</script>

<template>
  <div class="page-stack">
    <PageHeader title="岗位库" subtitle="搜索、筛选并维护所有求职机会">
      <el-button :icon="Plus" type="primary" @click="dialog?.open()">新增岗位</el-button>
    </PageHeader>
    <el-alert v-if="!isTauriRuntime()" title="当前是界面预览；数据功能仅在 Windows 客户端内启用。" type="info" show-icon :closable="false" />
    <AppCard class="data-card">
      <div class="toolbar">
        <el-input v-model="query.keyword" :prefix-icon="Search" clearable placeholder="企业、岗位、地点或备注" @keyup.enter="search" @clear="search" />
        <el-select v-model="query.stage" clearable placeholder="全部阶段" @change="search"><el-option v-for="item in applicationStageOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select>
        <el-input v-model="query.location" clearable placeholder="工作地点" @keyup.enter="search" @clear="search" />
        <el-select v-model="query.sort" @change="search"><el-option label="最近更新" value="updated" /><el-option label="截止日期" value="deadline" /><el-option label="企业名称" value="company" /></el-select>
        <el-button @click="search">查询</el-button>
      </div>
      <el-table v-if="rows.length" v-loading="loading" :data="rows" stripe>
        <el-table-column prop="companyName" label="企业" min-width="170" show-overflow-tooltip />
        <el-table-column prop="jobName" label="岗位" min-width="190" show-overflow-tooltip />
        <el-table-column prop="location" label="地点" width="110" />
        <el-table-column label="阶段" width="100"><template #default="scope"><StatusTag :type="stageTone(scope.row.stage)">{{ stageLabel(scope.row.stage) }}</StatusTag></template></el-table-column>
        <el-table-column prop="salaryText" label="薪资" width="130" />
        <el-table-column prop="deadline" label="截止日期" width="120" />
        <el-table-column label="操作" width="190" fixed="right"><template #default="scope">
          <el-button :icon="View" link type="primary" title="查看详情" @click="router.push(`/jobs/${scope.row.id}`)" />
          <el-button :icon="Link" link :disabled="!scope.row.jobUrl" title="打开招聘链接" @click="visit(scope.row.jobUrl)" />
          <el-button :icon="Edit" link title="编辑" @click="dialog?.open(scope.row)" />
          <el-button :icon="Delete" link type="danger" title="删除" @click="remove(scope.row)" />
        </template></el-table-column>
      </el-table>
      <EmptyState v-else title="还没有岗位" description="新增第一条岗位后，可在这里维护投递状态和截止日期。" />
      <div v-if="total > query.pageSize" class="pagination"><el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" layout="total, prev, pager, next" :total="total" @current-change="load" /></div>
    </AppCard>
    <JobDialog ref="dialog" @saved="load" />
  </div>
</template>

<style scoped lang="scss">.page-stack{display:grid;gap:16px}.data-card{overflow:hidden;padding:18px}.toolbar{display:grid;grid-template-columns:minmax(240px,1.5fr) 150px 150px 130px auto;gap:10px;margin-bottom:16px}.pagination{display:flex;justify-content:flex-end;padding-top:16px}.empty-state{min-height:360px}@media(max-width:1050px){.toolbar{grid-template-columns:repeat(2,minmax(0,1fr))}}</style>
