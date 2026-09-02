<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="empty-state">
    <div class="empty-mark" aria-hidden="true"></div>
    <h2>{{ title }}</h2>
    <p v-if="description">{{ description }}</p>
  </div>
</template>

<style scoped lang="scss">
.empty-state {
  display: flex;
  min-height: 320px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-large);
  background: rgba(255, 255, 255, 0.62);
  color: var(--text-secondary);
  text-align: center;
}

.empty-mark {
  width: 78px;
  height: 78px;
  margin-bottom: 18px;
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(91, 92, 226, 0.95), rgba(34, 181, 115, 0.78)),
    radial-gradient(circle at 24px 24px, rgba(255, 255, 255, 0.6), transparent 28px);
  box-shadow: 0 18px 36px rgba(91, 92, 226, 0.2);
}

h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
}

p {
  max-width: 440px;
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.7;
}
</style>
