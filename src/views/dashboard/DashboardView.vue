<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { init, use, type ECharts } from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Briefcase, CircleCheck, CircleClose, Document, Medal, Promotion, User } from '@element-plus/icons-vue'
import AppCard from '../../components/common/AppCard.vue'
import StatCard from '../../components/dashboard/StatCard.vue'
import CompanyDialog from '../../dialogs/CompanyDialog.vue'
import JobDialog from '../../dialogs/JobDialog.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import { applicationStageColors, applicationStageLabels } from '../../constants/status'
import { getDashboardData, getJobTrend, type DashboardData, type JobTrendDays, type JobTrendPoint } from '../../services/statisticsService'
import { isTauriRuntime } from '../../services/databaseService'
import { displayDateTime } from '../../utils/dateTime'

const todayText = computed(() => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())
})

use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const router=useRouter(),loading=ref(false),companyDialog=ref<InstanceType<typeof CompanyDialog>>(),jobDialog=ref<InstanceType<typeof JobDialog>>()
const dashboardPage=ref<HTMLElement>()
const progressChart=ref<HTMLElement>(),locationChart=ref<HTMLElement>(),companyChart=ref<HTMLElement>(),trendChart=ref<HTMLElement>()
const trendRange=ref<JobTrendDays>(30),trendData=ref<JobTrendPoint[]>([])
const data=ref<DashboardData>({totalJobs:0,effectiveOpportunities:0,stages:{TO_APPLY:0,APPLIED:0,PROCESS:0,OFFER:0,REJECTED:0,WITHDRAWN:0,UNSUITABLE:0},workflow:{writtenTests:0,interviews:0,pending:0},recentJobs:[],deadlineJobs:[],upcoming:[],locations:[],companyTypes:[]})
let chartInstances:ECharts[]=[]
let resizeObserver:ResizeObserver|undefined
const stats=computed(()=>[
  { title:'收录岗位',value:data.value.totalJobs,description:'全部收录',tone:'primary' as const,icon:Briefcase },
  { title:'有效机会',value:data.value.effectiveOpportunities,description:'当前可投名额',tone:'primary' as const,icon:Promotion },
  { title:'已投递',value:data.value.stages.APPLIED+data.value.workflow.pending,description:'等待流程安排',tone:'teal' as const,icon:CircleCheck },
  { title:'笔试',value:data.value.workflow.writtenTests,description:'当前笔试流程',tone:'purple' as const,icon:Document },
  { title:'面试',value:data.value.workflow.interviews,description:'当前面试流程',tone:'warning' as const,icon:User },
  { title:'Offer',value:data.value.stages.OFFER,description:'已收获结果',tone:'success' as const,icon:Medal },
  { title:'淘汰',value:data.value.stages.REJECTED,description:'流程已结束',tone:'danger' as const,icon:CircleClose },
])

