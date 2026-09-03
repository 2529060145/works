import { expect, test } from '@playwright/test'

test('recruitment workflow enforces one active node and unlocks the next after passing', async ({ page }) => {
  test.setTimeout(45_000)
  await page.addInitScript(() => {
    const runtime = window as typeof window & {
      __node: Record<string, unknown>
      __TAURI_INTERNALS__: { invoke: (command: string, args: Record<string, any>) => Promise<any> }
    }
    runtime.__node = {
      key: 'written-1', id: 1, jobId: 7, nodeType: 'WRITTEN_TEST', label: '第1次笔试', sequenceNo: 1,
      scheduledAt: '2026-09-10 14:30:00', timeTbd: 0, form: 'ONLINE', location: '线上',
      meetingUrl: 'https://example.com/test', status: 'SCHEDULED', result: 'PENDING', createdAt: '2026-09-03 10:00:00',
    }
    runtime.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      const query = String(args?.query ?? '')
      if (command === 'database_execute') return { rowsAffected: 1, lastInsertId: 1 }
      if (command === 'database_transaction') {
        const statement = args.statements?.[0]
        if (String(statement?.query).includes('SET status=?,result=?')) {
          runtime.__node.status = statement.values[0]
          runtime.__node.result = statement.values[1]
        }
        return { rowsAffected: 1, lastInsertId: 1 }
      }
      if (command !== 'database_select') return null
      if (query.includes('PRAGMA table_info(companies)')) return [{ name: 'application_limit_type' }, { name: 'max_applications' }]
      if (query.includes('PRAGMA table_info(applications)')) return [{ name: 'result_reason' }, { name: 'submitted_at' }]
      if (query.includes('PRAGMA table_info(written_tests)')) return [{ name: 'sequence_no' }, { name: 'time_tbd' }, { name: 'test_type' }, { name: 'meeting_url' }]
      if (query.includes('PRAGMA table_info(interviews)')) return [{ name: 'time_tbd' }, { name: 'interview_type' }, { name: 'meeting_url' }, { name: 'interviewer' }]
      if (query.includes('WHERE a.stage IN')) return [
        { jobId: 7, companyId: 3, companyName: '流程测试企业', jobName: '软件工程师', location: '青岛', stage: 'PROCESS', submittedAt: '2026-09-03 09:20:00', result: 'PENDING' },
        { jobId: 8, companyId: 3, companyName: '流程测试企业', jobName: '算法工程师', location: '济南', stage: 'PROCESS', submittedAt: '2026-09-03 10:20:00', result: 'PENDING' },
      ]
      if (query.includes('SELECT * FROM (')) return args.values?.[0] === 7 ? [runtime.__node] : []
      if (query.includes('SELECT stage FROM applications')) return [{ stage: 'PROCESS' }]
      if (query.includes('FROM jobs j') && query.includes('WHERE a.stage')) return [{ id: 7, companyName: '流程测试企业', jobName: '软件工程师' }]
      return []
    } }
  })

  await page.goto('/workflow')
  await expect(page.getByText('流程测试企业', { exact: true })).toBeVisible()
  await expect(page.getByText('共 2 个岗位', { exact: true })).toBeVisible()
  await expect(page.getByText('软件工程师', { exact: true })).toBeVisible()
  await expect(page.getByText('算法工程师', { exact: true })).toBeVisible()
  await expect(page.getByText('第1次笔试', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: '添加下一步' })).toBeDisabled()
  await page.screenshot({ path: 'test-artifacts/recruitment-workflow-grouped-v0.1.10.png', fullPage: true })

  await page.getByRole('button', { name: '完成', exact: true }).click()
  const resultSelect = page.locator('.actions .el-select')
  await expect(resultSelect).toBeVisible()
  await resultSelect.click()
  await page.getByText('通过', { exact: true }).click()
  await expect(page.getByRole('button', { name: '添加下一步' })).toBeEnabled()

  await page.getByRole('button', { name: '添加下一步' }).click()
  await page.locator('.el-dropdown-menu:visible').getByText('二面', { exact: true }).click()
  await expect(page.getByRole('dialog', { name: '安排面试' })).toBeVisible()
})

