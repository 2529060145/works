<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Plus, Search, View, Delete } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import AppCard from '../../components/common/AppCard.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import CompanyDialog from '../../dialogs/CompanyDialog.vue'
import type { Company } from '../../types/company'
import { deleteCompany, listCompanies } from '../../services/companyService'
import { isTauriRuntime } from '../../services/databaseService'

type CompanyRow = Company & { jobCount: number }
const router = useRouter()
const rows = ref<CompanyRow[]>([])
const keyword = ref('')
const loading = ref(false)
const dialog = ref<InstanceType<typeof CompanyDialog>>()

async function load() {
  if (!isTauriRuntime()) return
  loading.value = true
  try { rows.value = await listCompanies(keyword.value) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '读取企业失败') }
  finally { loading.value = false }
}

async function remove(row: CompanyRow) {
  await ElMessageBox.confirm(`删除“${row.companyName}”将同时删除其岗位、投递和日程，确定继续吗？`, '删除企业', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  await deleteCompany(row.id)
  ElMessage.success('企业已删除')
  await load()
}

onMounted(load)
</script>

<template>
  <div class="page-stack">
    <PageHeader title="企业管理" subtitle="维护企业档案，岗位与流程会自动按企业归档">
      <el-button :icon="Plus" type="primary" @click="dialog?.open()">新增企业</el-button>
    </PageHeader>
    <el-alert v-if="!isTauriRuntime()" title="当前是界面预览；数据增删改请在 Windows 客户端中使用。" type="info" show-icon :closable="false" />
    <AppCard class="data-card">
      <div class="toolbar">
        <el-input v-model="keyword" :prefix-icon="Search" clearable placeholder="搜索企业名称、地区或性质" @keyup.enter="load" @clear="load" />
        <el-button @click="load">查询</el-button>
        <span class="result-count">共 {{ rows.length }} 家企业</span>
      </div>
      <el-table v-if="rows.length" v-loading="loading" :data="rows" stripe>
        <el-table-column prop="companyName" label="企业名称" min-width="220" />
        <el-table-column prop="companyType" label="企业性质" width="120" />
        <el-table-column prop="headquarters" label="总部" width="120" />
        <el-table-column prop="recruitmentBatch" label="招聘批次" min-width="150" />
        <el-table-column prop="jobCount" label="岗位数" width="90" align="center" />
        <el-table-column label="操作" width="168" fixed="right">
          <template #default="scope">
            <el-button :icon="View" link type="primary" title="查看详情" @click="router.push(`/companies/${scope.row.id}`)" />
            <el-button :icon="Edit" link title="编辑" @click="dialog?.open(scope.row)" />
            <el-button :icon="Delete" link type="danger" title="删除" @click="remove(scope.row)" />
          </template>
        </el-table-column>
      </el-table>
      <EmptyState v-else title="还没有企业" description="先创建企业，再在企业下维护岗位。" />
    </AppCard>
    <CompanyDialog ref="dialog" @saved="load" />
  </div>
</template>

<style scoped lang="scss">.page-stack{display:grid;gap:16px}.data-card{overflow:hidden;padding:18px}.toolbar{display:flex;align-items:center;gap:10px;margin-bottom:16px}.toolbar .el-input{width:360px}.result-count{margin-left:auto;color:var(--text-tertiary);font-size:13px}.empty-state{min-height:360px}</style>