function renderCharts(){chartInstances.forEach(i=>i.dispose());chartInstances=[];if(!progressChart.value||!locationChart.value||!companyChart.value)return
  const base={animationDuration:350,textStyle:{fontFamily:'Microsoft YaHei'}}
  const progress=init(progressChart.value),location=init(locationChart.value),company=init(companyChart.value);chartInstances=[progress,location,company]
  progress.setOption({...base,color:Object.values(applicationStageColors),tooltip:{trigger:'item'},legend:{bottom:0},series:[{type:'pie',radius:['48%','72%'],center:['50%','43%'],label:{show:false},data:Object.entries(data.value.stages).filter(([,value])=>value>0).map(([name,value])=>({name:applicationStageLabels[name as keyof typeof applicationStageLabels],value,itemStyle:{color:applicationStageColors[name as keyof typeof applicationStageColors]}}))}]})
  location.setOption({...base,tooltip:{trigger:'axis'},grid:{left:20,right:18,top:10,bottom:20,containLabel:true},xAxis:{type:'value',minInterval:1,splitLine:{lineStyle:{color:'#eef1f6'}}},yAxis:{type:'category',data:data.value.locations.map(i=>i.name).reverse(),axisTick:{show:false}},series:[{type:'bar',data:data.value.locations.map(i=>i.value).reverse(),barWidth:14,itemStyle:{color:'#4f6ef7',borderRadius:[0,4,4,0]}}]})
  company.setOption({...base,color:['#4F6FEA','#43BFAE','#8B7CF6','#F5B84B','#F26B67','#6E8FEF','#7E8DAA','#62CFA2','#A77CF3'],tooltip:{trigger:'item'},legend:{type:'scroll',bottom:0,left:'center',itemWidth:10,itemHeight:10,itemGap:14,textStyle:{fontSize:13,fontWeight:400,color:'#52617A',lineHeight:20}},series:[{type:'pie',radius:['34%','54%'],center:['50%','34%'],label:{show:false},data:data.value.companyTypes}]})
  renderTrend()
}
function renderTrend(){
  const old=chartInstances.find(item=>item.getDom()===trendChart.value);if(old){old.dispose();chartInstances=chartInstances.filter(item=>item!==old)}
  if(!trendChart.value||!trendData.value.length)return
  const chart=init(trendChart.value);chartInstances.push(chart)
  const colors={added:'#4F6FEA',submitted:'#43BFAE',pending:'#F5B84B'}
  const interval=trendRange.value===7?0:trendRange.value===30?4:12
  const series=(name:string,key:keyof JobTrendPoint,color:string)=>({name,type:'line',smooth:.3,showSymbol:false,symbol:'circle',symbolSize:7,lineStyle:{width:2.4,color},itemStyle:{color},areaStyle:{color,opacity:.07},data:trendData.value.map(item=>item[key])})
  chart.setOption({animationDuration:350,color:Object.values(colors),tooltip:{trigger:'axis',backgroundColor:'rgba(255,255,255,.97)',borderColor:'#E8ECF3',textStyle:{color:'#172033'},formatter:(params:any[])=>{const index=params[0]?.dataIndex??0;const point=trendData.value[index];const current=index===trendData.value.length-1?`<br/><span style="color:#7B879D">当前有效机会：${data.value.effectiveOpportunities}</span>`:'';return `<strong>${point.date}</strong><br/>新增岗位　${point.addedJobs}<br/>新投递岗位　${point.submittedJobs}<br/>有效机会　${point.pendingJobs}${current}`}},legend:{top:4,left:8,itemWidth:16,itemHeight:8,itemGap:22,textStyle:{color:'#52617A',fontSize:13}},grid:{left:32,right:22,top:58,bottom:26,containLabel:true},xAxis:{type:'category',boundaryGap:false,data:trendData.value.map(item=>item.date),axisTick:{show:false},axisLine:{lineStyle:{color:'#DCE2ED'}},axisLabel:{interval,formatter:(value:string)=>value.slice(5),color:'#7B879D'}},yAxis:{type:'value',min:0,minInterval:1,axisLabel:{color:'#7B879D'},axisLine:{show:false},axisTick:{show:false},splitLine:{lineStyle:{color:'#EEF1F6'}}},series:[series('新添加岗位','addedJobs',colors.added),series('新投递岗位','submittedJobs',colors.submitted),series('有效机会','pendingJobs',colors.pending)]})
}
async function loadTrend(){if(!isTauriRuntime())return;try{trendData.value=await getJobTrend(trendRange.value);await nextTick();renderTrend()}catch(e){ElMessage.error(e instanceof Error?e.message:'读取求职趋势失败')}}
async function load(){if(!isTauriRuntime())return;loading.value=true;try{const [dashboard,trend]=await Promise.all([getDashboardData(),getJobTrend(trendRange.value)]);data.value=dashboard;trendData.value=trend;await nextTick();renderCharts()}catch(e){ElMessage.error(e instanceof Error?e.message:'读取首页失败')}finally{loading.value=false}}
function resizeCharts(){chartInstances.forEach(i=>i.resize())}
onMounted(()=>{load();window.addEventListener('resize',resizeCharts);resizeObserver=new ResizeObserver(resizeCharts);if(dashboardPage.value)resizeObserver.observe(dashboardPage.value)})
onBeforeUnmount(()=>{window.removeEventListener('resize',resizeCharts);resizeObserver?.disconnect();chartInstances.forEach(i=>i.dispose())})
</script>

