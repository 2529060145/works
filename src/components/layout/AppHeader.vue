<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Bell, Calendar, Moon, Search, User } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { useSettingsStore } from '../../stores/settings'
import { useReminderStore } from '../../stores/reminder'

const appStore = useAppStore()
const settingsStore = useSettingsStore()
const router = useRouter()
const reminderStore = useReminderStore()
const searchInput = ref<HTMLInputElement>()

function handleShortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchInput.value?.focus()
  }
}

function submitSearch() {
  const keyword = appStore.globalKeyword.trim()
  router.push({ path: '/jobs', query: keyword ? { q: keyword } : {} })
}

onMounted(() => window.addEventListener('keydown', handleShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', handleShortcut))
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <div class="global-search">
        <el-icon><Search /></el-icon>
        <input
          ref="searchInput"
          :value="appStore.globalKeyword"
          placeholder="搜索企业、岗位、地点..."
          type="search"
          @input="appStore.setGlobalKeyword(($event.target as HTMLInputElement).value)"
          @keyup.enter="submitSearch"
        />
        <kbd>Ctrl K</kbd>
      </div>
      <span class="client-state">本地运行</span>
    </div>

    <div class="header-actions">
      <el-tooltip content="提醒" placement="bottom">
        <el-badge :value="reminderStore.unreadCount" :hidden="!reminderStore.unreadCount">
        <button class="icon-button" type="button" aria-label="提醒" title="提醒" @click="router.push('/reminders')">
          <el-icon><Bell /></el-icon>
        </button>
        </el-badge>
      </el-tooltip>
      <el-tooltip content="日程" placement="bottom">
        <button class="icon-button" type="button" aria-label="日程" title="日程" @click="router.push('/schedule')">
          <el-icon><Calendar /></el-icon>
        </button>
      </el-tooltip>
      <el-tooltip content="主题" placement="bottom">
        <button class="icon-button" type="button" aria-label="主题" title="主题" @click="settingsStore.toggleTheme()">
          <el-icon><Moon /></el-icon>
        </button>
      </el-tooltip>
      <div class="user-chip">
        <el-icon><User /></el-icon>
        <span>你好，{{ settingsStore.userName }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.app-header {
  display: flex;
  height: 68px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 24px;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-page) 88%, transparent);
  backdrop-filter: blur(14px);
}

.header-left {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.global-search {
  display: flex;
  width: min(520px, 48vw);
  height: 42px;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-tertiary);
  background: var(--bg-card);
  box-shadow: 0 6px 18px rgba(17, 24, 39, 0.04);

  input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: 0;
    color: var(--text-primary);
    background: transparent;
    font: inherit;

    &::placeholder {
      color: var(--text-tertiary);
    }
  }

  kbd {
    padding: 3px 7px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-tertiary);
    background: var(--bg-page);
    font-size: 11px;
  }
}

.client-state {
  display: inline-flex;
  height: 32px;
  flex: 0 0 auto;
  align-items: center;
  border: 1px solid rgba(34, 181, 115, 0.2);
  border-radius: 999px;
  padding: 0 11px;
  color: var(--success);
  background: rgba(34, 181, 115, 0.08);
  font-size: 12px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
}

.icon-button,
.user-chip {
  display: inline-flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-secondary);
  background: var(--bg-card);
}

.icon-button {
  width: 38px;
  cursor: pointer;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
    transform: translateY(-1px);
  }
}

.user-chip {
  gap: 8px;
  padding: 0 12px;
  font-size: 14px;
}

@media (max-width: 900px) {
  .app-header {
    padding: 0 16px;
  }

  .global-search {
    width: 100%;

    kbd {
      display: none;
    }
  }

  .client-state {
    display: none;
  }

  .user-chip span {
    display: none;
  }
}
</style>
