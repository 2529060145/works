<template>
  <section class="app-card">
    <slot />
  </section>
</template>

<style scoped lang="scss">
.app-card {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-large);
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
  transition:
    box-shadow 180ms ease,
    transform 180ms ease;
}

.app-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}
</style>