<template>
  <div ref="dashboardPage" v-loading="loading" class="dashboard-page">
    <el-alert v-if="!isTauriRuntime()" title="当前为界面预览。安装并启动 Windows 客户端后，首页会显示本机 SQLite 数据。" type="info" show-icon :closable="false" />
    <section class="welcome-band">
      <div class="welcome-copy">
        <div class="desktop-badges">
          <span>Windows 本地客户端</span>
          <span>SQLite 本机保存</span>
        </div>
        <p class="eyebrow">你好，用户</p>
        <h1>今天是 {{ todayText }}，祝你求职顺利！</h1>
        <p class="welcome-note">所有数据保存在客户端程序旁的 data 文件夹，关闭软件后仍会永久保留。</p>
      </div>
      <div class="work-illustration" aria-hidden="true">
        <div class="mini-window">
          <i></i>
          <strong></strong>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="mini-card"></div>
      </div>
    </section>

    <div class="stat-grid">
      <StatCard
        v-for="item in stats"
        :key="item.title"
        :description="item.description"
        :icon="item.icon"
        :title="item.title"
        :tone="item.tone"
        :value="item.value"
      />
    </div>

    <div class="dashboard-grid three-columns">
      <AppCard class="panel">
        <div class="panel-head">
          <div>
            <h2>最近新增岗位</h2>
            <p>按添加时间倒序</p>
          </div>
          <el-button link type="primary" @click="router.push('/jobs')">查看更多</el-button>
        </div>
        <button v-for="item in data.recentJobs" :key="item.id" class="data-row" type="button" @click="router.push(`/jobs/${item.id}`)"><span><strong>{{ item.jobName }}</strong><small>{{ item.companyName }}</small></span><StatusTag v-if="item.applicationBlocked" type="danger">已达企业上限</StatusTag><small v-else>{{ item.location||'未填写地点' }}</small></button><div v-if="!data.recentJobs.length" class="table-empty">暂无岗位</div>
      </AppCard>
      <AppCard class="panel">
        <div class="panel-head">
          <div>
            <h2>7 天内截止</h2>
            <p>即将到期的招聘岗位</p>
          </div>
          <span class="count-pill">{{ data.deadlineJobs.length }}</span>
        </div>
        <button v-for="item in data.deadlineJobs" :key="item.id" class="data-row" :class="{muted:item.applicationBlocked}" type="button" @click="router.push(`/jobs/${item.id}`)"><span><strong>{{ item.jobName }}</strong><small>{{ item.companyName }}</small></span><span class="deadline-cell"><StatusTag v-if="item.applicationBlocked" type="info">已达上限</StatusTag><small class="deadline">{{ item.deadline }}</small></span></button><div v-if="!data.deadlineJobs.length" class="table-empty warning">暂无截止提醒</div>
      </AppCard>
      <AppCard class="panel">
        <div class="panel-head">
          <div>
            <h2>近期笔试 / 面试</h2>
            <p>未来 14 天安排</p>
          </div>
          <span class="count-pill">{{ data.upcoming.length }}</span>
        </div>
        <button v-for="item in data.upcoming" :key="item.id" class="data-row" type="button" @click="router.push(`/jobs/${item.jobId}`)"><span><strong>{{ item.eventLabel }} · {{ item.jobName }}</strong><small>{{ item.companyName }}</small></span><small>{{ displayDateTime(item.scheduledAt,item.timeTbd) }}</small></button><div v-if="!data.upcoming.length" class="table-empty info">暂无近期安排</div>
      </AppCard>
    </div>

    <div class="dashboard-grid chart-columns">
      <AppCard class="panel chart-panel">
        <div class="panel-head">
          <div>
            <h2>投递进度分布</h2>
            <p>阶段占比</p>
          </div>
        </div>
        <div ref="progressChart" class="chart-host"></div>
      </AppCard>
      <AppCard class="panel chart-panel">
        <div class="panel-head">
          <div>
            <h2>地区分布 Top5</h2>
            <p>按岗位数量排序</p>
          </div>
        </div>
        <div ref="locationChart" class="chart-host"></div>
      </AppCard>
      <AppCard class="panel chart-panel">
        <div class="panel-head">
          <div>
            <h2>企业性质分布</h2>
            <p>企业画像</p>
          </div>
        </div>
        <div ref="companyChart" class="chart-host"></div>
      </AppCard>
    </div>

    <AppCard class="panel trend-panel">
      <div class="panel-head">
        <div>
          <h2>求职趋势</h2>
          <p>岗位新增、投递与有效机会变化</p>
        </div>
        <el-segmented v-model="trendRange" :options="[{label:'7 天',value:7},{label:'30 天',value:30},{label:'90 天',value:90}]" @change="loadTrend" />
      </div>
      <div v-if="trendData.length" ref="trendChart" class="trend-chart-host" />
      <div v-else class="trend-empty"><strong>暂无趋势数据</strong><span>开始添加岗位后，这里会显示你的求职变化趋势。</span></div>
    </AppCard>

    <div class="dashboard-grid bottom-columns">
      <AppCard class="panel">
        <div class="panel-head">
          <div>
            <h2>提醒中心</h2>
            <p>启动与数据变更时刷新</p>
          </div>
        </div>
        <div class="reminder-strip">
          <span><strong>岗位截止</strong><small>{{ data.deadlineJobs.length }} 个即将截止</small></span>
          <span><strong>笔试 / 面试</strong><small>{{ data.upcoming.length }} 场近期安排</small></span>
          <span><strong>全部提醒</strong><small>点击进入提醒中心</small></span>
        </div>
      </AppCard>
      <AppCard class="panel">
        <div class="panel-head">
          <div>
            <h2>快捷操作</h2>
            <p>常用流程入口</p>
          </div>
        </div>
        <div class="quick-actions">
          <button type="button" @click="companyDialog?.open()">新增企业</button>
          <button type="button" @click="jobDialog?.open()">新增岗位</button>
          <button type="button" @click="router.push('/jobs')">更新投递状态</button>
          <button type="button" @click="router.push('/schedule')">日程安排</button>
        </div>
      </AppCard>
    </div>
    <CompanyDialog ref="companyDialog" @saved="load"/><JobDialog ref="jobDialog" @saved="load"/>
  </div>
