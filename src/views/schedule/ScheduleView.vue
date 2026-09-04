<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, Calendar } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import AppCard from '../../components/common/AppCard.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import type { ScheduleItem } from '../../services/reminderService'
import { listScheduleByMonth } from '../../services/reminderService'
import { isTauriRuntime } from '../../services/databaseService'
import { calendarTime } from '../../utils/dateTime'

const router = useRouter()
const rows = ref<ScheduleItem[]>([])
const loading = ref(false)
const now = new Date()
const currentMonth = ref(new Date(now.getFullYear(), now.getMonth(), 1))
const selectedDate = ref(formatDate(now))
const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function pad(value: number) { return String(value).padStart(2, '0') }
function formatDate(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
const monthKey = computed(() => `${currentMonth.value.getFullYear()}-${pad(currentMonth.value.getMonth() + 1)}`)
const monthLabel = computed(() => `${currentMonth.value.getFullYear()} 年 ${pad(currentMonth.value.getMonth() + 1)} 月`)
const eventsByDate = computed(() => {
  const map = new Map<string, ScheduleItem[]>()
  rows.value.forEach(item => {
    const date = item.scheduledAt.slice(0, 10)
    map.set(date, [...(map.get(date) ?? []), item])
  })
  return map
})
const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const count = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: firstOffset }, (_, index) => ({ date: '', day: 0, key: `before-${index}` }))
  for (let day = 1; day <= count; day += 1) {
    const date = formatDate(new Date(year, month, day))
    cells.push({ date, day, key: date })
  }
  while (cells.length % 7) cells.push({ date: '', day: 0, key: `after-${cells.length}` })
  return cells
})
const selectedEvents = computed(() => eventsByDate.value.get(selectedDate.value) ?? [])
const arrangedDates = computed(() => eventsByDate.value.size)
const writtenTestCount = computed(() => rows.value.filter(item => item.eventType === 'WRITTEN_TEST').length)
const interviewCount = computed(() => rows.value.filter(item => item.eventType === 'INTERVIEW').length)
const selectedLabel = computed(() => {
  const [, month, day] = selectedDate.value.split('-')
  return `${Number(month)} 月 ${Number(day)} 日`
})
const eventColor = (type: ScheduleItem['eventType']) => ({
  DEADLINE: '#F5B84B', APPLICATION: '#43BFAE', WRITTEN_TEST: '#8B7CF6',
  INTERVIEW: '#4F6FEA', OFFER: '#36B77A', REJECTED: '#F26B67',
}[type])
const eventTone = (type: ScheduleItem['eventType']) => ({
  DEADLINE: 'warning', APPLICATION: 'teal', WRITTEN_TEST: 'purple',
  INTERVIEW: 'primary', OFFER: 'success', REJECTED: 'danger',
}[type] as 'warning' | 'teal' | 'purple' | 'primary' | 'success' | 'danger')

async function load() {
  selectedDate.value = monthKey.value === formatDate(now).slice(0, 7) ? formatDate(now) : `${monthKey.value}-01`
  if (!isTauriRuntime()) return
  loading.value = true
  try { rows.value = await listScheduleByMonth(monthKey.value) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '读取日程失败') }
  finally { loading.value = false }
}
async function changeMonth(offset: number) {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + offset, 1)
  await load()
}
onMounted(load)
</script>

<template>
  <div class="page-stack">
    <PageHeader title="日程安排" subtitle="按月汇总笔试和面试安排">
      <div class="month-switcher"><el-button :icon="ArrowLeft" aria-label="上一个月" title="上一个月" @click="changeMonth(-1)" /><strong>{{ monthLabel }}</strong><el-button :icon="ArrowRight" aria-label="下一个月" title="下一个月" @click="changeMonth(1)" /></div>
    </PageHeader>
    <el-alert v-if="!isTauriRuntime()" title="当前是界面预览；数据功能仅在 Windows 客户端内启用。" type="info" show-icon :closable="false" />
    <div class="summary-grid">
      <div class="summary-item blue"><span>本月安排</span><strong>{{ rows.length }}</strong><small>{{ arrangedDates }} 个日期</small></div>
      <div class="summary-item teal"><span>笔试安排</span><strong>{{ writtenTestCount }}</strong></div>
      <div class="summary-item amber"><span>面试安排</span><strong>{{ interviewCount }}</strong></div>
    </div>
    <AppCard v-loading="loading" class="calendar-card">
      <div class="weekday" v-for="weekday in weekdays" :key="weekday">{{ weekday }}</div>
      <template v-for="cell in calendarDays" :key="cell.key">
        <button v-if="cell.date" class="day-cell" :class="{today:cell.date===formatDate(now),selected:cell.date===selectedDate}" type="button" @click="selectedDate=cell.date">
          <span class="day-number">{{ cell.day }}</span>
          <span v-for="item in (eventsByDate.get(cell.date)??[]).slice(0,3)" :key="item.id" class="event-chip" :style="{ '--event-color': eventColor(item.eventType) }"><i />{{ item.companyName }}{{ item.eventLabel }}</span>
          <small v-if="(eventsByDate.get(cell.date)?.length??0)>3">+{{ (eventsByDate.get(cell.date)?.length??0)-3 }} 项</small>
        </button>
        <div v-else class="day-cell blank" />
      </template>
    </AppCard>
    <AppCard class="selected-card">
      <div class="selected-head"><div><h2>{{ selectedLabel }}</h2><p>{{ selectedDate }}</p></div><span>{{ selectedEvents.length }} 项</span></div>
      <div v-if="selectedEvents.length" class="event-list">
        <button v-for="item in selectedEvents" :key="item.id" type="button" @click="router.push(`/jobs/${item.jobId}`)">
          <time>{{ calendarTime(item.scheduledAt, item.timeTbd) }}</time>
          <span class="event-marker" :style="{background:eventColor(item.eventType)}" />
          <span><strong>{{ item.companyName }}</strong><small>{{ item.jobName }}<template v-if="item.location"> · {{ item.location }}</template></small></span>
          <StatusTag :type="eventTone(item.eventType)">{{ item.eventLabel }}</StatusTag>
        </button>
      </div>
      <div v-else class="day-empty"><el-icon><Calendar /></el-icon>当天暂无笔试或面试安排。</div>
    </AppCard>
  </div>
