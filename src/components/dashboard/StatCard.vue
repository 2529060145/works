<script setup lang="ts">
import type { Component } from 'vue'
defineProps<{
  title: string
  value: number | string
  description: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  icon: Component
}>()
</script>

<template>
  <button class="stat-card" :class="tone ?? 'primary'" type="button">
    <span class="stat-icon" aria-hidden="true"><el-icon><component :is="icon" /></el-icon></span>
    <span class="stat-copy"><span class="stat-title">{{ title }}</span><strong>{{ value }}</strong><small>{{ description }}</small></span>
  </button>
</template>

<style scoped lang="scss">
.stat-card {
  display: flex;
  min-width: 0;
  min-height: 116px;
  align-items: flex-start;
  gap: 13px;
  padding: 17px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-large);
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  text-align: left;
  transition:
    box-shadow 180ms ease,
    transform 180ms ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-card-hover);
  }
}

.stat-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  border-radius: 8px;
  background: color-mix(in srgb, currentColor 12%, var(--bg-card));

  .el-icon { font-size: 22px; }
}

.stat-copy { display: grid; min-width: 0; gap: 7px; }

.stat-title {
  color: var(--text-secondary);
  font-size: 13px;
}

strong {
  color: var(--text-primary);
  font-size: 28px;
  line-height: 1;
}

small {
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.primary {
  color: var(--primary);
}

.success {
  color: var(--success);
}

.warning {
  color: var(--warning);
}

.danger {
  color: var(--danger);
}

.info {
  color: var(--info);
}

.purple {
  color: var(--purple);
}
</style>
