<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import type { Company, CompanyInput } from '../types/company'
import { saveCompany } from '../services/companyService'

const emit = defineEmits<{ saved: [] }>()
const visible = ref(false)
const saving = ref(false)
const editingId = ref<number>()
const formRef = ref<FormInstance>()
const form = reactive<CompanyInput>(emptyForm())

function emptyForm(): CompanyInput {
  return { companyName: '', companyType: '', officialWebsite: '', recruitmentWebsite: '', recruitmentBatch: '', headquarters: '', description: '', notes: '' }
}

const urlValidator = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (!value || /^https?:\/\//i.test(value)) callback()
  else callback(new Error('网址必须以 http:// 或 https:// 开头'))
}

const rules: FormRules = {
  companyName: [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
  officialWebsite: [{ validator: urlValidator, trigger: 'blur' }],
  recruitmentWebsite: [{ validator: urlValidator, trigger: 'blur' }],
}

function open(record?: Company) {
  editingId.value = record?.id
  Object.assign(form, emptyForm(), record ?? {})
  visible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

async function submit() {
  if (!(await formRef.value?.validate().catch(() => false))) return
  saving.value = true
  try {
    await saveCompany(form, editingId.value)
    ElMessage.success(editingId.value ? '企业信息已更新' : '企业已添加')
    visible.value = false
    emit('saved')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存企业失败')
  } finally { saving.value = false }
}

defineExpose({ open })
</script>

<template>
  <el-dialog v-model="visible" :title="editingId ? '编辑企业' : '新增企业'" width="680px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <div class="form-grid">
        <el-form-item label="企业名称" prop="companyName"><el-input v-model="form.companyName" maxlength="80" show-word-limit /></el-form-item>
        <el-form-item label="企业性质"><el-select v-model="form.companyType" clearable><el-option v-for="item in ['央企','国企','民企','外企','事业单位','高校','科研院所','其他']" :key="item" :label="item" :value="item" /></el-select></el-form-item>
        <el-form-item label="总部所在地"><el-input v-model="form.headquarters" placeholder="如：北京" /></el-form-item>
        <el-form-item label="招聘批次"><el-input v-model="form.recruitmentBatch" placeholder="如：2027 届秋招" /></el-form-item>
        <el-form-item label="官方网站" prop="officialWebsite"><el-input v-model="form.officialWebsite" placeholder="https://" /></el-form-item>
        <el-form-item label="招聘网站" prop="recruitmentWebsite"><el-input v-model="form.recruitmentWebsite" placeholder="https://" /></el-form-item>
      </div>
      <el-form-item label="企业简介"><el-input v-model="form.description" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item>
      <el-form-item label="备注"><el-input v-model="form.notes" type="textarea" :rows="2" maxlength="500" show-word-limit /></el-form-item>
    </el-form>
    <template #footer><el-button @click="visible=false">取消</el-button><el-button type="primary" :loading="saving" @click="submit">保存</el-button></template>
  </el-dialog>
</template>

<style scoped>.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px}.el-select{width:100%}</style>