test('failed workflow moves to history and can be safely undone or restored', async ({ page }) => {
  test.setTimeout(45_000)
  await page.addInitScript(() => {
    const runtime = window as typeof window & {
      __job: Record<string, any>
      __node: Record<string, any>
      __TAURI_INTERNALS__: { invoke: (command: string, args: Record<string, any>) => Promise<any> }
    }
    runtime.__job = { jobId: 11, companyId: 4, companyName: '纠错测试企业', jobName: '后端开发工程师', location: '济南', stage: 'REJECTED', submittedAt: '2026-09-03 09:20:00', result: 'FAILED' }
    runtime.__node = { key: 'interview-2', id: 2, jobId: 11, nodeType: 'INTERVIEW', label: '一面', round: 'FIRST', scheduledAt: '2026-09-08 14:00:00', timeTbd: 0, form: 'ONLINE', status: 'COMPLETED', result: 'FAILED', createdAt: '2026-09-03 10:00:00' }
    runtime.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      const query = String(args?.query ?? '')
      if (command === 'database_execute') return { rowsAffected: 1, lastInsertId: 1 }
      if (command === 'database_transaction') {
        for (const statement of args.statements ?? []) {
          const sql = String(statement.query)
          if (sql.includes("result='PENDING'") && sql.includes('WHERE id=')) { runtime.__node.status = 'COMPLETED'; runtime.__node.result = 'PENDING' }
          if (sql.includes("status='CANCELLED'")) { runtime.__node.status = 'CANCELLED'; runtime.__node.result = 'CANCELLED' }
          if (sql.includes("stage='PROCESS'")) { runtime.__job.stage = 'PROCESS'; runtime.__job.result = 'PENDING' }
          if (sql.includes("stage='APPLIED'")) { runtime.__job.stage = 'APPLIED'; runtime.__job.result = 'PENDING' }
        }
        return { rowsAffected: 1, lastInsertId: 1 }
      }
      if (command !== 'database_select') return null
      if (query.includes('PRAGMA table_info(companies)')) return [{ name: 'application_limit_type' }, { name: 'max_applications' }]
      if (query.includes('PRAGMA table_info(applications)')) return [{ name: 'result_reason' }, { name: 'submitted_at' }]
      if (query.includes('PRAGMA table_info(written_tests)')) return [{ name: 'sequence_no' }, { name: 'time_tbd' }, { name: 'test_type' }, { name: 'meeting_url' }]
      if (query.includes('PRAGMA table_info(interviews)')) return [{ name: 'time_tbd' }, { name: 'interview_type' }, { name: 'meeting_url' }, { name: 'interviewer' }]
      if (query.includes('WHERE a.stage IN')) return runtime.__job.stage === 'APPLIED' ? [] : [runtime.__job]
      if (query.includes('SELECT * FROM (')) return [runtime.__node]
      return []
    } }
  })

  await page.goto('/workflow')
  await expect(page.getByText('纠错测试企业', { exact: true })).toHaveCount(0)
  await page.getByText('历史结果', { exact: true }).click()
  await expect(page.getByText('纠错测试企业', { exact: true })).toBeVisible()
  await expect(page.getByText('未通过', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '撤回未通过' }).click()
  await page.getByRole('button', { name: '确认撤回' }).click()
  await expect(page.getByText('等待结果', { exact: true })).toBeVisible()

  await page.getByTitle('更多操作').click()
  await page.getByText('恢复为已投递', { exact: true }).click()
  await page.getByRole('button', { name: '确认恢复' }).click()
  await expect(page.getByText('纠错测试企业', { exact: true })).toHaveCount(0)
})
