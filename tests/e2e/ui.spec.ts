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
  test.setTimeout(45_000);
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
  expect(projectTop).toBeLessThan(220);
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

test("complete basic profile packs every visible row without layout holes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
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
        if (query.includes("FROM profile_basic"))
          return [
            {
              id: 1,
              name: "乌中可",
              english_name: "Wu Zhongke",
              gender: "男",
              birth_date: "2000-09-22",
              ethnicity: "汉族",
              political_status: "群众",
              marital_status: "未婚",
              health_status: "健康",
              height: "185cm",
              weight: "60kg",
              current_residence: "山东省青岛市崂山区",
              household_location: "山东省聊城市茌平区",
              native_place: "山东省聊城市茌平区",
              student_origin: "山东省聊城市茌平区",
              household_type: "居民户",
              mailing_address: "山东省青岛市崂山区青岛科技大学北苑",
              phone: "17806245772",
              email: "17806245772@163.com",
              work_status: "未参加工作",
              current_industry: "软件和信息技术服务业",
              student_leader: "否",
              specialties: "羽毛球、编程、技术学习",
              overseas_work: "无",
              disciplinary_record: "无",
            },
          ];
        if (query.includes("PRAGMA table_info")) return [];
        return [];
      },
    };
  });
  await page.goto("/profile/basic");
  const groups = page.locator(".basic-groups");
  await expect(groups.getByText("乌中可", { exact: true })).toBeVisible();
  await expect(groups.locator(".basic-group")).toHaveCount(5);
  expect(await groups.locator(".field-icon").count()).toBeGreaterThanOrEqual(
    20,
  );
  const overflows = await groups
    .locator(".basic-group")
    .evaluateAll((items) =>
      items.map((item) => item.scrollWidth > item.clientWidth + 1),
    );
  expect(overflows).not.toContain(true);
  await page.screenshot({
    path: "test-artifacts/profile-styled-basic-v0.2.4.png",
    fullPage: true,
  });
});

