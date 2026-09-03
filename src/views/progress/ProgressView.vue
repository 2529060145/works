<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDownBold, ArrowUpBold, CircleCheck, CircleClose, Document, Medal, Promotion, Search, User, View } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import type { Application, ApplicationStage } from '../../types/application'
import { applicationStageLabels, stageTone } from '../../constants/status'
import { listApplications } from '../../services/applicationService'
import { listJobLibraryOptions } from '../../services/jobService'
import { isTauriRuntime } from '../../services/databaseService'

const router = useRouter()
const rows = ref<Application[]>([])
const loading = ref(false)
const keyword = ref('')
const location = ref('')
const recruitmentBatch = ref('')
const stage = ref<ApplicationStage | ''>('')
const expandedStage = ref<ApplicationStage | null>(null)
const options = ref({ locations: [] as string[], batches: [] as string[] })
const activeStages = ['TO_APPLY', 'APPLIED', 'WRITTEN_TEST', 'INTERVIEW', 'OFFER', 'REJECTED'] as const
const stageIcons = { TO_APPLY: Promotion, APPLIED: CircleCheck, WRITTEN_TEST: Document, INTERVIEW: User, OFFER: Medal, REJECTED: CircleClose } as const
const columns = computed(() => activeStages.filter(item => !stage.value || item === stage.value).map(item => ({
  stage: item,
  label: applicationStageLabels[item],
  icon: stageIcons[item],
  items: rows.value.filter(row => row.stage === item),
})))

async function load() {
  if (!isTauriRuntime()) return
  loading.value = true
  try {
    rows.value = await listApplications({ keyword: keyword.value, location: location.value, recruitmentBatch: recruitmentBatch.value, stage: stage.value })
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '读取投递进度失败')
  } finally {
    loading.value = false
  }
}

async function reset() {
  keyword.value = ''
  location.value = ''
  recruitmentBatch.value = ''
  stage.value = ''
  await load()
}

function toggleStage(stageValue: ApplicationStage) {
  expandedStage.value = expandedStage.value === stageValue ? null : stageValue
}

watch(stage, () => { expandedStage.value = null })

onMounted(async () => {
  if (isTauriRuntime()) {
    const result = await listJobLibraryOptions()
    options.value = { locations: result.locations, batches: result.batches }
  }
  await load()
})
</script>

<template>
  <div class="page-stack">
    <PageHeader title="投递进度" subtitle="查看各阶段岗位；状态调整请前往岗位库或岗位详情" />
    <el-alert v-if="!isTauriRuntime()" title="当前是界面预览；数据功能仅在 Windows 客户端内启用。" type="info" show-icon :closable="false" />
    <div class="filter-bar">
      <el-input v-model="keyword" :prefix-icon="Search" clearable placeholder="搜索企业或岗位" @keyup.enter="load" @clear="load" />
      <el-select v-model="location" clearable placeholder="全部地区" @change="load"><el-option v-for="item in options.locations" :key="item" :label="item" :value="item" /></el-select>
      <el-select v-model="recruitmentBatch" clearable placeholder="全部批次" @change="load"><el-option v-for="item in options.batches" :key="item" :label="item" :value="item" /></el-select>
      <el-select v-model="stage" clearable placeholder="全部阶段" @change="load"><el-option v-for="item in activeStages" :key="item" :label="applicationStageLabels[item]" :value="item" /></el-select>
      <el-button type="primary" @click="load">查询</el-button>
      <el-button @click="reset">重置</el-button>
    </div>
    <div v-loading="loading" class="kanban">
      <section v-for="column in columns" :key="column.stage" class="kanban-column" :class="`stage-${column.stage.toLowerCase()}`">
        <header>
          <span><el-icon><component :is="column.icon" /></el-icon>{{ column.label }}</span>
          <div class="stage-header-actions">
            <b>{{ column.items.length }}</b>
            <button type="button" class="expand-button" :title="expandedStage === column.stage ? `收起${column.label}` : `展开${column.label}`" :aria-label="expandedStage === column.stage ? `收起${column.label}` : `展开${column.label}`" :aria-expanded="expandedStage === column.stage ? 'true' : 'false'" @click="toggleStage(column.stage)">
              <el-icon><component :is="expandedStage === column.stage ? ArrowUpBold : ArrowDownBold" /></el-icon>
            </button>
          </div>
        </header>
        <div v-show="expandedStage === column.stage" class="column-body">
          <article v-for="item in column.items" :key="item.id" class="job-card" @click="router.push(`/jobs/${item.jobId}`)">
            <div class="card-company">{{ item.companyName }}</div>
            <strong>{{ item.jobName }}</strong>
            <div class="card-meta"><span>{{ item.location || '地点未填写' }}</span><span>{{ item.recruitmentBatch || '批次未填写' }}</span></div>
            <div class="card-status"><StatusTag :type="stageTone(item.stage)">{{ applicationStageLabels[item.stage] }}</StatusTag><time>{{ item.applicationDate || '尚未投递' }}</time></div>
            <el-button :icon="View" link type="primary" @click.stop="router.push(`/jobs/${item.jobId}`)">查看岗位</el-button>
          </article>
          <div v-if="!column.items.length" class="column-empty">暂无记录</div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-stack{display:grid;gap:16px}.filter-bar{display:grid;grid-template-columns:minmax(240px,1.5fr) repeat(3,minmax(140px,.7fr)) auto auto;gap:10px;padding:14px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card);box-shadow:var(--shadow-card)}
