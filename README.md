# 求职投递管理

面向 Windows 10/11 的本地桌面客户端，用于长期管理企业、岗位、投递进度、笔试、面试、日程、提醒、附件、Excel 数据和 SQLite 备份。

正式使用通过 Tauri 打包为 Windows 客户端；`npm run dev` 只用于界面开发和自动化测试。

## 技术栈

- Vue 3 + TypeScript + Vite
- Tauri 2 + WebView2
- Element Plus + Pinia + Vue Router
- Apache ECharts
- SQLite via Rust `rusqlite`
- Tauri FS / Dialog / Opener
- SheetJS `xlsx 0.20.3`

## 环境要求

- 推荐 Node.js 20 LTS 或更高版本；当前机器的 Node `16.20.2` 仍可完成本项目构建。
- Rust stable 与 Cargo。
- Visual Studio 2022 Build Tools，并勾选“使用 C++ 的桌面开发”工作负载和 Windows SDK。
- Microsoft Edge WebView2 Runtime。

## 安装与运行

```powershell
cd "F:\研究生\求职\岗位\works\job-manager"
npm install
npm run tauri:dev
```

仅预览界面：

```powershell
npm run dev
```

## 功能

- Dashboard：7 项 KPI、最近岗位、7 天截止、近期安排和分布图表。
- 企业：新增、编辑、删除、搜索、详情和岗位汇总。
- 岗位：新增、编辑、删除、搜索、筛选、排序、分页和详情。
- 投递：固定阶段、日期、结果、备注和阶段看板。
- 笔试与面试：新增、编辑、删除、状态、结果和多轮时间轴。
- 日程与提醒：统一聚合岗位截止、待进行笔试和面试。
- 附件：复制到程序同目录的便携数据目录、打开和删除。
- Excel：批量导入、企业和岗位去重、中文多工作表导出。
- 数据：SQLite 备份、文件头校验和恢复。
- 设置：称呼、浅色/深色主题和本地目录查看。

## 数据库

数据库为 `job_manager.db`。启动时自动创建表、索引、默认设置和以下默认标签：重点、冲刺、稳妥、保底、优先投递。

SQLite 使用 snake_case，TypeScript 使用 camelCase。所有用户输入均通过参数化 SQL 写入，外键删除级联已开启。

数据库保存在 EXE 所在目录的 `data/job_manager.db`；附件保存在 `data/attachments/<岗位ID>/`。系统设置页可以查看并打开这些目录。程序首次启动时若发现旧版应用配置目录中的数据库，会自动复制旧数据，但新版不会继续向 C 盘应用配置目录写入。

推荐将便携版 EXE 放在 F 盘等非系统盘长期使用。移动程序时，请将 EXE 和旁边的 `data` 文件夹一起移动，否则程序会在新位置创建一套空数据。

## Excel 导入

自动识别工作簿第一个 Sheet 中的真实表头行，同时兼容标题、统计说明、多余空行以及“公司名称”“职位名称”等常见别名。合并单元格导致企业名称留空时会继承上一行企业；岗位按“企业 + 岗位名 + 地点”去重，并在结束后显示导入报告。

## 备份恢复

备份前执行 SQLite WAL 检查点，然后生成：

```text
job_manager_YYYYMMDDHHMMSS.db
```

恢复前会检查文件大小和 SQLite 文件头。恢复会覆盖当前数据库，操作前建议先创建新备份。

## 测试

```powershell
npm run build
npm run test:e2e
npm run test:schema
npm audit --omit=dev
```

界面回归会自动启动 Vite，使用本机 Chrome 检查全部路由、顶部导航、全局搜索、主题切换、主要弹窗、表单校验及 1280/1440 桌面布局。Schema 测试会创建临时 SQLite 数据库，验证迁移、写入和外键级联删除。

## Windows 打包

```powershell
npm run desktop:build
```

成功后可获得安装版和便携版。没有本地 C++ 编译环境时，也可以把代码推送到 GitHub，通过项目内置的 GitHub Actions 在云端生成：

```text
求职投递管理_0.1.1_x64-setup.exe
求职投递管理_0.1.1_便携版.exe
```

便携版无需安装，放到目标磁盘后直接双击即可；首次运行会在 EXE 旁创建 `data` 文件夹。

若提示 `link.exe was not found`，请安装 Visual Studio 2022 Build Tools 的 C++ 桌面开发工作负载，重新打开 PowerShell 后再执行打包命令。

## 目录结构

```text
src/
  components/     通用组件与布局
  dialogs/        企业、岗位、投递、笔试、面试和附件窗口
  services/       SQLite、统计、文件、Excel 与备份逻辑
  stores/         全局 UI、提醒和设置状态
  styles/         主题变量与 Element Plus 覆盖
  types/          业务类型
  views/          各功能页面
tests/e2e/        Playwright 界面回归
src-tauri/        Tauri 配置、权限和 Rust 入口
vendor/           固定版本的 SheetJS 官方包
```
