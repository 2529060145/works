<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { FolderOpened } from '@element-plus/icons-vue'
import { appConfigDir, appDataDir } from '@tauri-apps/api/path'
import { openPath } from '@tauri-apps/plugin-opener'
import AppCard from '../../components/common/AppCard.vue'
import PageHeader from '../../components/common/PageHeader.vue'
import { isTauriRuntime } from '../../services/databaseService'
import { getSettings, setSetting } from '../../services/settingsService'
import { useSettingsStore } from '../../stores/settings'

const store=useSettingsStore(),databaseDirectory=ref('仅 Windows 客户端内可用'),attachmentDirectory=ref('仅 Windows 客户端内可用'),saving=ref(false),form=reactive({userName:'用户',theme:'light' as 'light'|'dark'})
async function load(){if(!isTauriRuntime())return;databaseDirectory.value=await appConfigDir();attachmentDirectory.value=await appDataDir();const values=await getSettings();form.userName=values.user_name||'用户';form.theme=values.theme==='dark'?'dark':'light';store.userName=form.userName;store.theme=form.theme;store.applyTheme()}
async function save(){saving.value=true;try{await setSetting('user_name',form.userName.trim()||'用户');await setSetting('theme',form.theme);store.userName=form.userName.trim()||'用户';store.theme=form.theme;store.applyTheme();ElMessage.success('设置已保存')}catch(e){ElMessage.error(e instanceof Error?e.message:'保存设置失败')}finally{saving.value=false}}
onMounted(load)
</script>
<template><div class="page-stack"><PageHeader title="系统设置" subtitle="管理界面偏好与本地数据位置"><el-button type="primary" :loading="saving" @click="save">保存设置</el-button></PageHeader><el-alert v-if="!isTauriRuntime()" title="当前是界面预览；设置持久化仅在 Windows 客户端内启用。" type="info" show-icon :closable="false"/>
<div class="settings-grid"><AppCard class="settings-card"><h2>个人偏好</h2><el-form label-position="top"><el-form-item label="称呼"><el-input v-model="form.userName" maxlength="20"/></el-form-item><el-form-item label="界面主题"><el-segmented v-model="form.theme" :options="[{label:'浅色',value:'light'},{label:'深色',value:'dark'}]"/></el-form-item></el-form></AppCard><AppCard class="settings-card"><h2>本地数据</h2><p>数据库、附件和应用设置都保存在本机，不会上传云端。</p><label class="path-label">数据库目录</label><div class="path-box"><code>{{ databaseDirectory }}</code><el-button :icon="FolderOpened" :disabled="!isTauriRuntime()" @click="openPath(databaseDirectory)">打开</el-button></div><label class="path-label">附件目录</label><div class="path-box"><code>{{ attachmentDirectory }}</code><el-button :icon="FolderOpened" :disabled="!isTauriRuntime()" @click="openPath(attachmentDirectory)">打开</el-button></div><dl><div><dt>数据库</dt><dd>job_manager.db</dd></div><div><dt>存储方式</dt><dd>SQLite，外键约束已开启</dd></div></dl></AppCard></div></div></template>
<style scoped lang="scss">.page-stack{display:grid;gap:16px}.settings-grid{display:grid;grid-template-columns:minmax(320px,.7fr) minmax(480px,1.3fr);gap:14px}.settings-card{padding:22px}.settings-card h2{margin:0 0 18px;font-size:16px}.settings-card>p{color:var(--text-secondary);line-height:1.7}.path-label{display:block;margin:14px 0 6px;color:var(--text-tertiary);font-size:12px}.path-box{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border-color);border-radius:7px;background:var(--bg-page)}.path-box code{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.settings-card dl{display:grid;gap:12px;margin:20px 0 0}.settings-card dl div{display:flex;justify-content:space-between;border-bottom:1px solid var(--border-color);padding-bottom:10px}.settings-card dt{color:var(--text-secondary)}.settings-card dd{margin:0}@media(max-width:1000px){.settings-grid{grid-template-columns:1fr}}</style>
