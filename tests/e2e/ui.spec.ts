import { expect, test } from "@playwright/test";

const routes = [
  ["/home", "今天是"],
  ["/jobs", "岗位库"],
  ["/companies", "企业管理"],
  ["/progress", "投递进度"],
  ["/schedule", "日程安排"],
  ["/workflow", "招聘流程"],
  ["/statistics", "数据统计"],
  ["/tags", "标签管理"],
  ["/reminders", "提醒中心"],
  ["/profile/basic", "我的资料"],
  ["/profile/materials", "证明材料"],
  ["/data/import", "Excel 导入"],
  ["/data/export", "Excel 导出"],
  ["/data/backup", "备份与恢复"],
  ["/settings", "系统设置"],
] as const;

test("all application routes render without runtime errors", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [path, text] of routes) {
    await page.goto(path);
    if (path === "/home")
      await expect(
        page.getByText(text, { exact: false }).first(),
      ).toBeVisible();
    else
      await expect(
        page.getByRole("heading", { name: text, exact: true }),
      ).toBeVisible({
        timeout: path === "/profile/materials" ? 15_000 : 5_000,
      });
  }
  expect(errors).toEqual([]);
});

test("home naming is consistent and the legacy dashboard route redirects", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/home$/);
  await expect(
    page.getByRole("button", { name: "首页", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("收录岗位", { exact: true })).toBeVisible();
  await expect(page.getByText("有效机会", { exact: true })).toBeVisible();
  await expect(page.getByText(/仪表盘|Dashboard/)).toHaveCount(0);
  await expect(page).toHaveTitle("首页 - 求职投递管理");
});

test("header search, navigation and theme controls work", async ({ page }) => {
  await page.goto("/home");
  const search = page.getByPlaceholder("搜索企业、岗位、地点...");
  await search.fill("软件开发");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/jobs\?q=/);
  await expect(
    page.getByPlaceholder("搜索企业、岗位、地点、招聘批次..."),
  ).toHaveValue("软件开发");

  await page.getByTitle("提醒").click();
  await expect(page).toHaveURL(/\/reminders$/);
  await page.getByTitle("日程").click();
  await expect(page).toHaveURL(/\/schedule$/);
  await page.getByTitle("主题").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("company dialog opens and validates required fields and URLs", async ({
  page,
}) => {
  await page.goto("/companies");
  await page.getByRole("button", { name: "新增企业" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("请输入企业名称")).toBeVisible();
  await expect(page.getByText("岗位投递限制")).toBeVisible();
  await expect(page.getByText("未知", { exact: true })).toBeVisible();
  await expect(page.getByText("不限制", { exact: true })).toBeVisible();
  await expect(page.getByText("最多投递", { exact: true })).toBeVisible();
  await page.getByLabel("企业名称").fill("测试企业");
  await page.getByLabel("官方网站").fill("invalid-url");
  await page.getByLabel("官方网站").press("Tab");
  await expect(
    page.getByText("网址必须以 http:// 或 https:// 开头"),
  ).toBeVisible();
});

test("progress board is view-only and exposes all filters", async ({
  page,
}) => {
  await page.goto("/progress");
  await expect(page.getByPlaceholder("搜索企业或岗位")).toBeVisible();
  await expect(page.getByText("全部地区", { exact: true })).toBeVisible();
  await expect(page.getByText("全部批次", { exact: true })).toBeVisible();
  await expect(page.getByText("全部阶段", { exact: true })).toBeVisible();
  await expect(page.locator(".job-card .el-select")).toHaveCount(0);
});

test("schedule renders month calendar controls and dashboard exposes trend ranges", async ({
  page,
}) => {
  await page.goto("/schedule");
  await expect(page.getByText("本月安排", { exact: true })).toBeVisible();
  await expect(page.getByText("笔试安排", { exact: true })).toBeVisible();
  await expect(page.getByText("面试安排", { exact: true })).toBeVisible();
  await expect(page.getByTitle("上一个月")).toBeVisible();
  await expect(page.getByTitle("下一个月")).toBeVisible();
  expect(await page.locator(".day-cell").count()).toBeGreaterThanOrEqual(35);

  await page.goto("/home");
  await expect(page.getByText("求职趋势", { exact: true })).toBeVisible();
  await expect(page.getByText("7 天", { exact: true })).toBeVisible();
  await expect(page.getByText("30 天", { exact: true })).toBeVisible();
  await expect(page.getByText("90 天", { exact: true })).toBeVisible();
});

test("job creation and unified recruitment workflow controls render", async ({
  page,
}) => {
  await page.goto("/jobs");
  await page.getByRole("button", { name: "新增岗位" }).click();
  await expect(page.getByRole("dialog", { name: "新增岗位" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/workflow");
  await expect(
    page.getByRole("heading", { name: "招聘流程", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("进行中", { exact: true })).toBeVisible();
  await expect(page.getByText("历史结果", { exact: true })).toBeVisible();
  await expect(page.getByText("全部", { exact: true })).toBeVisible();

  await page.goto("/written-tests");
  await expect(page).toHaveURL(/\/workflow$/);
  await page.goto("/interviews");
  await expect(page).toHaveURL(/\/workflow$/);
});

test("job dialog supports inline company creation", async ({ page }) => {
  await page.goto("/jobs");
  await page.getByRole("button", { name: "新增岗位" }).click();
  await page.getByPlaceholder("搜索或输入企业名称").fill("中国移动山东分公司");
  await expect(
    page.getByText("保存岗位时将自动创建", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "立即创建" })).toBeVisible();
});

test("job library exposes grouped management controls", async ({ page }) => {
  await page.goto("/jobs");
  await expect(page.getByRole("button", { name: "全部展开" })).toBeVisible();
  await expect(page.getByRole("button", { name: "全部折叠" })).toBeVisible();
  await expect(page.getByRole("button", { name: "刷新岗位库" })).toBeVisible();
  await expect(page.getByText("全部地区", { exact: true })).toBeVisible();
  await expect(page.getByText("全部性质", { exact: true })).toBeVisible();
  await expect(page.getByText("全部批次", { exact: true })).toBeVisible();
  await expect(page.getByText("投递结果", { exact: true })).toBeVisible();
  await expect(page.getByText("投递资格", { exact: true })).toHaveCount(0);
  const moreFilters = page.getByRole("button", { name: "更多筛选" });
  await moreFilters.click();
  await expect(page.getByText("排序方式")).toBeVisible();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  const colors = await moreFilters.evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, background: style.backgroundColor };
  });
  expect(colors.color).not.toBe(colors.background);
  expect(colors.background).toBe("rgb(255, 255, 255)");
});

test("desktop layouts do not overflow horizontally", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1050, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    for (const path of [
      "/home",
      "/jobs",
      "/progress",
      "/workflow",
      "/profile/basic",
      "/profile/materials",
      "/settings",
    ]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow, `${path} overflows at ${viewport.width}px`).toBeFalsy();
      const contentOverflow = await page
        .locator(".app-content")
        .evaluate((element) => element.scrollWidth > element.clientWidth + 1);
      expect(
        contentOverflow,
        `${path} content overflows at ${viewport.width}px`,
      ).toBeFalsy();
    }
  }
});

