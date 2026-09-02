<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import type { Job, JobInput } from '../types/job'
import type { Company } from '../types/company'
import { listCompanies } from '../services/companyService'
import { saveJob } from '../services/jobService'

const emit = defineEmits<{ saved: [] }>()
const visible = ref(false)
const saving = ref(false)
const editingId = ref<number>()
const companies = ref<Array<Company & { jobCount: number }>>([])
const formRef = ref<FormInstance>()
const form = reactive<JobInput>(emptyForm())

function emptyForm(): JobInput { return { companyId: 0, jobName: '', location: '', recruitmentBatch: '', salaryText: '', salaryMin: undefined, salaryMax: undefined, salaryMonths: undefined, education: '', majorRequirement: '', jobRequirement: '', recruitmentCount: 0, publishDate: '', deadline: '', jobUrl: '', notes: '' } }

const rules: FormRules = {
  companyId: [{ required: true, message: '请选择所属企业', trigger: 'change' }],
  jobName: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }],
  jobUrl: [{ validator: (_: unknown, value: string, callback: (error?: Error) => void) => !value || /^https?:\/\//i.test(value) ? callback() : callback(new Error('网址必须以 http:// 或 https:// 开头')), trigger: 'blur' }],
  salaryMax: [{ validator: (_: unknown, value: number, callback: (error?: Error) => void) => value == null || form.salaryMin == null || form.salaryMin <= value ? callback() : callback(new Error('最高薪资不能低于最低薪资')), trigger: 'blur' }],
}

async function open(record?: Job, companyId?: number) {
  editingId.value = record?.id
  Object.assign(form, emptyForm(), record ?? {}, companyId ? { companyId } : {})
  visible.value = true
  try { companies.value = await listCompanies() } catch { companies.value = [] }
  nextTick(() => formRef.value?.clearValidate())
}

async function submit() {
  if (!(await formRef.value?.validate().catch(() => false))) return
  saving.value = true
  try {
    await saveJob(form, editingId.value)
    ElMessage.success(editingId.value ? '岗位已更新' : '岗位已添加')
    visible.value = false
    emit('saved')
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '保存岗位失败') }
  finally { saving.value = false }
}

defineExpose({ open })
</script>

<template>
  <el-dialog v-model="visible" :title="editingId ? '编辑岗位' : '新增岗位'" width="820px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <div class="form-grid">
        <el-form-item label="所属企业" prop="companyId"><el-select v-model="form.companyId" filterable><el-option v-for="item in companies" :key="item.id" :label="item.companyName" :value="item.id" /></el-select></el-form-item>
        <el-form-item label="岗位名称" prop="jobName"><el-input v-model="form.jobName" maxlength="100" /></el-form-item>
        <el-form-item label="工作地点"><el-input v-model="form.location" placeholder="如：北京 / 上海" /></el-form-item>
        <el-form-item label="招聘批次"><el-input v-model="form.recruitmentBatch" /></el-form-item>
        <el-form-item label="学历要求"><el-input v-model="form.education" /></el-form-item>
        <el-form-item label="招聘人数"><el-input-number v-model="form.recruitmentCount" :min="0" :max="100000" /></el-form-item>
        <el-form-item label="发布日期"><el-date-picker v-model="form.publishDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="截止日期"><el-date-picker v-model="form.deadline" type="date" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="最低月薪（千元）"><el-input-number v-model="form.salaryMin" :min="0" :precision="1" /></el-form-item>
        <el-form-item label="最高月薪（千元）" prop="salaryMax"><el-input-number v-model="form.salaryMax" :min="0" :precision="1" /></el-form-item>
        <el-form-item label="薪资月数"><el-input-number v-model="form.salaryMonths" :min="1" :max="24" /></el-form-item>
        <el-form-item label="薪资原文"><el-input v-model="form.salaryText" placeholder="如：15-25K·14薪" /></el-form-item>
      </div>
      <el-form-item label="招聘链接" prop="jobUrl"><el-input v-model="form.jobUrl" placeholder="https://" /></el-form-item>
      <el-form-item label="专业要求"><el-input v-model="form.majorRequirement" type="textarea" :rows="2" /></el-form-item>
      <el-form-item label="岗位要求"><el-input v-model="form.jobRequirement" type="textarea" :rows="3" /></el-form-item>
      <el-form-item label="备注"><el-input v-model="form.notes" type="textarea" :rows="2" /></el-form-item>
    </el-form>
    <template #footer><el-button @click="visible=false">取消</el-button><el-button type="primary" :loading="saving" @click="submit">保存</el-button></template>
  </el-dialog>
</template>

<style scoped>.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px}.el-select,.el-date-editor{width:100%}</style>
