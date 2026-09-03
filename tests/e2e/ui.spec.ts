import { expect, test } from '@playwright/test'

const routes = [
  ['/home', '今天是'], ['/jobs', '岗位库'], ['/companies', '企业管理'], ['/progress', '投递进度'],
  ['/schedule', '日程安排'], ['/written-tests', '笔试管理'], ['/interviews', '面试管理'],
  ['/statistics', '数据统计'], ['/tags', '标签管理'], ['/reminders', '提醒中心'],
  ['/data/import', 'Excel 导入'], ['/data/export', 'Excel 导出'], ['/data/backup', '备份与恢复'], ['/settings', '系统设置'],
] as const

test('all application routes render without runtime errors', async ({ page }) => {
  test.setTimeout(45_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for (const [path, text] of routes) {
    await page.goto(path)
    if (path === '/home') await expect(page.getByText(text, { exact: false }).first()).toBeVisible()
    else await expect(page.getByRole('heading', { name: text, exact: true })).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('home naming is consistent and the legacy dashboard route redirects', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('button', { name: '首页', exact: true })).toBeVisible()
  await expect(page.getByText('收录岗位', { exact: true })).toBeVisible()
  await expect(page.getByText('有效机会', { exact: true })).toBeVisible()
  await expect(page.getByText(/仪表盘|Dashboard/)).toHaveCount(0)
  await expect(page).toHaveTitle('首页 - 求职投递管理')
})

test('header search, navigation and theme controls work', async ({ page }) => {
  await page.goto('/home')
  const search = page.getByPlaceholder('搜索企业、岗位、地点...')
  await search.fill('软件开发')
  await search.press('Enter')
  await expect(page).toHaveURL(/\/jobs\?q=/)
  await expect(page.getByPlaceholder('搜索企业、岗位、地点、招聘批次...')).toHaveValue('软件开发')

  await page.getByTitle('提醒').click()
  await expect(page).toHaveURL(/\/reminders$/)
  await page.getByTitle('日程').click()
  await expect(page).toHaveURL(/\/schedule$/)
  await page.getByTitle('主题').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('company dialog opens and validates required fields and URLs', async ({ page }) => {
  await page.goto('/companies')
  await page.getByRole('button', { name: '新增企业' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('请输入企业名称')).toBeVisible()
  await expect(page.getByText('岗位投递限制')).toBeVisible()
  await expect(page.getByText('未知', { exact: true })).toBeVisible()
  await expect(page.getByText('不限制', { exact: true })).toBeVisible()
  await expect(page.getByText('最多投递', { exact: true })).toBeVisible()
  await page.getByLabel('企业名称').fill('测试企业')
  await page.getByLabel('官方网站').fill('invalid-url')
  await page.getByLabel('官方网站').press('Tab')
  await expect(page.getByText('网址必须以 http:// 或 https:// 开头')).toBeVisible()
})

test('progress board is view-only and exposes all filters', async ({ page }) => {
  await page.goto('/progress')
  await expect(page.getByPlaceholder('搜索企业或岗位')).toBeVisible()
  await expect(page.getByText('全部地区', { exact: true })).toBeVisible()
  await expect(page.getByText('全部批次', { exact: true })).toBeVisible()
  await expect(page.getByText('全部阶段', { exact: true })).toBeVisible()
  await expect(page.locator('.job-card .el-select')).toHaveCount(0)
})

test('schedule renders month calendar controls and dashboard exposes trend ranges', async ({ page }) => {
  await page.goto('/schedule')
  await expect(page.getByText('本月事件', { exact: true })).toBeVisible()
  await expect(page.getByText('有安排日期', { exact: true })).toBeVisible()
  await expect(page.getByText('截止提醒', { exact: true })).toBeVisible()
  await expect(page.getByTitle('上一个月')).toBeVisible()
  await expect(page.getByTitle('下一个月')).toBeVisible()
  expect(await page.locator('.day-cell').count()).toBeGreaterThanOrEqual(35)

  await page.goto('/home')
  await expect(page.getByText('求职趋势', { exact: true })).toBeVisible()
  await expect(page.getByText('7 天', { exact: true })).toBeVisible()
  await expect(page.getByText('30 天', { exact: true })).toBeVisible()
  await expect(page.getByText('90 天', { exact: true })).toBeVisible()
})

test('core add dialogs expose complete forms', async ({ page }) => {
  for (const [path, button, dialogName] of [
    ['/jobs', '新增岗位', '新增岗位'],
    ['/written-tests', '新增笔试', '新增笔试'],
    ['/interviews', '新增面试', '新增面试'],
  ]) {
    await page.goto(path)
    await page.getByRole('button', { name: button }).click()
    await expect(page.getByRole('dialog', { name: dialogName })).toBeVisible()
  }
})

test('job dialog supports inline company creation', async ({ page }) => {
  await page.goto('/jobs')
  await page.getByRole('button', { name: '新增岗位' }).click()
  await page.getByPlaceholder('搜索或输入企业名称').fill('中国移动山东分公司')
  await expect(page.getByText('保存岗位时将自动创建', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: '立即创建' })).toBeVisible()
})

test('job library exposes grouped management controls', async ({ page }) => {
  await page.goto('/jobs')
  await expect(page.getByRole('button', { name: '全部展开' })).toBeVisible()
  await expect(page.getByRole('button', { name: '全部折叠' })).toBeVisible()
  await expect(page.getByRole('button', { name: '刷新岗位库' })).toBeVisible()
  await expect(page.getByText('全部地区', { exact: true })).toBeVisible()
  await expect(page.getByText('全部性质', { exact: true })).toBeVisible()
  await expect(page.getByText('全部批次', { exact: true })).toBeVisible()
  await expect(page.getByText('投递结果', { exact: true })).toBeVisible()
  await expect(page.getByText('投递资格', { exact: true })).toHaveCount(0)
  const moreFilters = page.getByRole('button', { name: '更多筛选' })
  await moreFilters.click()
  await expect(page.getByText('排序方式')).toBeVisible()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(250)
  const colors = await moreFilters.evaluate(element => {
    const style = getComputedStyle(element)
    return { color: style.color, background: style.backgroundColor }
  })
  expect(colors.color).not.toBe(colors.background)
  expect(colors.background).toBe('rgb(255, 255, 255)')
})

test('desktop layouts do not overflow horizontally', async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 1050, height: 800 }]) {
    await page.setViewportSize(viewport)
    for (const path of ['/home', '/jobs', '/progress', '/settings']) {
      await page.goto(path)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(overflow, `${path} overflows at ${viewport.width}px`).toBeFalsy()
    }
  }
})

test('page content and long dialogs scroll vertically', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/home')
  const content = page.locator('.app-content')
  expect(await content.evaluate(element => element.scrollHeight)).toBeGreaterThan(
    await content.evaluate(element => element.clientHeight),
  )
  await content.evaluate(element => { element.scrollTop = element.scrollHeight })
  expect(await content.evaluate(element => element.scrollTop)).toBeGreaterThan(0)

  await page.goto('/jobs')
  await page.getByRole('button', { name: '新增岗位' }).click()
  const dialogBody = page.locator('.el-dialog__body')
  expect(await dialogBody.evaluate(element => element.scrollHeight)).toBeGreaterThan(
    await dialogBody.evaluate(element => element.clientHeight),
  )
  await dialogBody.evaluate(element => { element.scrollTop = element.scrollHeight })
  expect(await dialogBody.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
})