test("all profile record types use icon-led grouped detail layouts", async ({
  page,
}) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    const runtime = window as typeof window & {
      __TAURI_INTERNALS__: {
        invoke: (command: string, args: Record<string, any>) => Promise<any>;
      };
    };
    const records: Record<string, Record<string, any>> = {
      education_experiences: {
        id: 101,
        sort_order: 0,
        school_name: "青岛科技大学",
        start_date: "2024-09",
        end_date: "2027-07",
        duration_years: "3年",
        education_level: "硕士研究生",
        degree: "硕士",
        degree_detail: "工学硕士",
        study_type: "全日制",
        admission_type: "统招",
        college: "信息科学技术学院",
        major: "软件工程",
        major_category: "计算机类",
        research_direction: "无线定位、SLAM与多传感器融合定位",
        ranking: "40%-50%",
        is_top_up_degree: "不适用",
        is_overseas: "否",
        position: "无",
        main_courses: "机器学习、分布式数据库系统、现代软件工程",
        failed_course_count: 0,
      },
      work_experiences: {
        id: 102,
        sort_order: 0,
        company_name: "青岛文达通科技股份有限公司",
        company_type: "民营企业",
        industry: "软件和信息技术服务业",
        work_type: "实习",
        position_name: "视觉SLAM算法实习生",
        start_date: "2026-05",
        is_current: 1,
        region: "山东省青岛市黄岛区",
        monthly_salary: "3000",
        salary_unit: "元/月",
        subordinate_count: 0,
        is_overseas: "否",
        reference_name: "柴文楠",
        reference_position: "算法工程师",
        reference_phone: "18253808480",
        responsibilities:
          "1. 研究SLAM框架与多传感器定位方案。\n2. 参与机器人室内定位建图开发。\n3. 开展多场景测试与参数优化。",
      },
      project_experiences: {
        id: 103,
        sort_order: 0,
        project_name: "机器人巡检定位系统",
        start_date: "2026-01",
        end_date: "2026-05",
        role: "核心成员",
        organization: "青岛科技大学",
        team_size: "6-10人",
        description:
          "面向工厂复杂室内环境的机器人巡检定位需求，实现全局位置与高精度局部里程计协同定位。",
        responsibilities:
          "1. 负责多源数据采集与特征提取。\n2. 实现WiFi全局定位算法。\n3. 开展协同定位测试验证。",
        achievements: "完成多源协同定位方案并完成测试验证。",
        tech_stack: "WiFi定位\nSLAM\nPython",
      },
      academic_achievements: {
        id: 104,
        sort_order: 0,
        achievement_name: "基于联合特征编码与自注意力的自适应WiFi定位",
        achievement_type: "期刊论文",
        author_role: "第一作者",
        venue: "《现代电子技术》",
        status: "已录用",
        accepted_date: "2026-07-31",
        research_field: "WiFi定位、无线定位、室内定位",
        remark: "北大中文核心期刊；尚未正式见刊。",
      },
      certificates: {
        id: 105,
        sort_order: 0,
        certificate_name: "大学英语四级（CET-4）",
        obtained_date: "2023-12-16",
        level: "CET-4",
        score: "425分",
        validity_type: "长期有效",
      },
      language_abilities: {
        id: 106,
        sort_order: 0,
        language: "英语",
        level: "CET-4",
        score: "425分",
        speaking_ability: "一般",
        reading_ability: "良好",
      },
      honors: {
        id: 107,
        sort_order: 0,
        honor_name: "2026年CIMC“西门子杯”中国智能制造挑战赛华北二赛区三等奖",
        obtained_date: "2026-07",
        honor_level: "省部级 / 省区级",
        award_grade: "三等奖",
        issuer: "中国智能制造挑战赛全国竞赛组委会",
        description: "参加离散行业运动控制方向比赛，获华北二赛区三等奖。",
      },
      family_members: {
        id: 108,
        sort_order: 0,
        name: "乌景路",
        relationship: "父亲",
        organization: "务农",
        position: "无",
        remark: "姓名最终以证件为准。",
      },
      emergency_contacts: {
        id: 109,
        sort_order: 0,
        name: "于桂环",
        relationship: "母亲",
        phone: "15200004298",
        remark: "联系电话以本人当前使用号码为准。",
      },
    };
    runtime.__TAURI_INTERNALS__ = {
      invoke: async (command, args) => {
        if (command === "database_execute")
          return { rowsAffected: 1, lastInsertId: 1 };
        if (command !== "database_select") return null;
        const query = String(args?.query ?? "");
        for (const [table, record] of Object.entries(records))
          if (query.includes(`FROM ${table}`)) return [record];
        if (query.includes("PRAGMA table_info")) return [];
        return [];
      },
    };
  });
  await page.goto("/profile/basic");
  const expandButtons = page.getByRole("button", {
    name: "展开详情",
    exact: true,
  });
  await expect(expandButtons).toHaveCount(9);
  while ((await expandButtons.count()) > 0) await expandButtons.first().click();
  await expect(page.locator(".record-item.expanded")).toHaveCount(9);
  expect(
    await page.locator(".record-details .field-icon").count(),
  ).toBeGreaterThan(40);
  expect(
    await page
      .locator(".record-details")
      .evaluateAll((items) =>
        items.some((item) => item.scrollWidth > item.clientWidth + 1),
      ),
  ).toBeFalsy();
  await page.screenshot({
    path: "test-artifacts/profile-styled-records-v0.2.4.png",
    fullPage: true,
  });
  for (const section of [
    "education",
    "work",
    "projects",
    "academic",
    "family",
  ]) {
    await page.locator(`.record-${section}`).screenshot({
      path: `test-artifacts/profile-${section}-v0.2.4.png`,
    });
  }
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
  const materialActions = page.locator(".material-actions");
  await expect(materialActions).toBeVisible();
  const actionRows = await materialActions
    .locator("button")
    .evaluateAll((buttons) =>
      buttons.map((button) => Math.round(button.getBoundingClientRect().top)),
    );
  expect(new Set(actionRows).size).toBe(1);
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect(
    page.getByText("暂不支持旧版 DOC 客户端内预览", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".preview-pane")).toHaveCSS("overflow-y", "auto");
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