</template>

<style scoped lang="scss">
.dashboard-page {
  display: grid;
  gap: 20px;
}

.welcome-band {
  display: flex;
  min-height: 178px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  overflow: hidden;
  border: 1px solid rgba(91, 92, 226, 0.18);
  border-radius: var(--radius-large);
  padding: 28px 32px;
  color: #fff;
  background:
    linear-gradient(135deg, rgba(91, 92, 226, 0.96), rgba(59, 130, 246, 0.78)),
    linear-gradient(45deg, rgba(34, 181, 115, 0.16), transparent);
  box-shadow: 0 20px 46px rgba(91, 92, 226, 0.22);

  h1 {
    max-width: 760px;
    margin: 6px 0 0;
    font-size: 28px;
    line-height: 1.35;
  }
}

.welcome-copy {
  min-width: 0;
}

.desktop-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;

  span {
    border: 1px solid rgba(255, 255, 255, 0.24);
    border-radius: 999px;
    padding: 6px 10px;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.12);
    font-size: 12px;
  }
}

.eyebrow {
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 14px;
}

.welcome-note {
  max-width: 620px;
  margin: 12px 0 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 14px;
}

.work-illustration {
  position: relative;
  width: 260px;
  height: 148px;
  flex: 0 0 auto;
}

.mini-window {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 220px;
  height: 132px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 18px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 22px 48px rgba(35, 42, 95, 0.2);

  i {
    display: block;
    width: 46px;
    height: 8px;
    margin-bottom: 18px;
    border-radius: 999px;
    background: rgba(91, 92, 226, 0.28);
  }

  strong {
    display: block;
    width: 118px;
    height: 14px;
    margin-bottom: 12px;
    border-radius: 999px;
    background: var(--text-primary);
  }

  span {
    display: block;
    height: 10px;
    margin-top: 10px;
    border-radius: 999px;
    background: rgba(102, 112, 133, 0.18);
  }

  span:nth-of-type(1) {
    width: 168px;
  }

  span:nth-of-type(2) {
    width: 134px;
  }

  span:nth-of-type(3) {
    width: 82px;
    background: rgba(34, 181, 115, 0.28);
  }
}

.mini-card {
  position: absolute;
  left: 0;
  bottom: 18px;
  width: 84px;
  height: 92px;
  border: 1px solid rgba(255, 255, 255, 0.52);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.64)),
    linear-gradient(135deg, rgba(255, 159, 67, 0.5), rgba(34, 181, 115, 0.45));
  box-shadow: 0 18px 38px rgba(35, 42, 95, 0.18);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(120px, 1fr));
  gap: 14px;
}

.dashboard-grid {
  display: grid;
  gap: 18px;
}

.three-columns,
.chart-columns {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.bottom-columns {
  grid-template-columns: 1.1fr 0.9fr;
}

.panel {
  min-height: 220px;
  padding: 20px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;

  h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 16px;
    line-height: 1.35;
  }

  p {
    margin: 4px 0 0;
    color: var(--text-secondary);
    font-size: 12px;
  }
}

.count-pill {
  display: inline-flex;
  min-width: 30px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--primary);
  background: var(--primary-tint);
  font-weight: 700;
}

