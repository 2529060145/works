<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Bell, Briefcase, Calendar, CollectionTag, DataAnalysis, Download, Files,
  OfficeBuilding, Setting, Tickets, Upload, UserFilled,
} from '@element-plus/icons-vue'

defineProps<{
  title: string
  subtitle?: string
}>()

const route = useRoute()
const icon = computed(() => {
  const path = route.path
  if (path.startsWith('/companies')) return OfficeBuilding
  if (path.startsWith('/jobs')) return Briefcase
  if (path.startsWith('/progress')) return Tickets
  if (path.startsWith('/schedule')) return Calendar
  if (path.startsWith('/written-tests')) return Files
  if (path.startsWith('/interviews')) return UserFilled
  if (path.startsWith('/statistics')) return DataAnalysis
  if (path.startsWith('/tags')) return CollectionTag
  if (path.startsWith('/reminders')) return Bell
  if (path.startsWith('/data/import')) return Upload
  if (path.startsWith('/data/export')) return Download
  if (path.startsWith('/data/backup')) return Files
  return Setting
})
</script>

<template>
  <div class="page-header">
    <div class="title-group">
      <span class="page-icon"><el-icon><component :is="icon" /></el-icon></span>
      <div>
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <div class="page-actions">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;

  &::after {
    position: absolute;
    right: 0;
    bottom: -10px;
    left: 0;
    height: 1px;
    background: linear-gradient(90deg, var(--border-color), transparent 72%);
    content: '';
  }

  h1 {
    margin: 0;
    color: var(--text-primary);
    font-size: 26px;
    font-weight: 700;
    line-height: 1.25;
  }

  p {
    margin: 7px 0 0;
    color: var(--text-secondary);
    font-size: 14px;
  }
}

.page-header { position: relative; }

.title-group {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 13px;
}

.page-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  border: 1px solid rgba(79, 110, 247, 0.2);
  border-radius: 8px;
  color: #fff;
  background: var(--primary);
  box-shadow: 0 8px 18px rgba(79, 110, 247, 0.2);

  .el-icon { font-size: 20px; }
}

.page-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
}
</style>
