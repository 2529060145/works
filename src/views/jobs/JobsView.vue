<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDownBold, ArrowUpBold, Delete, Edit, Filter, Link, MoreFilled, Plus, Refresh, Search, View } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../../components/common/EmptyState.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import JobDialog from '../../dialogs/JobDialog.vue'
import type { Job } from '../../types/job'
import type { ApplicationStage } from '../../types/application'
import { applicationStageLabels, applicationStageOptions, stageTone } from '../../constants/status'
import { deleteJob, listJobLibrary, listJobLibraryOptions } from '../../services/jobService'
import { isTauriRuntime } from '../../services/databaseService'
import { openWebLink } from '../../utils/link'

interface CompanyGroup {
  companyId: number
  companyName: string
  companyType?: string
  headquarters?: string
  jobs: Job[]
  counts: Record<ApplicationStage, number>
}

const visibleStages: ApplicationStage[] = ['TO_APPLY', 'APPLIED', 'WRITTEN_TEST', 'INTERVIEW', 'OFFER']
const router = useRouter()
const route = useRoute()
const rows = ref<Job[]>([])
const loading = ref(false)
const advancedVisible = ref(false)
const expandedIds = ref<number[]>([])
const expansionInitialized = ref(false)
const dialog = ref<InstanceType<typeof JobDialog>>()
const options = reactive({ locations: [] as string[], companyTypes: [] as string[], batches: [] as string[] })
const query = reactive({
  keyword: '', stage: '' as ApplicationStage | '', location: '', companyType: '', recruitmentBatch: '',
  sort: 'company' as 'updated' | 'deadline' | 'company', page: 1, pageSize: 20,
})

const groups = computed<CompanyGroup[]>(() => {
  const grouped = new Map<number, CompanyGroup>()
  for (const job of rows.value) {
    let group = grouped.get(job.companyId)
    if (!group) {
      group = {
        companyId: job.companyId, companyName: job.companyName, companyType: job.companyType,
        headquarters: job.headquarters, jobs: [],
        counts: Object.fromEntries(applicationStageOptions.map(item => [item.value, 0])) as Record<ApplicationStage, number>,
      }
      grouped.set(job.companyId, group)
    }
    group.jobs.push(job)
    group.counts[job.stage ?? 'TO_APPLY'] += 1
  }
  return [...grouped.values()]
})

const pagedGroups = computed(() => groups.value.slice((query.page - 1) * query.pageSize, query.page * query.pageSize))
const expanded = computed(() => new Set(expandedIds.value))

async function load() {
  if (!isTauriRuntime()) return
  loading.value = true
  try {
    rows.value = await listJobLibrary(query)
    const maxPage = Math.max(1, Math.ceil(groups.value.length / query.pageSize))
    if (query.page > maxPage) query.page = maxPage
    if (!expansionInitialized.value && groups.value.length) {
      expandedIds.value = [groups.value[0].companyId]
      expansionInitialized.value = true
    } else {
      const validIds = new Set(groups.value.map(group => group.companyId))
      expandedIds.value = expandedIds.value.filter(id => validIds.has(id))
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '读取岗位失败')
  } finally { loading.value = false }
}

async function loadOptions() {
  if (!isTauriRuntime()) return
  try { Object.assign(options, await listJobLibraryOptions()) } catch { /* Main load reports database errors. */ }
}

function search() { query.page = 1; load() }
function toggle(companyId: number) {
  expandedIds.value = expanded.value.has(companyId)
    ? expandedIds.value.filter(id => id !== companyId)
    : [...expandedIds.value, companyId]
}
function expandAll() { expandedIds.value = groups.value.map(group => group.companyId) }
function collapseAll() { expandedIds.value = [] }
function resetFilters() {
  Object.assign(query, { keyword: '', stage: '', location: '', companyType: '', recruitmentBatch: '', sort: 'company', page: 1 })
  advancedVisible.value = false
  load()
}
function companyMark(name: string) { return name.replace(/[（）()\s]/g, '').slice(0, 2) || '企业' }
function companyRegion(group: CompanyGroup) {
  if (group.headquarters) return group.headquarters
  return [...new Set(group.jobs.map(job => job.location).filter(Boolean))].slice(0, 2).join(' · ') || '地区未填写'
}
function stageLabel(stage?: ApplicationStage) { return applicationStageLabels[stage ?? 'TO_APPLY'] }