</template>

<style scoped lang="scss">
.page-stack{display:grid;gap:16px}.month-switcher{display:flex;align-items:center;gap:18px}.month-switcher strong{min-width:130px;color:var(--text-primary);font-size:16px;font-weight:600;text-align:center}.month-switcher .el-button{width:40px;height:40px;margin:0}
.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.summary-item{display:grid;gap:8px;padding:18px;border:1px solid var(--border-color);border-radius:8px}.summary-item span,.summary-item small{color:#52617a;font-weight:500}.summary-item strong{color:var(--text-primary);font-size:28px}.summary-item.blue{background:#f5f7ff}.summary-item.teal{background:#f2fbf9}.summary-item.amber{background:#fffaf0}
.calendar-card{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;padding:16px}.weekday{display:grid;height:36px;place-items:center;color:#52617a;background:#f8f9fc;font-weight:600}.day-cell{display:flex;min-width:0;min-height:116px;flex-direction:column;gap:5px;border:1px solid var(--border-color);border-radius:7px;padding:10px;color:#52617a;background:var(--bg-card);cursor:pointer;text-align:left}.day-cell:hover{border-color:#b9c6f8}.day-cell.today{border-color:#4f6fea;background:#f5f7ff}.day-cell.selected{box-shadow:0 0 0 2px rgba(79,111,234,.14) inset}.day-cell.blank{border-color:transparent;background:transparent;cursor:default}.day-number{font-size:16px;font-weight:600}.today .day-number{color:#4f6fea}.event-chip{display:flex;min-width:0;align-items:center;gap:5px;overflow:hidden;border-radius:4px;padding:3px 5px;color:#52617a;background:color-mix(in srgb,var(--event-color) 10%,#fff);font-size:11px;white-space:nowrap;text-overflow:ellipsis}.event-chip i{width:6px;height:6px;flex:0 0 6px;border-radius:50%;background:var(--event-color)}.day-cell>small{color:var(--primary);font-weight:600}
.selected-card{padding:20px}.selected-head{display:flex;align-items:center;justify-content:space-between}.selected-head h2{margin:0;font-size:17px}.selected-head p{margin:5px 0 0;color:var(--text-secondary)}.selected-head>span{border-radius:6px;padding:5px 9px;color:#52617a;background:#f2f4f8}.event-list{display:grid;gap:8px;margin-top:16px}.event-list button{display:grid;grid-template-columns:54px 4px minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;border:1px solid var(--border-color);border-radius:7px;padding:11px 13px;color:var(--text-primary);background:var(--bg-card);cursor:pointer;text-align:left}.event-list button:hover{border-color:#b9c6f8}.event-list time{color:#52617a;font-weight:600}.event-marker{width:4px;height:34px;border-radius:3px}.event-list button>span:nth-child(3){display:grid;gap:4px}.event-list small{color:var(--text-secondary)}.day-empty{display:flex;min-height:76px;align-items:center;gap:9px;margin-top:14px;border:1px dashed var(--border-color);border-radius:7px;padding:18px;color:var(--text-secondary);background:#fafbfe}.day-empty .el-icon{color:var(--primary);font-size:18px}
@media(max-width:1000px){.day-cell{min-height:96px}.event-chip{display:none}}@media(max-width:760px){.summary-grid{grid-template-columns:1fr}.calendar-card{gap:4px;padding:9px}.day-cell{min-height:64px;padding:7px}.month-switcher{gap:6px}.month-switcher strong{min-width:108px}}
</style>
