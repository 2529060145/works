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
import type { ApplicationResult, ApplicationStage } from '../../types/application'
import type { ApplicationLimitType } from '../../types/company'
import { applicationResultLabels, applicationStageLabels, applicationStageOptions, jobLibraryResultOptions, resultTone, stageTone } from '../../constants/status'
import { deleteJob, listJobLibrary, listJobLibraryOptions } from '../../services/jobService'
import { isTauriRuntime } from '../../services/databaseService'
import { openWebLink } from '../../utils/link'
import { markJobApplied, restoreJobToPending, updateApplicationResult } from '../../services/applicationService'
import { enterProcess, listWorkflowJobs, restoreProcessToApplied } from '../../services/recruitmentWorkflowService'
import { displayDateTime, localDateTimeValue } from '../../utils/dateTime'

interface CompanyGroup {
  companyId: number
  companyName: string
  companyType?: string
  headquarters?: string
  applicationLimitType: ApplicationLimitType
  maxApplications?: number
  appliedCount: number
  remainingSlots?: number
  jobs: Job[]
  counts: Record<ApplicationStage, number>
}

const visibleStages: ApplicationStage[] = ['TO_APPLY', 'APPLIED', 'PROCESS', 'OFFER', 'REJECTED']
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
        applicationLimitType: job.applicationLimitType ?? 'UNKNOWN', maxApplications: job.maxApplications,
        appliedCount: job.companyAppliedCount ?? 0, remainingSlots: job.remainingSlots,
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
    const [jobs,workflows] = await Promise.all([listJobLibrary(query),listWorkflowJobs()])
    const workflowMap = new Map(workflows.map(item=>[item.jobId,item]))
    rows.value = jobs.map(job=>{const workflow=workflowMap.get(job.id),node=workflow?.currentNode;const progress=node?`${node.label}${node.result==='FAILED'?'未通过':` · ${displayDateTime(node.scheduledAt,node.timeTbd)}`}`:job.stage==='PROCESS'?'尚未安排':'—';return{...job,currentProgress:progress,currentProgressStatus:node?`${node.status}/${node.result}`:undefined}})
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
function limitLabel(group: CompanyGroup) {
  if (group.applicationLimitType === 'UNKNOWN') return '投递限制未知'
  if (group.applicationLimitType === 'UNLIMITED') return '不限投递数量'
  return `最多 ${group.maxApplications ?? 1} 个 · 已投 ${group.appliedCount} 个`
}

async function showLimitReached(job: Job, appliedJobs: { jobName: string; applicationDate: string }[]) {
  const details = appliedJobs.map(item => `${item.jobName}（${item.applicationDate}）`).join('\n') || '暂无投递明细'
  try {
    await ElMessageBox.confirm(
      `${job.companyName}最多允许投递 ${job.maxApplications ?? 1} 个岗位，当前已经投递 ${job.companyAppliedCount ?? 0} 个岗位。\n\n已投递：\n${details}`,
      '无法标记为已投递',
      { confirmButtonText: '查看已投递岗位', cancelButtonText: '关闭', type: 'warning', customClass: 'multiline-message-box' },
    )
    query.keyword = job.companyName
    query.stage = 'APPLIED'
    await search()
  } catch { /* Closed by the user. */ }
}

