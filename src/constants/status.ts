import type { ApplicationResult, ApplicationStage } from '../types/application'

export const applicationStageLabels: Record<ApplicationStage, string> = {
  TO_APPLY: '待投递',
  APPLIED: '已投递',
  PROCESS: '面试/笔试',
  OFFER: 'Offer',
  REJECTED: '淘汰',
  WITHDRAWN: '主动放弃',
  UNSUITABLE: '不合适',
}

export const applicationResultLabels: Record<ApplicationResult, string> = {
  PENDING: '等待通知',
  PASSED: '通过',
  FAILED: '未通过',
  OFFER: 'Offer',
  WITHDRAWN: '主动放弃',
  JOB_CANCELLED: '岗位取消',
  COMPANY_TERMINATED: '企业终止招聘',
  UNSUITABLE: '不合适',
}

export const jobLibraryResultOptions = ([
  'PENDING', 'PASSED', 'FAILED', 'WITHDRAWN', 'JOB_CANCELLED', 'COMPANY_TERMINATED', 'UNSUITABLE',
] as ApplicationResult[]).map(value => ({ value, label: applicationResultLabels[value] }))

export function resultTone(result?: ApplicationResult): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'teal' {
  if (result === 'PASSED' || result === 'OFFER') return 'success'
  if (result === 'PENDING') return 'teal'
  if (result === 'FAILED' || result === 'JOB_CANCELLED' || result === 'COMPANY_TERMINATED') return 'danger'
  return 'info'
}

export const applicationStageOptions = Object.entries(applicationStageLabels).map(([value, label]) => ({
  value: value as ApplicationStage,
  label,
}))

export const applicationStageColors: Record<ApplicationStage, string> = {
  TO_APPLY: '#4F6FEA', APPLIED: '#43BFAE', PROCESS: '#8B7CF6',
  OFFER: '#36B77A', REJECTED: '#F26B67', WITHDRAWN: '#8796B5', UNSUITABLE: '#8796B5',
}

export function stageTone(stage?: ApplicationStage): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'teal' {
  if (stage === 'OFFER') return 'success'
  if (stage === 'REJECTED' || stage === 'UNSUITABLE' || stage === 'WITHDRAWN') return 'danger'
  if (stage === 'TO_APPLY') return 'primary'
  if (stage === 'APPLIED') return 'teal'
  if (stage === 'PROCESS') return 'purple'
  return 'info'
}