async function remove(row: Job) {
  await ElMessageBox.confirm(`确定删除“${row.companyName} · ${row.jobName}”吗？相关投递和日程也会删除。`, '删除岗位', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  await deleteJob(row.id)
  ElMessage.success('岗位已删除')
  await load()
}

async function handleCommand(command: string, row: Job) {
  if (command === 'edit') dialog.value?.open(row)
  if (command === 'link' && row.jobUrl) await openWebLink(row.jobUrl)
  if (command === 'delete') await remove(row)
}

onMounted(() => {
  query.keyword = typeof route.query.q === 'string' ? route.query.q : ''
  loadOptions()
  load()
})
watch(() => route.query.q, value => {
  query.keyword = typeof value === 'string' ? value : ''
  search()
})
</script>

<template>
  <div class="jobs-page page-stack">
    <PageHeader title="岗位库" subtitle="按企业集中管理岗位与投递进度">
      <div class="header-actions">
        <el-button :icon="Plus" type="primary" @click="dialog?.open()">新增岗位</el-button>
        <el-button :icon="ArrowDownBold" @click="expandAll">全部展开</el-button>
        <el-button :icon="ArrowUpBold" @click="collapseAll">全部折叠</el-button>
        <el-button :icon="Refresh" title="刷新岗位库" aria-label="刷新岗位库" @click="load" />
      </div>
    </PageHeader>

    <el-alert v-if="!isTauriRuntime()" title="当前是界面预览；数据功能仅在 Windows 客户端内启用。" type="info" show-icon :closable="false" />

    <section class="filter-panel">
      <div class="filters">
        <el-input v-model="query.keyword" :prefix-icon="Search" clearable placeholder="搜索企业、岗位、地点、招聘批次..." @keyup.enter="search" @clear="search" />
        <el-select v-model="query.location" clearable placeholder="全部地区" @change="search"><el-option v-for="item in options.locations" :key="item" :label="item" :value="item" /></el-select>
        <el-select v-model="query.stage" clearable placeholder="全部状态" @change="search"><el-option v-for="item in applicationStageOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select>
        <el-select v-model="query.companyType" clearable placeholder="全部性质" @change="search"><el-option v-for="item in options.companyTypes" :key="item" :label="item" :value="item" /></el-select>
        <el-select v-model="query.recruitmentBatch" clearable placeholder="全部批次" @change="search"><el-option v-for="item in options.batches" :key="item" :label="item" :value="item" /></el-select>
        <el-button :icon="Filter" :type="advancedVisible ? 'primary' : 'default'" plain @click="advancedVisible=!advancedVisible">更多筛选</el-button>
      </div>
      <div v-if="advancedVisible" class="advanced-filters">
        <span>排序方式</span>
        <el-segmented v-model="query.sort" :options="[{ label: '企业名称', value: 'company' }, { label: '最近更新', value: 'updated' }, { label: '截止日期', value: 'deadline' }]" @change="search" />
        <el-button link type="primary" @click="resetFilters">重置全部条件</el-button>
      </div>
    </section>

    <section v-loading="loading" class="library-table">
      <div class="table-head job-grid"><span>企业信息</span><span>岗位信息</span><span>招聘批次</span><span>阶段</span><span>薪资</span><span>截止日期</span><span>操作</span></div>

      <template v-if="pagedGroups.length">
        <article v-for="group in pagedGroups" :key="group.companyId" class="company-group">
          <div class="company-row job-grid" @click="toggle(group.companyId)">
            <div class="company-info">
              <span class="company-logo">{{ companyMark(group.companyName) }}</span>
              <div class="company-copy">
                <div class="company-name-line"><strong>{{ group.companyName }}</strong><span v-if="group.companyType" class="company-type">{{ group.companyType }}</span><span class="company-region">{{ companyRegion(group) }}</span></div>
                <span class="job-count">{{ group.jobs.length }} 个岗位</span>
              </div>
            </div>
            <div class="stage-summary">
              <span v-for="stage in visibleStages" :key="stage" class="stage-count" :class="`stage-${stage.toLowerCase()}`">{{ applicationStageLabels[stage] }} <b>{{ group.counts[stage] }}</b></span>
            </div>
            <div class="company-actions" @click.stop>
              <el-button :icon="Plus" plain type="primary" @click="dialog?.open(undefined, { id: group.companyId, companyName: group.companyName })">添加岗位</el-button>
              <el-button :icon="expanded.has(group.companyId) ? ArrowUpBold : ArrowDownBold" text :title="expanded.has(group.companyId) ? '折叠' : '展开'" @click="toggle(group.companyId)" />
            </div>
          </div>

          <div v-show="expanded.has(group.companyId)" class="job-rows">
            <div v-for="job in group.jobs" :key="job.id" class="job-row job-grid">
              <div class="job-title"><span class="tree-line" />{{ job.jobName }}</div>
              <span class="muted-cell">{{ job.location || '未填写' }}</span>
              <span class="muted-cell">{{ job.recruitmentBatch || '未填写' }}</span>
              <div><StatusTag :type="stageTone(job.stage)">{{ stageLabel(job.stage) }}</StatusTag></div>
              <span>{{ job.salaryText || '未明确' }}</span>
              <span class="deadline" :class="{ empty: !job.deadline }">{{ job.deadline || '未明确' }}</span>
              <div class="row-actions">
                <el-button :icon="View" plain type="primary" @click="router.push(`/jobs/${job.id}`)">查看</el-button>
                <el-dropdown trigger="click" @command="handleCommand($event, job)">
                  <el-button :icon="MoreFilled" title="更多操作" aria-label="更多操作" />
                  <template #dropdown><el-dropdown-menu><el-dropdown-item command="edit" :icon="Edit">编辑岗位</el-dropdown-item><el-dropdown-item command="link" :icon="Link" :disabled="!job.jobUrl">打开招聘链接</el-dropdown-item><el-dropdown-item command="delete" :icon="Delete" divided>删除岗位</el-dropdown-item></el-dropdown-menu></template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </article>
      </template>
      <EmptyState v-else title="还没有岗位" description="新增第一条岗位后，可按企业集中维护岗位和投递状态。" />
    </section>

    <footer v-if="groups.length" class="table-footer">
      <span>共 {{ groups.length }} 家企业，{{ rows.length }} 个岗位</span>
      <div class="pagination-controls">
        <el-select v-model="query.pageSize" aria-label="每页数量" @change="query.page=1"><el-option :value="10" label="10 条/页" /><el-option :value="20" label="20 条/页" /><el-option :value="50" label="50 条/页" /></el-select>
        <el-pagination v-model:current-page="query.page" background layout="prev, pager, next" :page-size="query.pageSize" :total="groups.length" />
      </div>
    </footer>
    <JobDialog ref="dialog" @saved="load" />
  </div>
</template>

<style scoped lang="scss">
.page-stack{display:grid;gap:14px}.header-actions{display:flex;align-items:center;gap:8px}.header-actions .el-button+.el-button{margin-left:0}.filter-panel{border-bottom:1px solid var(--border-color);padding-bottom:14px}.filters{display:grid;grid-template-columns:minmax(250px,1.7fr) repeat(4,minmax(118px,.75fr)) auto;gap:10px}.advanced-filters{display:flex;align-items:center;gap:14px;padding:12px 2px 0;color:var(--text-secondary);font-size:13px}.library-table{min-height:360px;overflow:hidden;border:1px solid var(--border-color);border-radius:var(--radius-large);background:var(--bg-card);box-shadow:var(--shadow-card)}.job-grid{display:grid;grid-template-columns:minmax(260px,1.7fr) minmax(190px,1.25fr) 108px 88px 96px 108px 132px;align-items:center;column-gap:12px}.table-head{min-height:48px;padding:0 18px;color:var(--text-secondary);background:color-mix(in srgb,var(--primary) 4%,var(--bg-card));font-size:13px;font-weight:700}.company-group+.company-group{border-top:7px solid var(--bg-page)}.company-row{min-height:82px;padding:0 18px;border-bottom:1px solid var(--border-color);cursor:pointer;transition:background 160ms ease}.company-row:hover{background:color-mix(in srgb,var(--primary) 3%,var(--bg-card))}.company-info{display:flex;min-width:0;align-items:center;gap:14px}.company-logo{display:grid;width:48px;height:48px;flex:0 0 48px;place-items:center;overflow:hidden;border:1px solid color-mix(in srgb,var(--primary) 18%,var(--border-color));border-radius:8px;color:var(--primary);background:color-mix(in srgb,var(--primary) 7%,var(--bg-card));font-size:13px;font-weight:800}.company-copy{min-width:0}.company-name-line{display:flex;min-width:0;align-items:center;gap:9px}.company-name-line strong{overflow:hidden;color:var(--text-primary);font-size:15px;text-overflow:ellipsis;white-space:nowrap}.company-type{flex:none;border-radius:5px;padding:3px 7px;color:var(--info);background:color-mix(in srgb,var(--info) 10%,transparent);font-size:11px;font-weight:700}.company-region,.job-count,.muted-cell{color:var(--text-secondary)}.company-region{flex:none;font-size:12px}.job-count{display:block;margin-top:6px;font-size:12px}.stage-summary{display:flex;grid-column:2/7;flex-wrap:wrap;align-items:center;gap:8px}.stage-count{border-radius:999px;padding:5px 10px;font-size:12px;font-weight:600}.stage-count b{margin-left:3px}.stage-to_apply{color:#d97000;background:rgba(255,159,67,.15)}.stage-applied{color:#2367e8;background:rgba(59,130,246,.13)}.stage-written_test,.stage-interview{color:#7441df;background:rgba(139,92,246,.13)}.stage-offer{color:#087f53;background:rgba(34,181,115,.14)}.company-actions{display:flex;justify-content:flex-end;gap:4px}.company-actions .el-button+.el-button{margin-left:0}.job-row{min-height:54px;padding:0 18px;border-bottom:1px solid var(--border-color);font-size:13px}.job-row:last-child{border-bottom:0}.job-row:hover{background:color-mix(in srgb,var(--primary) 4%,var(--bg-card))}.job-title{display:flex;min-width:0;align-items:center;overflow:hidden;color:var(--text-primary);text-overflow:ellipsis;white-space:nowrap}.tree-line{width:20px;height:1px;flex:0 0 20px;margin-right:6px;background:var(--border-color)}.deadline{width:fit-content;border-radius:6px;padding:4px 7px;color:var(--text-secondary);background:var(--bg-page);font-size:12px}.deadline.empty{color:var(--text-tertiary)}.row-actions{display:flex;justify-content:flex-end;gap:8px}.row-actions .el-button+.el-button{margin-left:0}.table-footer{display:flex;align-items:center;justify-content:space-between;color:var(--text-secondary);font-size:13px}.pagination-controls{display:flex;align-items:center;gap:12px}.pagination-controls .el-select{width:112px}.empty-state{min-height:360px}
@media(max-width:1380px){.filters{grid-template-columns:minmax(220px,1.5fr) repeat(4,minmax(105px,.7fr)) auto}.job-grid{grid-template-columns:minmax(225px,1.65fr) minmax(150px,1.1fr) 92px 78px 82px 96px 116px;column-gap:8px}.company-row,.job-row,.table-head{padding-right:12px;padding-left:12px}.stage-count{padding:5px 7px}}
</style>
