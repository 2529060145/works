import { defineStore } from 'pinia'

export const useReminderStore = defineStore('reminder', {
  state: () => ({
    unreadCount: 0,
  }),
  actions: {
    setUnreadCount(count: number) {
      this.unreadCount = count
    },
  },
})
