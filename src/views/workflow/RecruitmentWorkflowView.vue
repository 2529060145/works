<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDownBold, ArrowUpBold, CircleCheck, Edit, Link, MoreFilled, Plus, Refresh, RefreshLeft, View } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import WrittenTestDialog from '../../dialogs/WrittenTestDialog.vue'
import InterviewDialog from '../../dialogs/InterviewDialog.vue'
import type { InterviewRound } from '../../types/interview'
import type { WorkflowNodeResult } from '../../types/writtenTest'
import type { WorkflowNode, WorkflowJob } from '../../services/recruitmentWorkflowService'
import {
  finishAsOffer, finishAsRejected, finishAsWithdrawn, interviewRoundLabels, listWorkflowJobs,
  restoreProcessToApplied, undoWorkflowFailure, updateWorkflowNode, workflowResultLabels, workflowStatusLabels,
} from '../../services/recruitmentWorkflowService'
import { isTauriRuntime } from '../../services/databaseService'
import { displayDateTime } from '../../utils/dateTime'
import { isWebLink, openWebLink } from '../../utils/link'

interface WorkflowCompany { companyId: number; companyName: string; locations: string; jobs: WorkflowJob[] }

const router = useRouter()
const rows = ref<WorkflowJob[]>([]), loading = ref(false), keyword = ref('')
const scope = ref<'ACTIVE' | 'HISTORY' | 'ALL'>('ACTIVE')
const expandedCompanies = ref<number[]>([]), expandedJobs = ref<number[]>([]), expansionInitialized = ref(false)
const writtenDialog = ref<InstanceType<typeof WrittenTestDialog>>(), interviewDialog = ref<InstanceType<typeof InterviewDialog>>()

const scopedRows = computed(() => rows.value.filter(row => {
  const text = `${row.companyName} ${row.jobName} ${row.location ?? ''}`.toLowerCase()
  const matches = !keyword.value.trim() || text.includes(keyword.value.trim().toLowerCase())
  const inScope = scope.value === 'ALL' || (scope.value === 'ACTIVE' ? row.stage === 'PROCESS' : row.stage !== 'PROCESS')
  return matches && inScope
}))
const groups = computed<WorkflowCompany[]>(() => {
  const grouped = new Map<number, WorkflowCompany>()
  for (const row of scopedRows.value) {
    let group = grouped.get(row.companyId)
    if (!group) { group = { companyId: row.companyId, companyName: row.companyName, locations: '', jobs: [] }; grouped.set(row.companyId, group) }
    group.jobs.push(row)
  }
  for (const group of grouped.values()) group.locations = [...new Set(group.jobs.map(row => row.location).filter(Boolean))].join(' / ') || '地区未填写'
  return [...grouped.values()]
})

async function load() {
  if (!isTauriRuntime()) return
  loading.value = true
  try {
    rows.value = await listWorkflowJobs()
    if (!expansionInitialized.value) { expandedCompanies.value = [...new Set(rows.value.map(row => row.companyId))]; expansionInitialized.value = true }
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '读取招聘流程失败') }
  finally { loading.value = false }
}
function companyMark(name: string) { return name.replace(/[（）()\s]/g, '').slice(0, 2) || '企业' }
function toggleCompany(companyId: number) { expandedCompanies.value = expandedCompanies.value.includes(companyId) ? expandedCompanies.value.filter(id => id !== companyId) : [...expandedCompanies.value, companyId] }
function toggleJob(jobId: number) { expandedJobs.value = expandedJobs.value.includes(jobId) ? expandedJobs.value.filter(id => id !== jobId) : [...expandedJobs.value, jobId] }
function toneForNode(node?: WorkflowNode): 'info' | 'danger' | 'success' | 'warning' | 'primary' {
  if (!node) return 'info'; if (node.result === 'FAILED') return 'danger'; if (node.result === 'PASSED') return 'success'; if (node.status === 'SCHEDULED') return 'warning'; return 'primary'
}

