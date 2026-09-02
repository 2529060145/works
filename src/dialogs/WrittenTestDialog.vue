<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import type { WrittenTest, WrittenTestInput } from '../types/writtenTest'
import { listJobOptions } from '../services/jobService'
import { saveWrittenTest } from '../services/writtenTestService'

const emit = defineEmits<{ saved: [] }>()
const visible = ref(false), saving = ref(false), editingId = ref<number>()
const jobs = ref<{ id: number; label: string }[]>([])
const formRef = ref<FormInstance>()
const form = reactive<WrittenTestInput>({ jobId: 0, scheduledAt: '', form: 'ONLINE', location: '', status: 'WAITING', result: 'PENDING', notes: '' })
const rules: FormRules = { jobId: [{ required: true, message: '请选择岗位', trigger: 'change' }], scheduledAt: [{ required: true, message: '请选择笔试时间', trigger: 'change' }] }

async function open(record?: WrittenTest, jobId?: number) {
  editingId.value = record?.id
  Object.assign(form, { jobId: jobId ?? record?.jobId ?? 0, scheduledAt: record?.scheduledAt ?? '', form: record?.form ?? 'ONLINE', location: record?.location ?? '', status: record?.status ?? 'WAITING', result: record?.result ?? 'PENDING', notes: record?.notes ?? '' })
  visible.value = true
  try { jobs.value = await listJobOptions() } catch { jobs.value = [] }
  nextTick(() => formRef.value?.clearValidate())
}
async function submit() {
  if (!(await formRef.value?.validate().catch(() => false))) return
  saving.value = true
  try { await saveWrittenTest(form, editingId.value); ElMessage.success('笔试记录已保存'); visible.value=false; emit('saved') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '保存笔试失败') }
  finally { saving.value=false }
}
defineExpose({ open })
</script>
<template>
  <el-dialog v-model="visible" :title="editingId ? '编辑笔试' : '新增笔试'" width="600px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-form-item label="岗位" prop="jobId"><el-select v-model="form.jobId" filterable><el-option v-for="item in jobs" :key="item.id" :label="item.label" :value="item.id" /></el-select></el-form-item>
      <div class="form-grid">
        <el-form-item label="笔试时间" prop="scheduledAt"><el-date-picker v-model="form.scheduledAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
        <el-form-item label="形式"><el-select v-model="form.form"><el-option label="线上" value="ONLINE" /><el-option label="线下" value="OFFLINE" /><el-option label="其他" value="OTHER" /></el-select></el-form-item>
        <el-form-item label="状态"><el-select v-model="form.status"><el-option label="待进行" value="WAITING" /><el-option label="已完成" value="COMPLETED" /><el-option label="已取消" value="CANCELLED" /></el-select></el-form-item>
        <el-form-item label="结果"><el-select v-model="form.result"><el-option label="待通知" value="PENDING" /><el-option label="通过" value="PASSED" /><el-option label="未通过" value="FAILED" /></el-select></el-form-item>
      </div>
      <el-form-item label="地点 / 链接"><el-input v-model="form.location" /></el-form-item>
      <el-form-item label="备注"><el-input v-model="form.notes" type="textarea" :rows="3" /></el-form-item>
    </el-form>
    <template #footer><el-button @click="visible=false">取消</el-button><el-button type="primary" :loading="saving" @click="submit">保存</el-button></template>
  </el-dialog>
</template>
<style scoped>.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}.el-select,.el-date-editor{width:100%}</style>