.kanban{display:grid;gap:10px;padding-bottom:8px}
.kanban-column{--stage:#4f6fea;overflow:hidden;border:1px solid color-mix(in srgb,var(--stage) 34%,var(--border-color));border-radius:8px;background:color-mix(in srgb,var(--stage) 6%,var(--bg-card));box-shadow:0 5px 16px rgba(23,32,51,.05)}
.stage-to_apply{--stage:#4f6fea}.stage-applied{--stage:#43bfae}.stage-written_test{--stage:#8b7cf6}.stage-interview{--stage:#f5b84b}.stage-offer{--stage:#36b77a}.stage-rejected{--stage:#f26b67}
.kanban-column>header{display:flex;min-height:52px;align-items:center;justify-content:space-between;padding:10px 12px 10px 16px;color:#fff;background:var(--stage);font-weight:700}.kanban-column>header>span{display:flex;align-items:center;gap:8px}.kanban-column>header .el-icon{font-size:18px}.stage-header-actions{display:flex;align-items:center;gap:8px}.kanban-column header b{display:grid;min-width:28px;height:28px;place-items:center;border:1px solid rgba(255,255,255,.38);border-radius:6px;color:#fff;background:rgba(23,32,51,.15);font-size:12px}.expand-button{display:grid;width:32px;height:32px;padding:0;place-items:center;border:1px solid rgba(255,255,255,.46);border-radius:6px;color:#fff;background:rgba(23,32,51,.14);cursor:pointer;transition:background 150ms ease}.expand-button:hover{background:rgba(23,32,51,.28)}.column-body{display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));align-content:start;gap:10px;padding:12px}.job-card{display:grid;gap:9px;padding:14px;border:1px solid color-mix(in srgb,var(--stage) 23%,var(--border-color));border-left:4px solid var(--stage);border-radius:7px;background:var(--bg-card);box-shadow:0 4px 14px rgba(23,32,51,.06);cursor:pointer;transition:transform 150ms ease,box-shadow 150ms ease}.job-card:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(23,32,51,.1)}.card-company{color:var(--text-secondary);font-size:12px}.job-card strong{font-size:14px;line-height:1.45}.card-meta,.card-status{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--text-secondary);font-size:12px}.card-meta span{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.job-card .el-button{justify-self:end}.column-empty{display:grid;grid-column:1/-1;min-height:92px;place-items:center;border:1px dashed color-mix(in srgb,var(--stage) 42%,var(--border-color));border-radius:7px;color:color-mix(in srgb,var(--stage) 72%,var(--text-primary));background:color-mix(in srgb,var(--stage) 7%,var(--bg-card));font-size:12px}
@media(max-width:1180px){.filter-bar{grid-template-columns:repeat(3,minmax(0,1fr))}.column-body{grid-template-columns:repeat(2,minmax(220px,1fr))}}@media(max-width:820px){.filter-bar,.column-body{grid-template-columns:1fr}}
</style>