async function chooseNext(command: string, row: WorkflowJob) {
  if (command === 'OFFER') {
    try { await ElMessageBox.confirm(`确认将“${row.companyName} · ${row.jobName}”结束为 Offer？`, '确认 Offer', { type: 'success', confirmButtonText: '确认 Offer', cancelButtonText: '取消' }) } catch { return }
    await finishAsOffer(row.jobId); ElMessage.success('招聘流程已完成，岗位已更新为 Offer'); await load(); return
  }
  if (command === 'REJECTED') {
    try { const answer = await ElMessageBox.prompt('请填写淘汰原因', '标记淘汰', { inputPlaceholder: '例如：二面后未通过', confirmButtonText: '确认淘汰', cancelButtonText: '取消', inputValidator: (value: string) => value.trim() ? true : '请填写淘汰原因' }); await finishAsRejected(row.jobId, answer.value.trim()) } catch { return }
    ElMessage.success('岗位已移入历史结果并计入淘汰'); await load(); return
  }
  if (command === 'WITHDRAWN') {
    try { await ElMessageBox.confirm(`确认主动放弃“${row.companyName} · ${row.jobName}”的招聘流程？`, '主动放弃', { type: 'warning', confirmButtonText: '确认放弃', cancelButtonText: '取消' }) } catch { return }
    await finishAsWithdrawn(row.jobId); ElMessage.success('岗位已标记为主动放弃'); await load(); return
  }
  if (command === 'WRITTEN_TEST') { writtenDialog.value?.open(undefined, row.jobId); return }
  const round = command as InterviewRound
  if (!row.history.length && round !== 'FIRST') {
    try { await ElMessageBox.confirm(`当前岗位尚未记录前面的面试轮次。确认直接创建“${interviewRoundLabels[round]}”吗？`, '跳过前置轮次', { type: 'warning', confirmButtonText: '仍然创建', cancelButtonText: '取消' }) } catch { return }
  }
  interviewDialog.value?.open(undefined, row.jobId, round)
}
async function complete(node: WorkflowNode) { try { await updateWorkflowNode(node, 'COMPLETED', 'PENDING'); ElMessage.success('流程已标记完成，请填写结果'); await load() } catch (error) { ElMessage.error(error instanceof Error ? error.message : '更新失败') } }
async function changeResult(node: WorkflowNode, result: WorkflowNodeResult) {
  try { await updateWorkflowNode(node, 'COMPLETED', result); ElMessage.success(result === 'FAILED' ? '未通过，岗位已移入历史结果并计入淘汰' : '流程结果已更新'); await load() }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '更新结果失败') }
}
async function undoFailure(row: WorkflowJob) {
  if (!row.currentNode) return
  try { await ElMessageBox.confirm(`撤回“${row.currentNode.label}未通过”吗？撤回后该节点恢复为“已完成、等待结果”，岗位重新回到进行中。`, '撤回未通过结果', { type: 'warning', confirmButtonText: '确认撤回', cancelButtonText: '取消' }) } catch { return }
  await undoWorkflowFailure(row.currentNode); ElMessage.success('未通过结果已撤回，请重新填写正确结果'); scope.value = 'ACTIVE'; await load()
}
async function restoreApplied(row: WorkflowJob) {
  try { await ElMessageBox.confirm('确认恢复为“已投递”吗？当前未完成、等待结果或误判为未通过的节点会改为“已取消”，已经完成并通过的历史不会删除。', '恢复为已投递', { type: 'warning', confirmButtonText: '确认恢复', cancelButtonText: '取消' }) } catch { return }
  await restoreProcessToApplied(row.jobId); ElMessage.success('已恢复为已投递，相关流程记录已同步处理'); await load()
}
function edit(node: WorkflowNode) { if (node.nodeType === 'WRITTEN_TEST') writtenDialog.value?.open({ ...node, companyName: '', jobName: '', testType: '' } as any); else interviewDialog.value?.open({ ...node, companyName: '', jobName: '', interviewType: '' } as any) }
onMounted(load)
</script>

