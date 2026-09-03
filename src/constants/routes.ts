import {
  Bell,
  Briefcase,
  Calendar,
  Coin,
  DataAnalysis,
  DocumentAdd,
  Download,
  Files,
  House,
  OfficeBuilding,
  Setting,
  SuitcaseLine,
  Tickets,
  Upload,
} from '@element-plus/icons-vue'

export interface NavItem {
  path: string
  label: string
  icon: unknown
}

export const primaryNavItems: NavItem[] = [
  { path: '/home', label: '首页', icon: House },
  { path: '/jobs', label: '岗位库', icon: Briefcase },
  { path: '/companies', label: '企业管理', icon: OfficeBuilding },
  { path: '/progress', label: '投递进度', icon: SuitcaseLine },
  { path: '/schedule', label: '日程安排', icon: Calendar },
  { path: '/written-tests', label: '笔试管理', icon: Tickets },
  { path: '/interviews', label: '面试管理', icon: DocumentAdd },
  { path: '/statistics', label: '数据统计', icon: DataAnalysis },
  { path: '/tags', label: '标签管理', icon: Files },
  { path: '/reminders', label: '提醒中心', icon: Bell },
  { path: '/settings', label: '系统设置', icon: Setting },
]

export const dataNavItems: NavItem[] = [
  { path: '/data/import', label: 'Excel 导入', icon: Upload },
  { path: '/data/export', label: 'Excel 导出', icon: Download },
  { path: '/data/backup', label: '备份与恢复', icon: Coin },
]
