<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, FolderOpened } from '@element-plus/icons-vue'
import type { SelectedProofFile } from '../../types/proofMaterial'
import { proofCategories } from '../../types/proofMaterial'
import { chooseProofFile, uploadProofMaterial } from '../../services/proofMaterialService'

const emit=defineEmits<{saved:[]}>(),visible=ref(false),file=ref<SelectedProofFile>(),displayName=ref(''),category=ref('未分类'),saving=ref(false),initial=ref('')
const dirty=computed(()=>JSON.stringify({file:file.value?.sourcePath,name:displayName.value,category:category.value})!==initial.value)
function sizeText(size:number){if(size<1024)return`${size} B`;if(size<1048576)return`${(size/1024).toFixed(1)} KB`;return`${(size/1048576).toFixed(1)} MB`}
function open(){file.value=undefined;displayName.value='';category.value='未分类';initial.value=JSON.stringify({file:undefined,name:'',category:'未分类'});visible.value=true}
async function choose(){try{const selected=await chooseProofFile();if(!selected)return;file.value=selected;displayName.value=selected.originalName.replace(/\.(pdf|docx?)$/i,'')}catch(error){ElMessage.error(error instanceof Error?error.message:'选择文件失败')}}
async function submit(){if(!file.value){ElMessage.warning('请选择文件');return}if(!displayName.value.trim()){ElMessage.warning('请填写文件备注名称');return}saving.value=true;try{await uploadProofMaterial(file.value,displayName.value,category.value);ElMessage.success('上传成功');initial.value=JSON.stringify({file:file.value.sourcePath,name:displayName.value,category:category.value});visible.value=false;emit('saved')}catch(error){ElMessage.error(error instanceof Error?error.message:'上传失败')}finally{saving.value=false}}
function beforeClose(done:()=>void){if(!dirty.value){done();return}ElMessageBox.confirm('当前修改尚未保存，确定要关闭吗？','未保存修改',{type:'warning'}).then(done).catch(()=>undefined)}
defineExpose({open})
</script>
<template><el-dialog v-model="visible" title="上传证明材料" width="560px" :before-close="beforeClose"><div class="file-picker"><button type="button" @click="choose"><el-icon><FolderOpened/></el-icon><span>选择 PDF 或 Word 文件</span></button><div v-if="file" class="selected-file"><el-icon><Document/></el-icon><span><strong>{{ file.originalName }}</strong><small>{{ file.extension.toUpperCase() }} · {{ sizeText(file.fileSize) }}</small></span></div></div><el-form label-position="top"><el-form-item label="文件备注名称" required><el-input v-model="displayName" placeholder="例如：大学英语四级证书"/><p>请填写便于识别的名称。备注名称不会修改原文件名。</p></el-form-item><el-form-item label="材料分类（可选）"><el-select v-model="category"><el-option v-for="item in proofCategories" :key="item" :label="item" :value="item"/></el-select></el-form-item></el-form><template #footer><el-button @click="visible=false">取消</el-button><el-button type="primary" :loading="saving" :disabled="!file||!displayName.trim()" @click="submit">确认上传</el-button></template></el-dialog></template>
<style scoped>.file-picker{display:grid;gap:10px;margin-bottom:18px}.file-picker>button{display:flex;height:76px;align-items:center;justify-content:center;gap:9px;border:1px dashed color-mix(in srgb,var(--purple) 55%,var(--border-color));border-radius:8px;color:#6254d9;background:#f7f5ff;cursor:pointer;font:inherit;font-weight:600}.selected-file{display:flex;align-items:center;gap:12px;border:1px solid var(--border-color);border-radius:8px;padding:12px}.selected-file>.el-icon{color:var(--purple);font-size:26px}.selected-file span{display:grid;gap:4px}.selected-file small,.el-form-item p{margin:0;color:var(--text-tertiary);font-size:12px}.el-select{width:100%}</style>
