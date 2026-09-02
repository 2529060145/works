<script setup lang="ts">
defineProps<{
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}>()
</script>

<template>
  <span class="status-tag" :class="type ?? 'primary'">
    <slot />
  </span>
</template>

<style scoped lang="scss">
.status-tag {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
}

.primary {
  color: var(--primary);
  background: var(--primary-tint);
}

.success {
  color: var(--success);
  background: rgba(34, 181, 115, 0.12);
}

.warning {
  color: var(--warning);
  background: rgba(255, 159, 67, 0.14);
}

.danger {
  color: var(--danger);
  background: rgba(239, 91, 91, 0.12);
}

.info {
  color: var(--info);
  background: rgba(59, 130, 246, 0.12);
}
</style>
