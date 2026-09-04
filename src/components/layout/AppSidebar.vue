<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, ArrowRight, Briefcase, Document, Expand, Fold, User } from '@element-plus/icons-vue'
import { dataNavItems, primaryNavItems } from '../../constants/routes'
import { useAppStore } from '../../stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const profileExpanded = ref(route.path.startsWith('/profile'))

const activePath = computed(() => {
  if (route.path.startsWith('/jobs')) return '/jobs'
  if (route.path.startsWith('/companies')) return '/companies'
  if (route.path.startsWith('/data/import')) return '/data/import'
  if (route.path.startsWith('/data/export')) return '/data/export'
  if (route.path.startsWith('/data/backup')) return '/data/backup'
  return route.path
})

watch(() => route.path, (path) => {
  if (path.startsWith('/profile')) profileExpanded.value = true
})

function navigate(path: string) {
  router.push(path)
}


function toggleProfile() {
  if (appStore.sidebarCollapsed) {
    router.push('/profile/basic')
    return
  }
  profileExpanded.value = !profileExpanded.value
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
    <div class="brand">
      <div class="brand-mark">
        <el-icon><Briefcase /></el-icon>
      </div>
      <div v-if="!appStore.sidebarCollapsed" class="brand-text">
        <strong>求职投递管理</strong>
        <span>你的求职小助手</span>
      </div>
    </div>

    <el-scrollbar class="nav-scroll">
      <nav class="nav-group">
        <button
          v-for="item in primaryNavItems"
          :key="item.path"
          class="nav-item"
          :class="{ active: activePath === item.path }"
          type="button"
          @click="navigate(item.path)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span v-if="!appStore.sidebarCollapsed">{{ item.label }}</span>
        </button>
      </nav>


      <nav class="nav-group profile-nav">
        <button
          class="nav-item profile-parent"
          :class="{ active: activePath.startsWith('/profile') }"
          type="button"
          @click="toggleProfile"
        >
          <el-icon><User /></el-icon>
          <span v-if="!appStore.sidebarCollapsed">个人资料与简历</span>
          <el-icon v-if="!appStore.sidebarCollapsed" class="profile-arrow">
            <component :is="profileExpanded ? ArrowDown : ArrowRight" />
          </el-icon>
        </button>
        <div v-if="profileExpanded && !appStore.sidebarCollapsed" class="profile-children">
          <button
            class="profile-child"
            :class="{ active: activePath === '/profile/basic' }"
            type="button"
            @click="navigate('/profile/basic')"
          >
            <el-icon><User /></el-icon><span>我的资料</span>
          </button>
          <button
            class="profile-child"
            :class="{ active: activePath === '/profile/materials' }"
            type="button"
            @click="navigate('/profile/materials')"
          >
            <el-icon><Document /></el-icon><span>证明材料</span>
          </button>
        </div>
      </nav>

      <div class="nav-divider">
        <span v-if="!appStore.sidebarCollapsed">数据管理</span>
      </div>

      <nav class="nav-group">
        <button
          v-for="item in dataNavItems"
          :key="item.path"
          class="nav-item"
          :class="{ active: activePath === item.path }"
          type="button"
          @click="navigate(item.path)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span v-if="!appStore.sidebarCollapsed">{{ item.label }}</span>
        </button>
      </nav>
    </el-scrollbar>

    <div class="sidebar-footer">
      <button class="collapse-btn" type="button" @click="appStore.toggleSidebar()">
        <el-icon><component :is="appStore.sidebarCollapsed ? Expand : Fold" /></el-icon>
      </button>
      <span v-if="!appStore.sidebarCollapsed">v0.2.0</span>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.sidebar {
  display: flex;
  width: 210px;
  height: 100vh;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--border-color);
  background: var(--bg-card);
  transition: width 180ms ease;
}

.sidebar.collapsed {
  width: 64px;

  .nav-item,
  .collapse-btn {
    justify-content: center;
  }
}

.brand {
  display: flex;
  min-height: 76px;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.brand-mark {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  background: var(--primary);
  box-shadow: 0 10px 22px rgba(91, 92, 226, 0.24);
}

.brand-text {
  min-width: 0;

  strong,
  span {
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  strong {
    color: var(--text-primary);
    font-size: 18px;
    font-weight: 700;
    line-height: 1.4;
  }

  span {
    color: #7b879d;
    font-size: 13px;
    font-weight: 400;
  }
}

.nav-scroll {
  min-height: 0;
  flex: 1;
}

.nav-group {
  display: grid;
  gap: 4px;
  padding: 4px 10px;
}

.nav-item {
  display: flex;
  width: 100%;
  height: 46px;
  align-items: center;
  gap: 13px;
  border: 0;
  border-radius: 10px;
  padding: 0 15px;
  color: #52617a;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  text-align: left;
  transition:
    background 160ms ease,
    color 160ms ease,
    transform 160ms ease;

  .el-icon {
    flex: 0 0 auto;
    color: #71819b;
    font-size: 19px;
  }

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &:hover {
    color: var(--primary);
    background: var(--primary-tint);

    .el-icon { color: var(--primary); }
  }

  &.active {
    color: var(--primary);
    background: #eef2ff;
    font-weight: 600;

    .el-icon { color: var(--primary); }
  }
}

.nav-divider {
  margin: 14px 16px 8px;
  border-top: 1px solid var(--border-color);

  span {
    display: inline-block;
    margin-top: 12px;
    color: #8491a7;
    font-size: 13px;
    font-weight: 500;
  }
}

.profile-nav {
  margin-top: 4px;
}

.profile-parent .profile-arrow {
  margin-left: auto;
  font-size: 14px;
}

.profile-children {
  display: grid;
  gap: 3px;
  margin: 0 0 4px 24px;
  padding-left: 9px;
  border-left: 2px solid #d9d2ff;
}

.profile-child {
  display: flex;
  width: 100%;
  height: 38px;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 8px;
  padding: 0 11px;
  color: #667085;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  text-align: left;

  .el-icon { font-size: 16px; }

  &:hover,
  &.active {
    color: #6254d9;
    background: #f0edff;
  }

  &.active { font-weight: 600; }
}

.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 16px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.collapse-btn {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-secondary);
  background: var(--bg-card);
  cursor: pointer;
  transition:
    color 160ms ease,
    border-color 160ms ease;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
}
</style>
