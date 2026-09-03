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
  return { companyName: '', companyType: '', officialWebsite: '', recruitmentWebsite: '', recruitmentBatch: '', headquarters: '', description: '', notes: '', applicationLimitType: 'UNKNOWN', maxApplications: undefined }
}

const urlValidator = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (!value || /^https?:\/\//i.test(value)) callback()
  else callback(new Error('网址必须以 http:// 或 https:// 开头'))
}

const rules: FormRules = {
  companyName: [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
  officialWebsite: [{ validator: urlValidator, trigger: 'blur' }],
  recruitmentWebsite: [{ validator: urlValidator, trigger: 'blur' }],
  maxApplications: [{ validator: (_: unknown, value: number | undefined, callback: (error?: Error) => void) => {
    if (form.applicationLimitType !== 'LIMITED' || (value != null && value >= 1)) callback()
    else callback(new Error('投递上限必须大于或等于 1'))
  }, trigger: 'change' }],
}

function limitTypeChanged() {
  if (form.applicationLimitType !== 'LIMITED') form.maxApplications = undefined
  else if (!form.maxApplications) form.maxApplications = 1
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
      <el-form-item label="岗位投递限制" class="limit-field">
        <el-radio-group v-model="form.applicationLimitType" @change="limitTypeChanged">
          <el-radio value="UNKNOWN">未知</el-radio>
          <el-radio value="UNLIMITED">不限制</el-radio>
          <el-radio value="LIMITED">最多投递</el-radio>
        </el-radio-group>
        <div v-if="form.applicationLimitType === 'LIMITED'" class="limit-input"><span>最多投递</span><el-form-item prop="maxApplications"><el-input-number v-model="form.maxApplications" :min="1" :max="999" /></el-form-item><span>个岗位</span></div>
      </el-form-item>
      <el-form-item label="企业简介"><el-input v-model="form.description" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item>
      <el-form-item label="备注"><el-input v-model="form.notes" type="textarea" :rows="2" maxlength="500" show-word-limit /></el-form-item>
    </el-form>
    <template #footer><el-button @click="visible=false">取消</el-button><el-button type="primary" :loading="saving" @click="submit">保存</el-button></template>
  </el-dialog>
</template>

<style scoped>.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px}.el-select{width:100%}.limit-field :deep(.el-form-item__content){display:grid;gap:10px}.limit-input{display:flex;align-items:center;gap:9px;padding:10px 12px;border:1px solid var(--border-color);border-radius:7px;background:var(--bg-page);color:var(--text-secondary)}.limit-input .el-form-item{margin:0}.limit-input .el-input-number{width:120px}</style>
