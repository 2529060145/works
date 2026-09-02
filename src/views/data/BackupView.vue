<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, RefreshLeft } from '@element-plus/icons-vue'
import AppCard from '../../components/common/AppCard.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import { backupDatabase, restoreDatabase } from '../../services/backupService'
import { isTauriRuntime } from '../../services/databaseService'
const busy=ref(false),lastBackup=ref('')
async function backup(){busy.value=true;try{const path=await backupDatabase();if(path){lastBackup.value=path;ElMessage.success('数据库备份已完成')}}catch(e){ElMessage.error(e instanceof Error?e.message:'备份失败')}finally{busy.value=false}}
async function restore(){await ElMessageBox.confirm('恢复会覆盖当前数据库并重新启动界面。建议先备份当前数据。','恢复数据库',{type:'warning',confirmButtonText:'选择备份并恢复',cancelButtonText:'取消'});busy.value=true;try{const path=await restoreDatabase();if(path){ElMessage.success('恢复完成，正在重新载入');window.location.reload()}}catch(e){ElMessage.error(e instanceof Error?e.message:'恢复失败');busy.value=false}}
</script>
<template><div class="page-stack"><PageHeader title="备份与恢复" subtitle="保护本机 SQLite 数据"><el-button :icon="Download" type="primary" :loading="busy" :disabled="!isTauriRuntime()" @click="backup">备份数据库</el-button><el-button :icon="RefreshLeft" :disabled="!isTauriRuntime()||busy" @click="restore">恢复数据库</el-button></PageHeader><el-alert v-if="!isTauriRuntime()" title="数据库文件操作仅在 Windows 客户端内启用。" type="info" show-icon :closable="false"/><div class="backup-grid"><AppCard><div class="feature-icon primary"><Download/></div><h2>创建备份</h2><p>先把 SQLite 写入落盘，再复制为带日期时间的 .db 文件。你可以保存到移动硬盘或网盘目录。</p><el-button type="primary" :disabled="!isTauriRuntime()" @click="backup">选择保存位置</el-button></AppCard><AppCard><div class="feature-icon warning"><RefreshLeft/></div><h2>从备份恢复</h2><p>选择之前生成的 .db 文件，经过文件校验后覆盖当前数据库。恢复前建议先创建一次新备份。</p><el-button :disabled="!isTauriRuntime()" @click="restore">选择备份文件</el-button></AppCard></div><el-alert v-if="lastBackup" :title="`最近备份：${lastBackup}`" type="success" show-icon :closable="false"/></div></template>
<style scoped lang="scss">.page-stack{display:grid;gap:16px}.backup-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.backup-grid .app-card{padding:24px}.backup-grid h2{margin:16px 0 8px;font-size:17px}.backup-grid p{min-height:48px;color:var(--text-secondary);line-height:1.7}.feature-icon{display:grid;width:44px;height:44px;place-items:center;border-radius:8px;color:var(--primary);background:var(--primary-tint);font-size:20px}.feature-icon.warning{color:var(--warning);background:rgba(255,159,67,.12)}</style>
