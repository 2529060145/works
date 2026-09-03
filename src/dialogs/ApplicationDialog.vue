<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import type { Application, ApplicationInput, ApplicationResult, ApplicationStage } from '../types/application'
import { applicationResultLabels, applicationStageOptions } from '../constants/status'
import { listJobOptions } from '../services/jobService'
import { saveApplication } from '../services/applicationService'

const emit = defineEmits<{ saved: [] }>()
const visible = ref(false)
const saving = ref(false)
const jobs = ref<{ id: number; label: string }[]>([])
const formRef = ref<FormInstance>()
const form = reactive<ApplicationInput>({ jobId: 0, stage: 'TO_APPLY', applicationDate: '', result: 'PENDING', resultReason: '', notes: '' })
const rules: FormRules = { jobId: [{ required: true, message: '请选择岗位', trigger: 'change' }], stage: [{ required: true, message: '请选择阶段', trigger: 'change' }] }
const resultOptions = Object.entries(applicationResultLabels).map(([value, label]) => ({ value: value as ApplicationResult, label }))

async function open(record?: Application, jobId?: number, stage?: ApplicationStage) {
  Object.assign(form, { jobId: jobId ?? record?.jobId ?? 0, stage: stage ?? record?.stage ?? 'TO_APPLY', applicationDate: record?.applicationDate ?? '', result: record?.result ?? 'PENDING', resultReason: record?.resultReason ?? '', notes: record?.notes ?? '' })
  visible.value = true
  try { jobs.value = await listJobOptions() } catch { jobs.value = [] }
  nextTick(() => formRef.value?.clearValidate())
}

async function submit() {
  if (!(await formRef.value?.validate().catch(() => false))) return
  saving.value = true
  try { await saveApplication(form); ElMessage.success('投递记录已保存'); visible.value = false; emit('saved') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '保存投递记录失败') }
  finally { saving.value = false }
}
defineExpose({ open })
</script>

<template>
  <el-dialog v-model="visible" title="投递记录" width="560px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-form-item label="岗位" prop="jobId"><el-select v-model="form.jobId" filterable><el-option v-for="item in jobs" :key="item.id" :label="item.label" :value="item.id" /></el-select></el-form-item>
      <div class="form-grid">
        <el-form-item label="当前阶段" prop="stage"><el-select v-model="form.stage"><el-option v-for="item in applicationStageOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="投递日期"><el-date-picker v-model="form.applicationDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="结果"><el-select v-model="form.result"><el-option v-for="item in resultOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item v-if="form.result==='FAILED'" label="未通过原因"><el-input v-model="form.resultReason" maxlength="200" /></el-form-item>
      </div>
      <el-form-item label="备注"><el-input v-model="form.notes" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item>
    </el-form>
    <template #footer><el-button @click="visible=false">取消</el-button><el-button type="primary" :loading="saving" @click="submit">保存</el-button></template>
  </el-dialog>
</template>
<style scoped>.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}.el-select,.el-date-editor{width:100%}</style>
