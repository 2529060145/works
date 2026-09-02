<script setup lang="ts">
defineProps<{
  title: string
  value: number | string
  description: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
}>()
</script>

<template>
  <button class="stat-card" :class="tone ?? 'primary'" type="button">
    <span class="stat-icon" aria-hidden="true"></span>
    <span class="stat-title">{{ title }}</span>
    <strong>{{ value }}</strong>
    <small>{{ description }}</small>
  </button>
</template>

<style scoped lang="scss">
.stat-card {
  display: grid;
  min-width: 0;
  gap: 8px;
  padding: 16px;
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
  width: 34px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
}

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
