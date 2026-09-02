import { defineStore } from 'pinia'
import { isTauriRuntime } from '../services/databaseService'
import { setSetting } from '../services/settingsService'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    userName: '用户',
    theme: 'light' as 'light' | 'dark',
  }),
  actions: {
    async toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      document.documentElement.dataset.theme = this.theme
      if (isTauriRuntime()) await setSetting('theme', this.theme)
    },
    applyTheme() {
      document.documentElement.dataset.theme = this.theme
    },
  },
})
