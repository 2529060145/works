<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import AppCard from '../../components/common/AppCard.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import type { ImportReport } from '../../services/excelService'
import { importExcel } from '../../services/excelService'
import { isTauriRuntime } from '../../services/databaseService'
const loading=ref(false),report=ref<ImportReport|null>(null)
async function choose(){loading.value=true;try{const result=await importExcel();if(result){report.value=result;ElMessage.success(`导入完成：新增 ${result.jobsCreated} 个岗位`)}}catch(e){ElMessage.error(e instanceof Error?e.message:'导入失败')}finally{loading.value=false}}
</script>
<template><div class="page-stack"><PageHeader title="Excel 导入" subtitle="批量导入企业、岗位与投递阶段"><el-button :icon="Upload" type="primary" :loading="loading" :disabled="!isTauriRuntime()" @click="choose">选择 Excel</el-button></PageHeader><el-alert v-if="!isTauriRuntime()" title="Excel 文件选择仅在 Windows 客户端内启用。" type="info" show-icon :closable="false"/>
<AppCard class="import-card"><div class="drop-zone"><el-icon :size="34"><Upload/></el-icon><h2>导入 .xlsx 或 .xls 工作簿</h2><p>读取第一个工作表；必需列为“企业名称”和“岗位名称”，支持公司名称、职位名称等常见别名。</p><el-button :disabled="!isTauriRuntime()" @click="choose">浏览文件</el-button></div><div class="columns"><strong>可识别字段</strong><span v-for="item in ['企业名称','企业性质','工作地点','岗位名称','招聘批次','薪资','学历要求','专业要求','岗位要求','招聘人数','发布日期','截止日期','招聘链接','投递阶段','投递日期','备注']" :key="item">{{ item }}</span></div></AppCard>
<AppCard v-if="report" class="report-card"><h2>导入报告 · {{ report.fileName }}</h2><div class="report-grid"><div><strong>{{ report.rows }}</strong><span>读取行数</span></div><div><strong>{{ report.companiesCreated }}</strong><span>新增企业</span></div><div><strong>{{ report.jobsCreated }}</strong><span>新增岗位</span></div><div><strong>{{ report.applicationsUpdated }}</strong><span>投递记录</span></div><div><strong>{{ report.skipped }}</strong><span>跳过行数</span></div></div><el-alert v-if="report.errors.length" :title="report.errors.slice(0,5).join('；')" type="warning" show-icon :closable="false"/></AppCard></div></template>
<style scoped lang="scss">.page-stack{display:grid;gap:16px}.import-card,.report-card{padding:22px}.drop-zone{display:grid;justify-items:center;gap:10px;border:1px dashed #cdd5e2;border-radius:8px;padding:38px;color:var(--text-secondary);text-align:center}.drop-zone h2{margin:0;color:var(--text-primary);font-size:17px}.drop-zone p{max-width:620px;margin:0;line-height:1.7}.columns{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:18px}.columns span{border-radius:5px;padding:5px 8px;background:var(--bg-page);color:var(--text-secondary);font-size:12px}.report-card h2{margin:0 0 18px;font-size:16px}.report-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px}.report-grid div{display:grid;gap:6px;padding:14px;border:1px solid var(--border-color);border-radius:7px}.report-grid strong{font-size:22px}.report-grid span{color:var(--text-secondary);font-size:12px}</style>