<template>
  <div class="page-stack">
    <PageHeader title="招聘流程" subtitle="按企业归类，分别管理每个岗位的笔试、面试及招聘进展"><el-button :icon="Refresh" title="刷新招聘流程" @click="load">刷新</el-button></PageHeader>
    <el-alert v-if="!isTauriRuntime()" title="当前是界面预览；流程数据仅在 Windows 客户端内启用。" type="info" show-icon :closable="false" />
    <div class="toolbar"><el-input v-model="keyword" clearable placeholder="搜索企业、岗位或地区" /><el-segmented v-model="scope" :options="[{label:'进行中',value:'ACTIVE'},{label:'历史结果',value:'HISTORY'},{label:'全部',value:'ALL'}]" /></div>
    <section v-loading="loading" class="company-list">
      <article v-for="group in groups" :key="group.companyId" class="company-group">
        <button class="company-header" type="button" :aria-expanded="expandedCompanies.includes(group.companyId)" @click="toggleCompany(group.companyId)">
          <span class="company-logo">{{ companyMark(group.companyName) }}</span><span class="company-copy"><strong>{{ group.companyName }}</strong><small>{{ group.locations }}</small></span><span class="job-count">共 {{ group.jobs.length }} 个岗位</span><el-icon><ArrowUpBold v-if="expandedCompanies.includes(group.companyId)" /><ArrowDownBold v-else /></el-icon>
        </button>
        <div v-show="expandedCompanies.includes(group.companyId)" class="company-jobs">
          <section v-for="row in group.jobs" :key="row.jobId" class="job-process" :class="`stage-${row.stage.toLowerCase()}`">
            <div class="job-title"><strong>{{ row.jobName }}</strong><span>{{ row.location || '地点未填写' }}</span></div>
            <div class="process-grid">
              <div class="current"><small>当前流程</small><strong>{{ row.currentNode?.label || '尚未安排' }}</strong><span>{{ row.currentNode ? displayDateTime(row.currentNode.scheduledAt,row.currentNode.timeTbd) : '待安排' }}</span></div>
              <div class="node-state"><small>流程状态</small><StatusTag :type="toneForNode(row.currentNode)">{{ row.currentNode ? workflowStatusLabels[row.currentNode.status] : '待安排' }}</StatusTag></div>
              <div class="node-state"><small>当前结果</small><StatusTag :type="row.currentNode?.result==='FAILED'?'danger':row.currentNode?.result==='PASSED'?'success':'info'">{{ row.currentNode ? workflowResultLabels[row.currentNode.result] : '—' }}</StatusTag></div>
              <div class="summary"><small>流程摘要</small><span>已投递<template v-for="node in row.history.filter(item=>item.status!=='CANCELLED')" :key="node.key"> → {{ node.label }}</template></span></div>
              <div class="actions">
                <el-button :icon="View" @click="router.push(`/jobs/${row.jobId}`)">查看岗位</el-button><el-button v-if="row.currentNode?.status==='SCHEDULED'" :icon="CircleCheck" type="primary" plain @click="complete(row.currentNode)">完成</el-button>
                <el-select v-if="row.currentNode?.status==='COMPLETED'&&row.currentNode.result==='PENDING'" placeholder="填写结果" @change="changeResult(row.currentNode!,$event as WorkflowNodeResult)"><el-option label="通过" value="PASSED" /><el-option label="未通过" value="FAILED" /></el-select>
                <el-button v-if="row.stage==='REJECTED'&&row.currentNode?.result==='FAILED'" :icon="RefreshLeft" type="warning" plain @click="undoFailure(row)">撤回未通过</el-button>
                <el-tooltip v-if="row.stage==='PROCESS'" :disabled="row.canAddNext" :content="row.nextBlockedReason"><span><el-dropdown :disabled="!row.canAddNext" trigger="click" @command="chooseNext($event,row)"><el-button :icon="Plus" type="primary" :disabled="!row.canAddNext">{{ row.history.filter(item=>item.status!=='CANCELLED').length?'添加下一步':'安排第一个流程' }}</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="WRITTEN_TEST">笔试</el-dropdown-item><el-dropdown-item command="FIRST">一面</el-dropdown-item><el-dropdown-item command="SECOND">二面</el-dropdown-item><el-dropdown-item command="THIRD">三面</el-dropdown-item><el-dropdown-item command="HR">HR 面</el-dropdown-item><el-dropdown-item command="FINAL">终面</el-dropdown-item><el-dropdown-item command="OTHER">其他面试</el-dropdown-item><template v-if="row.history.some(item=>item.status!=='CANCELLED')"><el-dropdown-item command="OFFER" divided>Offer</el-dropdown-item><el-dropdown-item command="WITHDRAWN">主动放弃</el-dropdown-item><el-dropdown-item command="REJECTED">标记淘汰</el-dropdown-item></template></el-dropdown-menu></template></el-dropdown></span></el-tooltip>
                <el-dropdown trigger="click" @command="$event==='restore'&&restoreApplied(row)"><el-button :icon="MoreFilled" title="更多操作" /><template #dropdown><el-dropdown-menu><el-dropdown-item command="restore" :icon="RefreshLeft">恢复为已投递</el-dropdown-item></el-dropdown-menu></template></el-dropdown><el-button :icon="expandedJobs.includes(row.jobId)?ArrowUpBold:ArrowDownBold" text :title="expandedJobs.includes(row.jobId)?'收起流程':'查看流程'" @click="toggleJob(row.jobId)" />
              </div>
            </div>
            <div v-show="expandedJobs.includes(row.jobId)" class="history"><div class="history-line submitted"><i /><span><strong>已投递</strong><small>{{ row.submittedAt || row.applicationDate || '历史投递时间未记录' }}</small></span></div><div v-for="node in row.history" :key="node.key" class="history-line" :class="{cancelled:node.status==='CANCELLED'}"><i /><span><strong>{{ node.label }}</strong><small>{{ displayDateTime(node.scheduledAt,node.timeTbd) }} · {{ workflowStatusLabels[node.status] }} · {{ workflowResultLabels[node.result] }}</small></span><el-button v-if="node.meetingUrl&&isWebLink(node.meetingUrl)" :icon="Link" link type="primary" title="打开流程链接" @click="openWebLink(node.meetingUrl)" /><el-button :icon="Edit" link title="编辑流程" @click="edit(node)" /></div><div v-if="!row.history.length" class="missing-history">尚未安排具体流程。旧阶段数据没有详细记录时，可从这里补录真实节点。</div></div>
          </section>
        </div>
      </article>
      <EmptyState v-if="!groups.length" title="暂无招聘流程" description="进行中的岗位与 Offer、淘汰等历史结果会按企业显示在这里。" />
    </section>
    <WrittenTestDialog ref="writtenDialog" @saved="load" /><InterviewDialog ref="interviewDialog" @saved="load" />
  </div>
