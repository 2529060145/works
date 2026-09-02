<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppCard from '../../components/common/AppCard.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import { applicationStageLabels } from '../../constants/status'
import type { DashboardData } from '../../services/statisticsService'
import { getDashboardData } from '../../services/statisticsService'
import { isTauriRuntime } from '../../services/databaseService'

const data=ref<DashboardData>({totalJobs:0,stages:{TO_APPLY:0,APPLIED:0,WRITTEN_TEST:0,INTERVIEW:0,OFFER:0,REJECTED:0,WITHDRAWN:0,UNSUITABLE:0},recentJobs:[],deadlineJobs:[],upcoming:[],locations:[],companyTypes:[]})
const maxStage=computed(()=>Math.max(1,...Object.values(data.value.stages))),maxLocation=computed(()=>Math.max(1,...data.value.locations.map(i=>i.value)))
const applied=computed(()=>data.value.totalJobs-data.value.stages.TO_APPLY)
const offerRate=computed(()=>applied.value?Math.round(data.value.stages.OFFER/applied.value*100):0)
onMounted(async()=>{if(isTauriRuntime())data.value=await getDashboardData()})
</script>
<template><div class="page-stack"><PageHeader title="数据统计" subtitle="从真实投递数据观察进展和机会分布"/><el-alert v-if="!isTauriRuntime()" title="当前是界面预览；统计数据仅在 Windows 客户端内启用。" type="info" show-icon :closable="false"/>
<div class="metric-grid"><AppCard><span>岗位总数</span><strong>{{ data.totalJobs }}</strong></AppCard><AppCard><span>已行动岗位</span><strong>{{ applied }}</strong></AppCard><AppCard><span>进入面试</span><strong>{{ data.stages.INTERVIEW }}</strong></AppCard><AppCard><span>Offer 转化率</span><strong>{{ offerRate }}%</strong></AppCard></div>
<div class="chart-grid"><AppCard class="chart-card"><h2>投递阶段</h2><div class="bars"><div v-for="(value,key) in data.stages" :key="key"><span>{{ applicationStageLabels[key] }}</span><i><b :style="{width:`${value/maxStage*100}%`}"></b></i><strong>{{ value }}</strong></div></div></AppCard><AppCard class="chart-card"><h2>地区 Top5</h2><div class="bars green"><div v-for="item in data.locations" :key="item.name"><span>{{ item.name }}</span><i><b :style="{width:`${item.value/maxLocation*100}%`}"></b></i><strong>{{ item.value }}</strong></div><p v-if="!data.locations.length">暂无数据</p></div></AppCard></div>
<AppCard class="chart-card"><h2>企业性质</h2><div class="type-list"><div v-for="item in data.companyTypes" :key="item.name"><strong>{{ item.value }}</strong><span>{{ item.name }}</span></div><p v-if="!data.companyTypes.length">暂无数据</p></div></AppCard></div></template>
<style scoped lang="scss">.page-stack{display:grid;gap:16px}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.metric-grid .app-card{display:grid;gap:8px;padding:18px}.metric-grid span{color:var(--text-secondary)}.metric-grid strong{font-size:28px}.chart-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.chart-card{padding:20px}.chart-card h2{margin:0 0 20px;font-size:16px}.bars{display:grid;gap:13px}.bars>div{display:grid;grid-template-columns:84px 1fr 34px;align-items:center;gap:10px}.bars span{color:var(--text-secondary);font-size:12px}.bars i{height:9px;border-radius:4px;background:var(--bg-page);overflow:hidden}.bars b{display:block;height:100%;min-width:2px;border-radius:4px;background:var(--primary)}.bars.green b{background:var(--success)}.type-list{display:flex;flex-wrap:wrap;gap:10px}.type-list div{display:grid;min-width:120px;gap:5px;padding:14px;border:1px solid var(--border-color);border-radius:7px}.type-list strong{font-size:20px}.type-list span{color:var(--text-secondary);font-size:12px}@media(max-width:1000px){.metric-grid{grid-template-columns:repeat(2,1fr)}.chart-grid{grid-template-columns:1fr}}</style>
