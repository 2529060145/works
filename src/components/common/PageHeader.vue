<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="page-header">
    <div>
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
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

.page-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
}
</style>
