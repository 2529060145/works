<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Plus } from '@element-plus/icons-vue'
import AppCard from '../../components/common/AppCard.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import type { Tag } from '../../services/tagService'
import { deleteTag, listTags, saveTag } from '../../services/tagService'
import { isTauriRuntime } from '../../services/databaseService'

const tags=ref<Tag[]>([]),visible=ref(false),editingId=ref<number>(),form=reactive({name:'',color:'#4f6ef7'})
async function load(){if(isTauriRuntime())tags.value=await listTags()}
function open(tag?:Tag){editingId.value=tag?.id;form.name=tag?.name??'';form.color=tag?.color??'#4f6ef7';visible.value=true}
async function submit(){if(!form.name.trim()){ElMessage.warning('请输入标签名称');return}try{await saveTag(form.name,form.color,editingId.value);visible.value=false;ElMessage.success('标签已保存');load()}catch(e){ElMessage.error(e instanceof Error?e.message:'保存标签失败')}}
async function remove(tag:Tag){await ElMessageBox.confirm(`确定删除标签“${tag.name}”吗？`,'删除标签',{type:'warning'});await deleteTag(tag.id);load()}
onMounted(load)
</script>
<template><div class="page-stack"><PageHeader title="标签管理" subtitle="使用颜色和标签整理重点机会"><el-button :icon="Plus" type="primary" @click="open()">新增标签</el-button></PageHeader>
<el-alert v-if="!isTauriRuntime()" title="当前是界面预览；数据功能仅在 Windows 客户端内启用。" type="info" show-icon :closable="false"/><AppCard class="tag-card"><div class="tag-list"><div v-for="tag in tags" :key="tag.id" class="tag-row"><i :style="{background:tag.color}"></i><strong>{{ tag.name }}</strong><span>{{ tag.color }}</span><el-button :icon="Edit" link @click="open(tag)"/><el-button :icon="Delete" link type="danger" @click="remove(tag)"/></div></div></AppCard>
<el-dialog v-model="visible" :title="editingId?'编辑标签':'新增标签'" width="420px"><el-form label-position="top"><el-form-item label="标签名称"><el-input v-model="form.name" maxlength="20"/></el-form-item><el-form-item label="颜色"><el-color-picker v-model="form.color"/><span class="color-value">{{ form.color }}</span></el-form-item></el-form><template #footer><el-button @click="visible=false">取消</el-button><el-button type="primary" @click="submit">保存</el-button></template></el-dialog></div></template>
<style scoped lang="scss">.page-stack{display:grid;gap:16px}.tag-card{padding:18px}.tag-list{display:grid;grid-template-columns:repeat(3,minmax(230px,1fr));gap:10px}.tag-row{display:grid;grid-template-columns:14px 1fr auto 32px 32px;align-items:center;gap:9px;padding:12px 14px;border:1px solid var(--border-color);border-radius:7px}.tag-row i{width:12px;height:12px;border-radius:3px}.tag-row span,.color-value{color:var(--text-tertiary);font-size:12px}.color-value{margin-left:10px}@media(max-width:1000px){.tag-list{grid-template-columns:repeat(2,1fr)}}</style>
