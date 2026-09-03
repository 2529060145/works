import { expect, test } from '@playwright/test'

function installDatabaseMock(page: import('@playwright/test').Page, mode: 'schedule' | 'timeline') {
  return page.addInitScript(selectedMode => {
    const runtime = window as typeof window & {
      __TAURI_INTERNALS__: { invoke: (command: string, args: Record<string, any>) => Promise<any> }
    }
    const columns = {
      companies: [{ name: 'application_limit_type' }, { name: 'max_applications' }],
      applications: [{ name: 'result_reason' }, { name: 'submitted_at' }],
      written_tests: [{ name: 'sequence_no' }, { name: 'time_tbd' }, { name: 'test_type' }, { name: 'meeting_url' }],
      interviews: [{ name: 'time_tbd' }, { name: 'interview_type' }, { name: 'meeting_url' }, { name: 'interviewer' }],
    }
    const events = [
      { key: 'interview-1', id: 1, jobId: 7, nodeType: 'INTERVIEW', label: '一面', round: 'FIRST', scheduledAt: '2026-09-03 14:00:00', timeTbd: 0, form: 'ONLINE', status: 'COMPLETED', result: 'PASSED', createdAt: '2026-09-01 10:00:00' },
      { key: 'interview-2', id: 2, jobId: 7, nodeType: 'INTERVIEW', label: '二面', round: 'SECOND', scheduledAt: '2026-09-03 16:00:00', timeTbd: 0, form: 'ONLINE', status: 'COMPLETED', result: 'FAILED', createdAt: '2026-09-02 10:00:00' },
      { key: 'written-1', id: 3, jobId: 7, nodeType: 'WRITTEN_TEST', label: '第1次笔试', sequenceNo: 1, scheduledAt: '2026-09-03 19:00:00', timeTbd: 0, form: 'ONLINE', status: 'SCHEDULED', result: 'PENDING', createdAt: '2026-09-03 10:00:00' },
    ]
    runtime.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      const query = String(args?.query ?? '')
      if (command === 'database_execute') return { rowsAffected: 1, lastInsertId: 1 }
      if (command !== 'database_select') return null
      for (const [table, result] of Object.entries(columns)) if (query.includes(`PRAGMA table_info(${table})`)) return result
      if (selectedMode === 'schedule' && query.includes("'WRITTEN_TEST'") && query.includes("'INTERVIEW'") && query.includes('date("scheduledAt")')) return [
        { id: 'interview-1', jobId: 7, companyName: '日程测试企业', jobName: '面试岗位', eventType: 'INTERVIEW', eventLabel: '一面', scheduledAt: '2026-09-03 14:00:00', timeTbd: 0 },
        { id: 'written-1', jobId: 8, companyName: '日程测试企业', jobName: '笔试岗位', eventType: 'WRITTEN_TEST', eventLabel: '第1次笔试', scheduledAt: '2026-09-03 19:00:00', timeTbd: 0 },
      ]
      if (selectedMode === 'timeline' && query.includes('WHERE j.id=?')) return [{ id: 7, companyId: 2, companyName: '流程测试企业', jobName: '研发工程师', location: '青岛', stage: 'PROCESS', result: 'PENDING', applicationLimitType: 'UNKNOWN', companyAppliedCount: 1 }]
      if (selectedMode === 'timeline' && query.includes('WHERE a.job_id=?')) return [{ id: 1, jobId: 7, stage: 'PROCESS', result: 'PENDING', applicationDate: '2026-09-01', submittedAt: '2026-09-01 09:00:00' }]
      if (selectedMode === 'timeline' && query.includes('SELECT * FROM (') && query.includes('WHERE "jobId"=?')) return events
      return []
    } }
  }, mode)
}

test('today interview and written test remain visible on home and reminders', async ({ page }) => {
  test.setTimeout(45_000)
  await installDatabaseMock(page, 'schedule')
  await page.goto('/home')
  await expect(page.getByText('一面 · 面试岗位', { exact: true })).toBeVisible()
  await expect(page.getByText('第1次笔试 · 笔试岗位', { exact: true })).toBeVisible()

  await page.goto('/reminders')
  await expect(page.getByText('一面 · 面试岗位', { exact: true })).toBeVisible()
  await expect(page.getByText('第1次笔试 · 笔试岗位', { exact: true })).toBeVisible()
})

test('job workflow timeline colors nodes and connecting lines by state', async ({ page }) => {
  await installDatabaseMock(page, 'timeline')
  await page.goto('/jobs/7')
  const items = page.locator('.timeline-card .el-timeline-item')
  await expect(items).toHaveCount(3)
  await expect(items.nth(0)).toHaveClass(/workflow-passed/)
  await expect(items.nth(1)).toHaveClass(/workflow-failed/)
  await expect(items.nth(2)).toHaveClass(/workflow-scheduled/)
  const nodeColors = await page.locator('.timeline-card .el-timeline-item__node').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor))
  expect(new Set(nodeColors).size).toBeGreaterThanOrEqual(3)
  const lineColors = await page.locator('.timeline-card .el-timeline-item__tail').evaluateAll(lines => lines.map(line => getComputedStyle(line).borderLeftColor))
  expect(lineColors.every(color => color !== 'rgb(228, 231, 237)')).toBeTruthy()
  await page.screenshot({ path: 'test-artifacts/colored-job-timeline-v0.1.11.png', fullPage: true })
})