</template>

<style scoped lang="scss">
.page-stack{display:grid;gap:16px}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card)}.toolbar .el-input{max-width:380px}.company-list{display:grid;gap:12px;min-height:360px}.company-group{overflow:hidden;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card);box-shadow:var(--shadow-card)}.company-header{display:grid;width:100%;grid-template-columns:48px minmax(0,1fr) auto 24px;align-items:center;gap:14px;border:0;padding:16px 20px;color:var(--text-primary);background:color-mix(in srgb,var(--primary) 3%,var(--bg-card));cursor:pointer;text-align:left}.company-header:hover{background:color-mix(in srgb,var(--primary) 6%,var(--bg-card))}.company-logo{display:grid;width:46px;height:46px;place-items:center;border:1px solid color-mix(in srgb,var(--primary) 20%,var(--border-color));border-radius:8px;color:var(--primary);background:var(--bg-card);font-size:13px;font-weight:800}.company-copy{display:grid;min-width:0;gap:5px}.company-copy strong{overflow:hidden;font-size:16px;text-overflow:ellipsis;white-space:nowrap}.company-copy small,.job-count{color:var(--text-secondary)}.job-count{font-size:13px;font-weight:600}.company-jobs{border-top:1px solid var(--border-color)}.job-process+.job-process{border-top:1px solid var(--border-color)}.job-process{border-left:4px solid var(--purple);padding:15px 18px 15px 20px}.job-process.stage-offer{border-left-color:var(--success)}.job-process.stage-rejected{border-left-color:var(--danger)}.job-process.stage-withdrawn,.job-process.stage-unsuitable{border-left-color:var(--text-tertiary)}.job-title{display:flex;align-items:center;gap:9px;margin-bottom:13px}.job-title strong{font-size:15px}.job-title span{color:var(--text-secondary);font-size:12px}.process-grid{display:grid;grid-template-columns:145px 105px 105px minmax(170px,1fr) auto;align-items:center;gap:14px}.current,.node-state,.summary{display:grid;min-width:0;gap:5px}.current small,.node-state small,.summary small{color:var(--text-tertiary);font-size:11px}.current span,.summary span{overflow:hidden;color:var(--text-secondary);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.actions{display:flex;align-items:center;justify-content:flex-end;gap:6px}.actions .el-button+.el-button{margin-left:0}.actions .el-select{width:104px}.history{display:grid;margin:14px -18px -15px -20px;border-top:1px solid var(--border-color);padding:10px 20px 15px 58px;background:color-mix(in srgb,var(--purple) 3%,var(--bg-card))}.history-line{position:relative;display:flex;min-height:50px;align-items:center;gap:10px;border-left:2px solid var(--border-color);padding:5px 8px 5px 22px}.history-line i{position:absolute;left:-6px;width:10px;height:10px;border:2px solid var(--bg-card);border-radius:50%;background:var(--purple)}.history-line span{display:grid;flex:1;gap:3px}.history-line small{color:var(--text-secondary)}.submitted i{background:var(--teal)}.history-line.cancelled{opacity:.58}.history-line.cancelled i{background:var(--text-tertiary)}.missing-history{border:1px dashed var(--border-color);border-radius:7px;padding:16px;color:var(--text-secondary)}
@media(max-width:1250px){.process-grid{grid-template-columns:130px 95px 95px minmax(150px,1fr)}.actions{grid-column:1/-1;justify-content:flex-start}}@media(max-width:760px){.toolbar{align-items:stretch;flex-direction:column}.company-header{grid-template-columns:42px minmax(0,1fr) 20px;padding:14px}.company-logo{width:40px;height:40px}.job-count{display:none}.job-process{padding:14px}.process-grid{grid-template-columns:1fr 1fr}.summary,.actions{grid-column:1/-1}.history{margin:12px -14px -14px;padding-left:34px}}
</style>