async function changeQuickStage(job: Job, nextStage: ApplicationStage) {
  const currentStage = job.stage ?? 'TO_APPLY'
  if (nextStage === currentStage) return
  if (currentStage === 'TO_APPLY' && nextStage === 'APPLIED') {
    let submittedAt=localDateTimeValue()
    try {
      const response=await ElMessageBox.prompt(
        `企业：${job.companyName}\n岗位：${job.jobName}\n\n请确认真实投递时间，补录历史数据时可以修改。`,
        '确认已经投递该岗位吗？',
        { confirmButtonText:'确认已投递',cancelButtonText:'取消',inputValue:submittedAt,inputPlaceholder:'YYYY-MM-DD HH:mm:ss',inputValidator:(value:string)=>/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)||'请输入 YYYY-MM-DD HH:mm:ss',type:'info',customClass:'multiline-message-box' },
      )
      submittedAt=response.value
    } catch { return }
    const result = await markJobApplied(job.id,submittedAt)
    if (!result.updated) { await showLimitReached(job, result.eligibility.appliedJobs); return }
    ElMessage.success('已记录真实投递时间')
  } else if(currentStage==='APPLIED'&&nextStage==='PROCESS'){
    try{await ElMessageBox.confirm(`企业：${job.companyName}\n岗位：${job.jobName}\n\n确认已收到后续流程通知？确认后请前往“招聘流程”安排具体笔试或面试。`,'进入面试/笔试',{type:'info',confirmButtonText:'确认进入',cancelButtonText:'取消',customClass:'multiline-message-box'})}catch{return}
    await enterProcess(job.id);ElMessage.success('已进入面试/笔试，请在招聘流程中安排具体节点')
  } else if(currentStage==='PROCESS'&&nextStage==='APPLIED'){
    try{await restoreProcessToApplied(job.id);ElMessage.success('已恢复为已投递')}catch(error){await ElMessageBox.alert(error instanceof Error?error.message:'无法恢复','无法恢复',{type:'warning'});return}
  } else if(currentStage==='APPLIED'&&nextStage==='TO_APPLY'){
    try {
      await ElMessageBox.confirm('该岗位已经记录为已投递。\n\n确认恢复为“待投递”吗？\n这将清除当前投递状态，但不会自动删除已经存在的笔试和面试记录。', '恢复为待投递', { confirmButtonText: '确认恢复', cancelButtonText: '取消', type: 'warning', customClass: 'multiline-message-box' })
    } catch { return }
    const result = await restoreJobToPending(job.id)
    if (!result.updated) {
      await ElMessageBox.alert('该岗位已经进入后续招聘流程，不能直接修改为待投递。\n请先处理对应的笔试、面试或结果记录。', '无法恢复', { type: 'warning', customClass: 'multiline-message-box' })
      return
    }
    ElMessage.success('已恢复为待投递并清除投递日期')
  } else if(nextStage==='OFFER'){
    await updateApplicationResult(job.id,'OFFER');ElMessage.success('岗位已更新为 Offer')
  } else if(nextStage==='REJECTED'){
    await updateApplicationResult(job.id,'FAILED','在岗位库标记淘汰');ElMessage.success('岗位已标记淘汰')
  } else if(nextStage==='WITHDRAWN'){
    await updateApplicationResult(job.id,'WITHDRAWN');ElMessage.success('岗位已标记主动放弃')
  } else if(nextStage==='UNSUITABLE'){
    await updateApplicationResult(job.id,'UNSUITABLE');ElMessage.success('岗位已标记不合适')
  } else {
    ElMessage.warning('当前阶段不能直接执行该变更')
  }
  await load()
}

function stageOptionsFor(job:Job){const current=job.stage??'TO_APPLY';if(current==='TO_APPLY')return applicationStageOptions.filter(i=>['TO_APPLY','APPLIED'].includes(i.value));if(current==='APPLIED')return applicationStageOptions.filter(i=>['TO_APPLY','APPLIED','PROCESS','WITHDRAWN','UNSUITABLE'].includes(i.value));if(current==='PROCESS')return applicationStageOptions.filter(i=>['APPLIED','PROCESS','OFFER','REJECTED','WITHDRAWN','UNSUITABLE'].includes(i.value));return applicationStageOptions.filter(i=>i.value===current)}