test("personal profile section expands and exposes only the requested child pages", async ({
  page,
}) => {
  await page.goto("/home");
  const parent = page.getByRole("button", {
    name: "个人资料与简历",
    exact: true,
  });
  await expect(parent).toBeVisible();
  await expect(
    page.getByRole("button", { name: "我的资料", exact: true }),
  ).toHaveCount(0);
  await parent.click();
  await expect(
    page.getByRole("button", { name: "我的资料", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "证明材料", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "简历库", exact: true }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "我的资料", exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/basic$/);
  await expect(
    page.getByRole("heading", { name: "我的资料", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("基本信息", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "教育经历", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "工作 / 实习", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "项目经历", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "学术成果", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "资格证书", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "荣誉奖励", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "自我评价", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-artifacts/profile-all-sections-v0.2.1.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "项目经历", exact: true }).click();
  await page.waitForTimeout(500);
  const projectTop = await page
    .locator("#profile-section-projects")
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(projectTop).toBeGreaterThanOrEqual(60);
  expect(projectTop).toBeLessThan(180);
  await page.screenshot({
    path: "test-artifacts/profile-project-section-v0.2.1.png",
  });

  await page.getByRole("button", { name: "证明材料", exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/materials$/);
  await expect(
    page.getByRole("heading", { name: "证明材料", exact: true }),
  ).toBeVisible();
});

test("proof material upload presents supported formats and requires a display name", async ({
  page,
}) => {
  await page.goto("/profile/materials");
  await page.getByRole("button", { name: "上传材料", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "上传证明材料" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("选择 PDF 或 Word 文件", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "确认上传", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByText("备注名称不会修改原文件名", { exact: false }),
  ).toBeVisible();
});

test("profile forms use standardized selects and conditional fields", async ({
  page,
}) => {
  await page.goto("/profile/basic");
  await expect(page.locator(".tab-label")).toHaveCount(12);
  await page.getByRole("button", { name: "编辑资料", exact: true }).click();
  const drawer = page.locator(".el-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("政治面貌", { exact: true })).toBeVisible();
  await expect(drawer.getByText("健康状况", { exact: true })).toBeVisible();
  await expect(drawer.getByText("户口类型", { exact: true })).toBeVisible();
  await expect(drawer.getByText("工作经历状态", { exact: true })).toBeVisible();
  await expect(drawer.getByText("参加工作时间", { exact: true })).toHaveCount(
    0,
  );
  expect(await drawer.locator(".el-select").count()).toBeGreaterThanOrEqual(9);
});

test("date pickers are Chinese and education no longer exposes current status", async ({
  page,
}) => {
  await page.goto("/profile/basic");
  await page.getByRole("button", { name: "编辑资料", exact: true }).click();
  const drawer = page.locator(".el-drawer");
  const birthDate = drawer
    .locator(".el-form-item")
    .filter({ hasText: "出生日期" })
    .locator("input");
  await expect(birthDate).toBeVisible();
  await birthDate.click();
  const datePanel = page.locator(".el-picker-panel:visible");
  await expect(datePanel).toBeVisible();
  await expect(
    datePanel.locator("th").filter({ hasText: /^日$/ }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-artifacts/chinese-date-picker-v0.2.2.png",
  });
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "新增教育经历", exact: true }).click();
  const educationDrawer = page.locator(".el-drawer");
  await expect(
    educationDrawer.getByText("入学时间", { exact: true }),
  ).toBeVisible();
  await expect(
    educationDrawer.getByText("毕业时间", { exact: true }),
  ).toBeVisible();
  await expect(
    educationDrawer.getByText("结束时间", { exact: true }),
  ).toHaveCount(0);
  await expect(educationDrawer.getByText("至今", { exact: true })).toHaveCount(
    0,
  );
});

test("current work disables and clears the end date", async ({ page }) => {
  await page.goto("/profile/basic");
  await page
    .getByRole("button", { name: "新增工作 / 实习", exact: true })
    .click();
  const drawer = page.locator(".el-drawer");
  const endItem = drawer
    .locator(".el-form-item")
    .filter({ hasText: "结束时间" });
  const currentItem = drawer
    .locator(".el-form-item")
    .filter({ hasText: "至今" });
  await expect(endItem.locator(".el-date-editor")).not.toHaveClass(
    /is-disabled/,
  );
  await currentItem.locator(".el-switch").click();
  await expect(endItem.locator(".el-date-editor")).toHaveClass(/is-disabled/);
});

test("proof material timestamps use local time and old DOC has an explicit fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const runtime = window as typeof window & {
      __TAURI_INTERNALS__: {
        invoke: (command: string, args: Record<string, any>) => Promise<any>;
      };
    };
    runtime.__TAURI_INTERNALS__ = {
      invoke: async (command, args) => {
        const query = String(args?.query ?? "");
        if (command === "database_execute")
          return { rowsAffected: 1, lastInsertId: 1 };
        if (command !== "database_select") return null;
        if (query.includes("FROM proof_materials"))
          return [
            {
              id: 1,
              displayName: "旧版实习证明",
              originalName: "实习证明.doc",
              filePath: "F:/app/data/proof_materials/test.doc",
              fileExtension: "doc",
              fileSize: 2048,
              category: "实习证明",
              createdAt: "2026-09-04 03:26:17",
              updatedAt: "2026-09-04 03:26:17",
            },
          ];
        if (query.includes("PRAGMA table_info")) return [];
        return [];
      },
    };
  });
  await page.goto("/profile/materials");
  await expect(
    page.getByText("2026-09-04 11:26:17", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect(
    page.getByText("暂不支持旧版 DOC 客户端内预览", { exact: false }),
  ).toBeVisible();
});

test("proof materials expose quick type and category filters", async ({
  page,
}) => {
  await page.goto("/profile/materials");
  await expect(
    page.getByRole("button", { name: "PDF", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Word", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "资格证书", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "论文材料", exact: true }),
  ).toBeVisible();
  await expect(page.getByTitle("刷新材料")).toBeVisible();
  await page.screenshot({
    path: "test-artifacts/materials-filters-v0.2.1.png",
    fullPage: true,
  });
});

test("page content and long dialogs scroll vertically", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/home");
  const content = page.locator(".app-content");
  expect(
    await content.evaluate((element) => element.scrollHeight),
  ).toBeGreaterThan(await content.evaluate((element) => element.clientHeight));
  await content.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(
    await content.evaluate((element) => element.scrollTop),
  ).toBeGreaterThan(0);

  await page.goto("/jobs");
  await page.getByRole("button", { name: "新增岗位" }).click();
  const dialogBody = page.locator(".el-dialog__body");
  expect(
    await dialogBody.evaluate((element) => element.scrollHeight),
  ).toBeGreaterThan(
    await dialogBody.evaluate((element) => element.clientHeight),
  );
  await dialogBody.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(
    await dialogBody.evaluate((element) => element.scrollTop),
  ).toBeGreaterThan(0);
});
