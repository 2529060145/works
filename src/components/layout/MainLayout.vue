<script setup lang="ts">
import { onMounted } from 'vue'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import { isTauriRuntime } from '../../services/databaseService'
import { countReminders } from '../../services/reminderService'
import { getSettings } from '../../services/settingsService'
import { useReminderStore } from '../../stores/reminder'
import { useSettingsStore } from '../../stores/settings'

const reminderStore=useReminderStore(),settingsStore=useSettingsStore()
onMounted(async()=>{
  if(!isTauriRuntime()){settingsStore.applyTheme();return}
  try {
    const [settings,count]=await Promise.all([getSettings(),countReminders()])
    settingsStore.userName=settings.user_name||'用户'
    settingsStore.theme=settings.theme==='dark'?'dark':'light'
    settingsStore.applyTheme()
    reminderStore.setUnreadCount(count)
  } catch (error) {
    console.error('Application settings failed to load', error)
  }
})
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <section class="app-main">
      <AppHeader />
      <main class="app-content">
        <router-view />
      </main>
    </section>
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  display: flex;
  height: 100vh;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--bg-page);
}

.app-main {
  display: flex;
  height: 100vh;
  min-width: 0;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.app-content {
  min-width: 0;
  min-height: 0;
  flex: 1;
  padding: 24px;
  overflow-x: auto;
  overflow-y: scroll;
  overscroll-behavior: contain;
}

@media (max-width: 960px) {
  .app-content {
    padding: 18px;
  }
}
</style>
