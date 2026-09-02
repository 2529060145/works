<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import AppCard from '../../components/common/AppCard.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import { exportExcel } from '../../services/excelService'
import { isTauriRuntime } from '../../services/databaseService'
const loading=ref(false),last=ref<{destination:string;count:number}|null>(null)
async function run(){loading.value=true;try{const result=await exportExcel();if(result){last.value=result;ElMessage.success(`已导出 ${result.count} 条岗位数据`)}}catch(e){ElMessage.error(e instanceof Error?e.message:'导出失败')}finally{loading.value=false}}
</script>
<template><div class="page-stack"><PageHeader title="Excel 导出" subtitle="导出可直接用 Excel 打开的完整中文工作簿"><el-button :icon="Download" type="primary" :loading="loading" :disabled="!isTauriRuntime()" @click="run">导出 Excel</el-button></PageHeader><el-alert v-if="!isTauriRuntime()" title="文件导出仅在 Windows 客户端内启用。" type="info" show-icon :closable="false"/><AppCard class="export-card"><h2>工作簿内容</h2><div class="sheet-list"><div><b>01</b><span><strong>岗位与投递</strong><small>企业、岗位、地点、薪资、截止日期、投递阶段与结果</small></span></div><div><b>02</b><span><strong>企业</strong><small>企业性质、所在地、官网、招聘网站和备注</small></span></div></div><el-alert v-if="last" :title="`最近导出 ${last.count} 条岗位：${last.destination}`" type="success" show-icon :closable="false"/></AppCard></div></template>
<style scoped lang="scss">.page-stack{display:grid;gap:16px}.export-card{padding:22px}.export-card h2{margin:0 0 18px;font-size:16px}.sheet-list{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:18px}.sheet-list>div{display:flex;gap:14px;padding:18px;border:1px solid var(--border-color);border-radius:8px}.sheet-list b{display:grid;width:38px;height:38px;place-items:center;border-radius:7px;color:var(--primary);background:var(--primary-tint)}.sheet-list span{display:grid;gap:6px}.sheet-list small{color:var(--text-secondary);line-height:1.5}</style>
