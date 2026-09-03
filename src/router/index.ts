import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '../components/layout/MainLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'home',
        component: () => import('../views/dashboard/DashboardView.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'dashboard',
        redirect: '/home',
      },
      {
        path: 'jobs',
        name: 'jobs',
        component: () => import('../views/jobs/JobsView.vue'),
        meta: { title: '岗位库' },
      },
      {
        path: 'jobs/:id',
        name: 'job-detail',
        component: () => import('../views/jobs/JobDetailView.vue'),
        meta: { title: '岗位详情', hiddenInMenu: true },
      },
      {
        path: 'companies',
        name: 'companies',
        component: () => import('../views/companies/CompaniesView.vue'),
        meta: { title: '企业管理' },
      },
      {
        path: 'companies/:id',
        name: 'company-detail',
        component: () => import('../views/companies/CompanyDetailView.vue'),
        meta: { title: '企业详情', hiddenInMenu: true },
      },
      {
        path: 'progress',
        name: 'progress',
        component: () => import('../views/progress/ProgressView.vue'),
        meta: { title: '投递进度' },
      },
      {
        path: 'schedule',
        name: 'schedule',
        component: () => import('../views/schedule/ScheduleView.vue'),
        meta: { title: '日程安排' },
      },
      {
        path: 'written-tests',
        name: 'written-tests',
        component: () => import('../views/written-tests/WrittenTestsView.vue'),
        meta: { title: '笔试管理' },
      },
      {
        path: 'interviews',
        name: 'interviews',
        component: () => import('../views/interviews/InterviewsView.vue'),
        meta: { title: '面试管理' },
      },
      {
        path: 'statistics',
        name: 'statistics',
        component: () => import('../views/statistics/StatisticsView.vue'),
        meta: { title: '数据统计' },
      },
      {
        path: 'tags',
        name: 'tags',
        component: () => import('../views/tags/TagsView.vue'),
        meta: { title: '标签管理' },
      },
      {
        path: 'reminders',
        name: 'reminders',
        component: () => import('../views/reminders/RemindersView.vue'),
        meta: { title: '提醒中心' },
      },
      {
        path: 'data/import',
        name: 'excel-import',
        component: () => import('../views/data/ExcelImportView.vue'),
        meta: { title: 'Excel 导入' },
      },
      {
        path: 'data/export',
        name: 'excel-export',
        component: () => import('../views/data/ExcelExportView.vue'),
        meta: { title: 'Excel 导出' },
      },
      {
        path: 'data/backup',
        name: 'backup',
        component: () => import('../views/data/BackupView.vue'),
        meta: { title: '备份与恢复' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../views/settings/SettingsView.vue'),
        meta: { title: '系统设置' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.afterEach((to) => {
  document.title = `${String(to.meta.title ?? '首页')} - 求职投递管理`
})

export default router
