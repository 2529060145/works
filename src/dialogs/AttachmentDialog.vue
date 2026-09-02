<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, FolderOpened, Plus } from '@element-plus/icons-vue'
import type { Attachment } from '../types/attachment'
import { addAttachment, deleteAttachment, listAttachments, openAttachment } from '../services/attachmentService'
const visible=ref(false),jobId=ref(0),rows=ref<Attachment[]>([]),busy=ref(false)
async function load(){rows.value=await listAttachments(jobId.value)}
async function open(id:number){jobId.value=id;visible.value=true;await load()}
async function upload(){busy.value=true;try{if(await addAttachment(jobId.value)){ElMessage.success('附件已复制到应用数据目录');await load()}}catch(e){ElMessage.error(e instanceof Error?e.message:'添加附件失败')}finally{busy.value=false}}
async function remove(item:Attachment){await ElMessageBox.confirm(`确定删除附件“${item.fileName}”吗？`,'删除附件',{type:'warning'});await deleteAttachment(item);await load()}
defineExpose({open})
</script>
<template><el-dialog v-model="visible" title="岗位附件" width="640px"><div class="dialog-toolbar"><p>附件会复制到应用数据目录，原文件删除后仍可打开。</p><el-button :icon="Plus" type="primary" :loading="busy" @click="upload">添加附件</el-button></div><el-table v-if="rows.length" :data="rows"><el-table-column prop="fileName" label="文件名" min-width="260"/><el-table-column prop="createdAt" label="添加时间" width="165"/><el-table-column label="操作" width="100"><template #default="scope"><el-button :icon="FolderOpened" link @click="openAttachment(scope.row)"/><el-button :icon="Delete" link type="danger" @click="remove(scope.row)"/></template></el-table-column></el-table><el-empty v-else description="暂无附件" :image-size="70"/></el-dialog></template>
<style scoped>.dialog-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}.dialog-toolbar p{margin:0;color:var(--text-secondary);font-size:12px}</style>
