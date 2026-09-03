import type { ApplicationResult, ApplicationStage } from '../types/application'

export const applicationStageLabels: Record<ApplicationStage, string> = {
  TO_APPLY: '待投递',
  APPLIED: '已投递',
  WRITTEN_TEST: '笔试',
  INTERVIEW: '面试',
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
  UNSUITABLE: '不合适',
}

export const applicationStageOptions = Object.entries(applicationStageLabels).map(([value, label]) => ({
  value: value as ApplicationStage,
  label,
}))

export const applicationStageColors: Record<ApplicationStage, string> = {
  TO_APPLY: '#4F6FEA', APPLIED: '#43BFAE', WRITTEN_TEST: '#8B7CF6', INTERVIEW: '#F5B84B',
  OFFER: '#36B77A', REJECTED: '#F26B67', WITHDRAWN: '#8796B5', UNSUITABLE: '#8796B5',
}

export function stageTone(stage?: ApplicationStage): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'teal' {
  if (stage === 'OFFER') return 'success'
  if (stage === 'REJECTED' || stage === 'UNSUITABLE' || stage === 'WITHDRAWN') return 'danger'
  if (stage === 'TO_APPLY') return 'primary'
  if (stage === 'APPLIED') return 'teal'
  if (stage === 'WRITTEN_TEST') return 'purple'
  if (stage === 'INTERVIEW') return 'warning'
  return 'info'
}
