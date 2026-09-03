import { expect, test } from '@playwright/test'

test('legacy applied jobs without a date can update a color-coded result', async ({ page }) => {
  await page.addInitScript(() => {
    const runtime = window as typeof window & {
      __mockJob: Record<string, unknown>
      __TAURI_INTERNALS__: { invoke: (command: string, args: { query?: string; values?: unknown[] }) => Promise<unknown> }
    }
    runtime.__mockJob = {
      id: 1, companyId: 1, companyName: '旧数据测试企业', jobName: '软件开发工程师',
      location: '青岛', recruitmentBatch: '2027届校招', salaryText: '10K-15K', deadline: '2026-10-31',
      stage: 'APPLIED', applicationDate: null, result: 'PENDING', resultReason: null,
      applicationLimitType: 'UNKNOWN', companyAppliedCount: 1,
      createdAt: '2026-09-03', updatedAt: '2026-09-03',
    }
    runtime.__TAURI_INTERNALS__ = {
      invoke: async (command, args) => {
        const query = String(args?.query ?? '')
        if (command === 'database_execute') {
          if (query.includes('UPDATE applications SET result=')) {
            runtime.__mockJob.result = args.values?.[0]
            runtime.__mockJob.resultReason = args.values?.[1]
            runtime.__mockJob.stage = args.values?.[2]
            runtime.__mockJob.applicationDate = '2026-09-03'
          }
          return { rowsAffected: 1, lastInsertId: 1 }
        }
        if (command !== 'database_select') return null
        if (query.includes('PRAGMA table_info(companies)')) return [{ name: 'application_limit_type' }, { name: 'max_applications' }]
        if (query.includes('PRAGMA table_info(applications)')) return [{ name: 'result_reason' }]
        if (query.includes('c.company_type AS "companyType"')) return [runtime.__mockJob]
        if (query.includes('SELECT DISTINCT')) return []
        if (query.includes('SELECT stage FROM applications')) return [{ stage: runtime.__mockJob.stage }]
        if (query.includes('EXISTS(SELECT 1 FROM interviews')) return [{ hasInterview: 0, hasWrittenTest: 0 }]
        return []
      },
    }
  })

  await page.goto('/jobs')
  await expect(page.getByText('旧数据测试企业', { exact: true })).toBeVisible()
  const resultSelect = page.locator('.result-select')
  await expect(resultSelect).toHaveCount(1)
  await expect(resultSelect).toHaveClass(/result-teal/)

  await resultSelect.click()
  await page.getByText('未通过', { exact: true }).click()
  const reasonInput = page.getByPlaceholder('例如：专业不匹配、笔试未通过、面试反馈不足')
  await expect(reasonInput).toBeVisible()
  await page.getByRole('button', { name: '保存结果' }).click()
  await expect(page.getByText('请填写未通过原因', { exact: true })).toBeVisible()
  await reasonInput.fill('笔试未通过')
  await page.getByRole('button', { name: '保存结果' }).click()

  await expect(page.getByText('投递结果已更新为“未通过”', { exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(resultSelect).toHaveClass(/result-danger/)
  await page.screenshot({ path: 'test-artifacts/jobs-result-fixed-v0.1.6.png' })
})