.chart-panel {
  min-height: 350px;
}

.table-empty,
.chart-placeholder {
  display: grid;
  min-height: 124px;
  place-items: center;
  border-radius: var(--radius-medium);
  color: var(--text-tertiary);
  background: var(--bg-page);
}

.data-row {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 0;
  border-bottom: 1px solid var(--border-color);
  padding: 8px 2px;
  color: var(--text-primary);
  background: transparent;
  cursor: pointer;
  text-align: left;

  &:hover strong { color: var(--primary); }
  &:last-of-type { border-bottom: 0; }
  span { display: grid; gap: 3px; min-width: 0; }
  strong, small { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  small { color: var(--text-secondary); }
  .deadline { color: var(--warning); }
}

.data-row.muted{opacity:.68}.deadline-cell{display:flex!important;align-items:center;justify-content:flex-end;gap:7px}.deadline-cell small{overflow:visible}

.chart-host {
  width: 100%;
  height: 260px;
}

.trend-panel{min-height:380px}.trend-panel .panel-head{align-items:center}.trend-panel :deep(.el-segmented){--el-segmented-item-selected-bg-color:#4f6fea;--el-segmented-item-selected-color:#fff;background:#f2f4f8}.trend-chart-host{width:100%;height:300px}.trend-empty{display:grid;height:292px;place-content:center;gap:8px;color:var(--text-secondary);text-align:center;background:#fafbfe;border:1px dashed var(--border-color);border-radius:7px}.trend-empty strong{color:var(--text-primary);font-size:15px}

.table-empty {
  border: 1px dashed var(--border-color);
}

.table-empty.warning {
  color: var(--warning);
  background: rgba(255, 159, 67, 0.08);
}

.table-empty.info {
  color: var(--info);
  background: rgba(59, 130, 246, 0.08);
}

.chart-placeholder {
  position: relative;
  min-height: 180px;
  gap: 10px;
  align-content: center;
}

.donut-shell {
  display: block;
  width: 108px;
  height: 108px;
  border-radius: 50%;
  background:
    radial-gradient(circle, var(--bg-card) 0 46%, transparent 47%),
    conic-gradient(var(--primary) 0 24%, var(--info) 24% 42%, var(--warning) 42% 66%, var(--success) 66% 100%);
  opacity: 0.72;
}

.donut-shell.company {
  background:
    radial-gradient(circle, var(--bg-card) 0 46%, transparent 47%),
    conic-gradient(var(--success) 0 34%, var(--purple) 34% 58%, var(--warning) 58% 78%, var(--info) 78% 100%);
}

.bars {
  display: flex;
  align-items: end;
  justify-content: center;
  gap: 12px;

  span {
    width: 26px;
    border-radius: 8px 8px 4px 4px;
    background: linear-gradient(180deg, var(--primary-soft), var(--primary));
    opacity: 0.42;
  }

  span:nth-child(1) {
    height: 70px;
  }

  span:nth-child(2) {
    height: 112px;
  }

  span:nth-child(3) {
    height: 92px;
  }

  span:nth-child(4) {
    height: 132px;
  }

  span:nth-child(5) {
    height: 54px;
  }
}

.reminder-strip,
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.reminder-strip span {
  display: grid;
  flex: 1;
  min-width: 120px;
  gap: 6px;
  border-radius: var(--radius-medium);
  padding: 16px;
  color: var(--text-primary);
  background: var(--bg-page);

  strong {
    font-size: 14px;
  }

  small {
    color: var(--text-secondary);
  }
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  button {
    min-height: 58px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-medium);
    color: var(--text-primary);
    background: linear-gradient(180deg, #fff, #f9fbff);
    cursor: pointer;
    font-weight: 600;
    transition:
      border-color 160ms ease,
      color 160ms ease,
      transform 160ms ease,
      box-shadow 160ms ease;

    &:hover {
      border-color: rgba(91, 92, 226, 0.38);
      color: var(--primary);
      transform: translateY(-1px);
      box-shadow: 0 10px 22px rgba(91, 92, 226, 0.1);
    }
  }
}

@media (max-width: 1280px) {
  .stat-grid {
    grid-template-columns: repeat(4, minmax(140px, 1fr));
  }

  .three-columns,
  .chart-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .welcome-band {
    align-items: flex-start;
    flex-direction: column;
  }

  .stat-grid,
  .three-columns,
  .chart-columns,
  .bottom-columns {
    grid-template-columns: 1fr;
  }
}
</style>