async function changeResult(job: Job, nextResult: ApplicationResult) {
  const currentResult = job.result ?? 'PENDING'
  if (nextResult === currentResult) return
  let resultReason: string | undefined
  if (nextResult === 'FAILED') {
    try {
      const response = await ElMessageBox.prompt(
        `企业：${job.companyName}\n岗位：${job.jobName}\n\n请填写该岗位未通过的具体原因。`,
        '填写未通过原因',
        {
          confirmButtonText: '保存结果', cancelButtonText: '取消', inputType: 'textarea',
          inputValue: currentResult === 'FAILED' ? job.resultReason ?? '' : '',
          inputPlaceholder: '例如：专业不匹配、笔试未通过、面试反馈不足',
          inputValidator: (value: string) => value.trim() ? true : '请填写未通过原因',
          customClass: 'multiline-message-box result-reason-message-box',
        },
      )
      resultReason = response.value.trim()
    } catch { return }
  }
  try {
    await updateApplicationResult(job.id, nextResult, resultReason)
    ElMessage.success(`投递结果已更新为“${applicationResultLabels[nextResult]}”`)
    await load()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '更新投递结果失败')
  }
}

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
      <div class="table-head job-grid"><span>企业信息</span><span>岗位信息</span><span>招聘批次</span><span>阶段</span><span>当前进展</span><span>薪资</span><span>截止日期</span><span>投递结果</span><span>操作</span></div>

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
              <span class="limit-summary" :class="{ reached: group.applicationLimitType === 'LIMITED' && group.remainingSlots === 0, available: group.applicationLimitType === 'LIMITED' && (group.remainingSlots ?? 0) > 0 }">{{ limitLabel(group) }}<template v-if="group.applicationLimitType === 'LIMITED'"> · {{ group.remainingSlots ? `剩余 ${group.remainingSlots}` : '已达上限' }}</template></span>
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
              <div>
                <el-tooltip :disabled="!job.applicationDate && !job.applicationBlocked" :content="job.applicationBlocked ? '该企业已经达到最大投递数量' : `已于 ${job.submittedAt||job.applicationDate} 投递`" placement="top">
                  <el-select :model-value="job.stage ?? 'TO_APPLY'" size="small" :class="['stage-select', `stage-select-${stageTone(job.stage)}`]" @change="changeQuickStage(job, $event as ApplicationStage)"><el-option v-for="option in stageOptionsFor(job)" :key="option.value" :label="option.label" :value="option.value"/></el-select>
                </el-tooltip>
              </div>
              <el-tooltip :disabled="!job.currentProgress||job.currentProgress==='—'" :content="job.currentProgress" placement="top"><span class="progress-cell" :class="{active:job.stage==='PROCESS'}">{{ job.currentProgress||'—' }}</span></el-tooltip>
              <span>{{ job.salaryText || '未明确' }}</span>
              <el-tooltip :disabled="!job.deadline" :content="job.deadline" placement="top"><span class="deadline" :class="{ empty: !job.deadline }">{{ job.deadline || '未明确' }}</span></el-tooltip>
              <div class="result-cell">
                <StatusTag v-if="(job.stage ?? 'TO_APPLY') === 'TO_APPLY'" type="info">尚未投递</StatusTag>
                <StatusTag v-else-if="job.stage === 'OFFER'" type="success">Offer</StatusTag>
                <el-tooltip v-else :disabled="!job.resultReason" :content="job.resultReason" placement="top">
                  <el-select :model-value="job.result ?? 'PENDING'" size="small" :class="['result-select', `result-${resultTone(job.result)}`]" @change="changeResult(job, $event as ApplicationResult)">
                    <el-option v-for="option in jobLibraryResultOptions" :key="option.value" :class="`result-option-${resultTone(option.value)}`" :label="option.label" :value="option.value" />
                  </el-select>
                </el-tooltip>
                <small v-if="job.result === 'FAILED' && job.resultReason" class="result-reason">{{ job.resultReason }}</small>
              </div>
              <div class="row-actions">
                <el-button class="view-button" :icon="View" plain type="primary" title="查看岗位" aria-label="查看岗位" @click="router.push(`/jobs/${job.id}`)"><span class="view-label">查看</span></el-button>
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
.jobs-page{container-type:inline-size}.page-stack{display:grid;gap:14px}.header-actions{display:flex;align-items:center;gap:8px}.header-actions .el-button+.el-button{margin-left:0}.filter-panel{border-bottom:1px solid var(--border-color);padding-bottom:14px}.filters{display:grid;grid-template-columns:minmax(250px,1.7fr) repeat(4,minmax(118px,.75fr)) auto;gap:10px}.advanced-filters{display:flex;align-items:center;gap:14px;padding:12px 2px 0;color:var(--text-secondary);font-size:13px}.library-table{min-height:360px;overflow:hidden;border:1px solid var(--border-color);border-radius:var(--radius-large);background:var(--bg-card);box-shadow:var(--shadow-card)}.job-grid{display:grid;grid-template-columns:minmax(250px,1.65fr) minmax(165px,1.1fr) 100px 105px 88px 100px 132px 126px;align-items:center;column-gap:10px}.table-head{min-height:48px;padding:0 18px;color:var(--text-secondary);background:color-mix(in srgb,var(--primary) 4%,var(--bg-card));font-size:13px;font-weight:700}.company-group+.company-group{border-top:7px solid var(--bg-page)}.company-row{min-height:90px;padding:0 18px;border-bottom:1px solid var(--border-color);cursor:pointer;transition:background 160ms ease}.company-row:hover{background:color-mix(in srgb,var(--primary) 3%,var(--bg-card))}.company-info{display:flex;min-width:0;align-items:center;gap:14px}.company-logo{display:grid;width:48px;height:48px;flex:0 0 48px;place-items:center;overflow:hidden;border:1px solid color-mix(in srgb,var(--primary) 18%,var(--border-color));border-radius:8px;color:var(--primary);background:color-mix(in srgb,var(--primary) 7%,var(--bg-card));font-size:13px;font-weight:800}.company-copy{min-width:0}.company-name-line{display:flex;min-width:0;align-items:center;gap:9px}.company-name-line strong{overflow:hidden;color:var(--text-primary);font-size:15px;text-overflow:ellipsis;white-space:nowrap}.company-type{flex:none;border-radius:5px;padding:3px 7px;color:var(--info);background:color-mix(in srgb,var(--info) 10%,transparent);font-size:11px;font-weight:700}.company-region,.job-count,.muted-cell{color:var(--text-secondary)}.company-region{flex:none;font-size:12px}.job-count{display:block;margin-top:6px;font-size:12px}.stage-summary{display:flex;grid-column:2/8;flex-wrap:wrap;align-items:center;gap:7px}.stage-count,.limit-summary{border-radius:999px;padding:5px 9px;font-size:12px;font-weight:600}.stage-count b{margin-left:3px}.stage-to_apply{color:var(--primary);background:color-mix(in srgb,var(--primary) 13%,transparent)}.stage-applied{color:#238f82;background:color-mix(in srgb,var(--teal) 15%,transparent)}.stage-written_test{color:#6d5bd0;background:color-mix(in srgb,var(--purple) 14%,transparent)}.stage-interview{color:#a46d00;background:color-mix(in srgb,var(--warning) 18%,transparent)}.stage-offer{color:#168353;background:color-mix(in srgb,var(--success) 14%,transparent)}.limit-summary{color:var(--text-secondary);background:var(--bg-page)}.limit-summary.reached{color:#b84e4b;background:color-mix(in srgb,var(--danger) 12%,transparent)}.limit-summary.available{color:#168353;background:color-mix(in srgb,var(--success) 12%,transparent)}.company-actions{display:flex;justify-content:flex-end;gap:4px}.company-actions .el-button+.el-button{margin-left:0}.job-row{min-height:66px;padding:5px 18px;border-bottom:1px solid var(--border-color);font-size:13px}.job-row:last-child{border-bottom:0}.job-row:hover{background:color-mix(in srgb,var(--primary) 4%,var(--bg-card))}.job-title{display:flex;min-width:0;align-items:center;overflow:hidden;color:var(--text-primary);text-overflow:ellipsis;white-space:nowrap}.tree-line{width:20px;height:1px;flex:0 0 20px;margin-right:6px;background:var(--border-color)}.deadline{display:-webkit-box;width:100%;max-height:44px;overflow:hidden;border-radius:6px;padding:4px 7px;color:var(--text-secondary);background:var(--bg-page);font-size:12px;-webkit-box-orient:vertical;-webkit-line-clamp:2}.deadline.empty{color:var(--text-tertiary)}.stage-select{width:min(96px,100%);min-width:0}.stage-select.stage-select-primary :deep(.el-select__wrapper){color:var(--primary);background:color-mix(in srgb,var(--primary) 10%,var(--bg-card));box-shadow:0 0 0 1px color-mix(in srgb,var(--primary) 38%,var(--border-color)) inset}.stage-select.stage-select-teal :deep(.el-select__wrapper){color:#238f82;background:color-mix(in srgb,var(--teal) 12%,var(--bg-card));box-shadow:0 0 0 1px color-mix(in srgb,var(--teal) 40%,var(--border-color)) inset}.stage-select :deep(.el-select__selected-item){overflow:hidden;color:inherit;font-weight:600;text-overflow:ellipsis}.result-cell{display:grid;min-width:0;gap:3px}.result-select{width:min(120px,100%);min-width:0}.result-select.result-teal :deep(.el-select__wrapper){color:#238f82;background:color-mix(in srgb,var(--teal) 10%,var(--bg-card));box-shadow:0 0 0 1px color-mix(in srgb,var(--teal) 35%,var(--border-color)) inset}.result-select.result-success :deep(.el-select__wrapper){color:#168353;background:color-mix(in srgb,var(--success) 10%,var(--bg-card));box-shadow:0 0 0 1px color-mix(in srgb,var(--success) 35%,var(--border-color)) inset}.result-select.result-danger :deep(.el-select__wrapper){color:#b84e4b;background:color-mix(in srgb,var(--danger) 10%,var(--bg-card));box-shadow:0 0 0 1px color-mix(in srgb,var(--danger) 35%,var(--border-color)) inset}.result-select.result-info :deep(.el-select__wrapper){color:var(--text-secondary);background:var(--bg-page)}.result-select :deep(.el-select__selected-item){overflow:hidden;color:inherit;font-weight:600;text-overflow:ellipsis}.result-reason{overflow:hidden;color:var(--danger);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.row-actions{display:flex;min-width:0;justify-content:flex-end;gap:8px}.row-actions .el-button+.el-button{margin-left:0}.table-footer{display:flex;align-items:center;justify-content:space-between;color:var(--text-secondary);font-size:13px}.pagination-controls{display:flex;align-items:center;gap:12px}.pagination-controls .el-select{width:112px}.empty-state{min-height:360px}
@media(max-width:1380px){.filters{grid-template-columns:minmax(220px,1.5fr) repeat(4,minmax(105px,.7fr)) auto}.company-row,.job-row,.table-head{padding-right:12px;padding-left:12px}.stage-count,.limit-summary{padding:5px 7px}}
@container(max-width:1250px){.jobs-page :deep(.page-header){flex-wrap:wrap}.header-actions{width:100%;justify-content:flex-end}.filters{grid-template-columns:minmax(180px,1.4fr) repeat(2,minmax(120px,1fr))}.job-grid{grid-template-columns:minmax(160px,1.35fr) minmax(96px,.8fr) 68px 88px 64px 74px minmax(90px,100px) 76px;column-gap:5px}.company-logo{width:42px;height:42px;flex-basis:42px}.company-info{gap:9px}.company-name-line{gap:6px}.company-region{display:none}.stage-summary{gap:4px}.stage-count,.limit-summary{padding:4px 6px;font-size:11px}.company-actions .el-button:first-child{padding:8px}.job-row{font-size:12px}.row-actions{gap:4px}.row-actions .el-button{padding:8px}.view-label{display:none}}
.job-grid{grid-template-columns:minmax(220px,1.5fr) minmax(140px,1fr) 82px 100px 130px 70px 90px 118px 100px;column-gap:9px}.stage-summary{grid-column:2/9}.stage-written_test,.stage-interview{display:none}.stage-process{color:#6d5bd0;background:color-mix(in srgb,var(--purple) 14%,transparent)}.stage-rejected{color:#b84e4b;background:color-mix(in srgb,var(--danger) 12%,transparent)}.stage-select{width:min(104px,100%)}.stage-select.stage-select-purple :deep(.el-select__wrapper){color:#6d5bd0;background:color-mix(in srgb,var(--purple) 12%,var(--bg-card));box-shadow:0 0 0 1px color-mix(in srgb,var(--purple) 40%,var(--border-color)) inset}.progress-cell{display:-webkit-box;max-height:38px;overflow:hidden;color:var(--text-tertiary);font-size:11px;line-height:1.55;-webkit-box-orient:vertical;-webkit-line-clamp:2}.progress-cell.active{color:#6d5bd0;font-weight:600}
@container(max-width:1250px){.job-grid{grid-template-columns:minmax(160px,1.3fr) minmax(92px,.75fr) 64px 88px 110px 60px 72px 95px 76px;column-gap:5px}}
</style>

<style lang="scss">
.el-select-dropdown__item.stage-option-primary,.el-select-dropdown__item.result-option-primary{color:var(--primary)}
.el-select-dropdown__item.stage-option-teal,.el-select-dropdown__item.result-option-teal{color:#238f82}
.el-select-dropdown__item.result-option-success{color:#168353}
.el-select-dropdown__item.result-option-danger{color:#b84e4b}
.el-select-dropdown__item.result-option-info{color:var(--text-secondary)}
</style>
